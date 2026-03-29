/**
 * ZK Portfolio Composition Proof Generator
 *
 * Reads portfolio holdings from PortfolioVault (Privacy Node) and bond properties
 * from BondPropertyRegistry, formats inputs for the Noir circuit, generates
 * a ZK proof, and submits it on-chain to ZKPortfolioVerifier.
 *
 * Usage:
 *   npx tsx src/portfolio/zkProver.ts <portfolioId>
 */
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { config, abis } from "../config";
import { ratingToIndex } from "./constraints";

const MAX_BONDS = 8;
const CIRCUIT_DIR = path.resolve(__dirname, "../../../../circuits/portfolio_proof");

interface BondInput {
  amount: bigint;
  weightBps: number;
  couponRateBps: number;
  ratingIndex: number;
}

/**
 * Fetch portfolio holdings and bond properties from Privacy Node contracts.
 */
async function fetchPortfolioData(portfolioId: string): Promise<BondInput[]> {
  const provider = new ethers.JsonRpcProvider(config.privacyNodeRpc);
  const wallet = new ethers.Wallet(config.agentPrivateKey, provider);

  const vault = new ethers.Contract(
    config.portfolioVaultAddress,
    abis.portfolioVault,
    wallet,
  );
  const registry = new ethers.Contract(
    config.bondPropertyRegistryAddress,
    abis.bondPropertyRegistry,
    wallet,
  );

  const holdings = await vault.getFullComposition(portfolioId);

  const inputs: BondInput[] = [];
  for (const h of holdings) {
    const bond = await registry.getBond(h.assetId);
    inputs.push({
      amount: h.amount,
      weightBps: Number(h.weightBps),
      couponRateBps: Number(bond.couponRateBps),
      ratingIndex: ratingToIndex(bond.rating),
    });
  }

  return inputs;
}

/**
 * Compute public inputs from private bond data.
 * Must match exactly what the Noir circuit verifies.
 */
function computePublicInputs(bonds: BondInput[]) {
  const totalValue = bonds.reduce((s, b) => s + b.amount, 0n);
  const totalWeight = bonds.reduce((s, b) => s + b.weightBps, 0);

  // Weighted coupon: floor(sum(w*c) / total_weight)
  const weightedCouponSum = bonds.reduce(
    (s, b) => s + b.weightBps * b.couponRateBps,
    0,
  );
  const weightedCouponBps = Math.floor(weightedCouponSum / totalWeight);

  // Rating range
  const activeRatings = bonds
    .filter((b) => b.amount > 0n)
    .map((b) => b.ratingIndex);
  const minRatingIndex = Math.max(...activeRatings); // worst = highest index
  const maxRatingIndex = Math.min(...activeRatings); // best = lowest index

  // Max single exposure
  const maxSingleExposureBps = Math.max(...bonds.map((b) => b.weightBps));

  // Diversification score (HHI-based)
  const hhiScaled = bonds.reduce(
    (s, b) => s + b.weightBps * b.weightBps,
    0,
  );
  const hhiFloor = Math.floor(hhiScaled / 10_000_000);
  const diversificationScore = Math.max(0, 10 - hhiFloor);

  return {
    totalValue,
    weightedCouponBps,
    numBonds: bonds.filter((b) => b.amount > 0n).length,
    minRatingIndex,
    maxRatingIndex,
    maxSingleExposureBps,
    diversificationScore,
  };
}

/**
 * Generate Prover.toml content for the Noir circuit.
 */
function generateProverToml(
  bonds: BondInput[],
  pub: ReturnType<typeof computePublicInputs>,
): string {
  // Pad to MAX_BONDS with zeros
  const padded: BondInput[] = [...bonds];
  while (padded.length < MAX_BONDS) {
    padded.push({ amount: 0n, weightBps: 0, couponRateBps: 0, ratingIndex: 0 });
  }

  const lines: string[] = [
    `amounts = [${padded.map((b) => `"${b.amount}"`).join(", ")}]`,
    `weights_bps = [${padded.map((b) => `"${b.weightBps}"`).join(", ")}]`,
    `coupon_rates_bps = [${padded.map((b) => `"${b.couponRateBps}"`).join(", ")}]`,
    `rating_indices = [${padded.map((b) => `"${b.ratingIndex}"`).join(", ")}]`,
    "",
    `claimed_total_value = "${pub.totalValue}"`,
    `claimed_weighted_coupon_bps = "${pub.weightedCouponBps}"`,
    `claimed_num_bonds = "${pub.numBonds}"`,
    `claimed_min_rating_index = "${pub.minRatingIndex}"`,
    `claimed_max_rating_index = "${pub.maxRatingIndex}"`,
    `claimed_max_single_exposure_bps = "${pub.maxSingleExposureBps}"`,
    `claimed_diversification_score = "${pub.diversificationScore}"`,
  ];

  return lines.join("\n");
}

/**
 * Generate ZK proof and return proof bytes + formatted public inputs.
 */
async function generateProof(portfolioId: string) {
  console.log(`\n=== ZK Portfolio Composition Proof ===\n`);

  // 1. Fetch data from Privacy Node
  console.log("  Fetching portfolio data...");
  const bonds = await fetchPortfolioData(portfolioId);
  console.log(`  Found ${bonds.length} bonds`);

  if (bonds.length > MAX_BONDS) {
    throw new Error(`Portfolio has ${bonds.length} bonds, max is ${MAX_BONDS}`);
  }

  // 2. Compute public inputs
  const pub = computePublicInputs(bonds);
  console.log("  Public inputs:", {
    ...pub,
    totalValue: pub.totalValue.toString(),
  });

  // 3. Write Prover.toml
  const toml = generateProverToml(bonds, pub);
  fs.writeFileSync(path.join(CIRCUIT_DIR, "Prover.toml"), toml);
  console.log("  Wrote Prover.toml");

  // 4. Compile
  console.log("  Compiling circuit...");
  execSync("nargo compile", { cwd: CIRCUIT_DIR, stdio: "inherit" });

  // 5. Execute (generate witness)
  console.log("  Generating witness...");
  execSync("nargo execute", { cwd: CIRCUIT_DIR, stdio: "inherit" });

  // 6. Generate proof
  console.log("  Generating proof with bb...");
  execSync(
    "bb prove -b target/portfolio_proof.json -w target/portfolio_proof.gz -o target/proof",
    { cwd: CIRCUIT_DIR, stdio: "inherit" },
  );

  // 7. Read proof bytes
  const proofBytes = fs.readFileSync(path.join(CIRCUIT_DIR, "target/proof"));
  console.log(`  Proof size: ${proofBytes.length} bytes`);

  // 8. Format public inputs as bytes32[] for Solidity
  const publicInputs = [
    ethers.zeroPadValue(ethers.toBeHex(pub.totalValue), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.weightedCouponBps), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.numBonds), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.minRatingIndex), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.maxRatingIndex), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.maxSingleExposureBps), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.diversificationScore), 32),
  ];

  return { proof: proofBytes, publicInputs, pub };
}

/**
 * Full flow: generate proof and submit to ZKPortfolioVerifier on public chain.
 */
async function proveAndSubmit(portfolioId: string): Promise<string> {
  const { proof, publicInputs, pub } = await generateProof(portfolioId);

  const provider = new ethers.JsonRpcProvider(config.publicChainRpc);
  const wallet = new ethers.Wallet(config.agentPrivateKey, provider);

  const zkVerifierAbi = [
    "function verifyAndStore(bytes32 portfolioId, bytes calldata proof, bytes32[] calldata publicInputs) external",
    "function verifyPortfolio(bytes32 portfolioId) external view returns (bool valid, uint256 totalValue)",
    "function getVerifiedPortfolio(bytes32 portfolioId) external view returns (tuple(uint256,uint256,uint8,uint8,uint8,uint256,uint8,uint256))",
  ];

  const zkVerifier = new ethers.Contract(
    process.env.ZK_PORTFOLIO_VERIFIER_ADDRESS!,
    zkVerifierAbi,
    wallet,
  );

  console.log("\n  Submitting proof on-chain...");
  const tx = await zkVerifier.verifyAndStore(portfolioId, proof, publicInputs);
  const receipt = await tx.wait();
  console.log(`  Verified in tx: ${receipt!.hash}`);
  console.log(`  Portfolio ${portfolioId} now ZK-verified on public chain`);
  console.log(`    Total value: ${pub.totalValue}`);
  console.log(`    Bonds: ${pub.numBonds}`);
  console.log(`    Diversification: ${pub.diversificationScore}/10`);

  return receipt!.hash;
}

/**
 * Generate ZK proof from portfolio data the pipeline already has,
 * then submit to ZKPortfolioVerifier on public chain.
 * Called as step 7 in the portfolio construction pipeline.
 */
async function proveFromPortfolio(
  portfolioId: string,
  portfolio: { allocations: { amount: bigint; weightBps: number; couponRateBps: number; rating: string }[] },
): Promise<string> {
  const bonds: BondInput[] = portfolio.allocations.map((a) => ({
    amount: a.amount,
    weightBps: a.weightBps,
    couponRateBps: a.couponRateBps,
    ratingIndex: ratingToIndex(a.rating),
  }));

  if (bonds.length > MAX_BONDS) {
    throw new Error(`Portfolio has ${bonds.length} bonds, max is ${MAX_BONDS}`);
  }

  const pub = computePublicInputs(bonds);
  console.log("  Public inputs:", {
    ...pub,
    totalValue: pub.totalValue.toString(),
  });

  // Write Prover.toml
  const toml = generateProverToml(bonds, pub);
  fs.writeFileSync(path.join(CIRCUIT_DIR, "Prover.toml"), toml);

  // Compile + execute + prove
  console.log("  Compiling circuit...");
  execSync("nargo compile", { cwd: CIRCUIT_DIR, stdio: "pipe" });
  console.log("  Generating witness...");
  execSync("nargo execute", { cwd: CIRCUIT_DIR, stdio: "pipe" });
  console.log("  Generating proof...");
  execSync(
    "bb prove -b target/portfolio_proof.json -w target/portfolio_proof.gz -o target/proof -t evm-no-zk",
    { cwd: CIRCUIT_DIR, stdio: "pipe" },
  );

  // Read proof
  const proofBytes = fs.readFileSync(path.join(CIRCUIT_DIR, "target/proof/proof"));
  console.log(`  Proof size: ${proofBytes.length} bytes`);

  // Format public inputs
  const publicInputs = [
    ethers.zeroPadValue(ethers.toBeHex(pub.totalValue), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.weightedCouponBps), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.numBonds), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.minRatingIndex), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.maxRatingIndex), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.maxSingleExposureBps), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.diversificationScore), 32),
  ];

  // Submit to public chain
  const publicProvider = new ethers.JsonRpcProvider(config.publicChainRpc);
  const publicWallet = new ethers.Wallet(config.agentPrivateKey, publicProvider);

  const zkVerifier = new ethers.Contract(
    config.zkPortfolioVerifierAddress,
    ["function verifyAndStore(bytes32,bytes,bytes32[]) external"],
    publicWallet,
  );

  console.log("  Submitting ZK proof on-chain...");
  const tx = await zkVerifier.verifyAndStore(portfolioId, proofBytes, publicInputs, { type: 0 });
  const receipt = await tx.wait();
  console.log(`  ZK proof verified! TX: ${receipt!.hash}`);
  console.log(`    Total value: ${pub.totalValue}`);
  console.log(`    Bonds: ${pub.numBonds}`);
  console.log(`    Diversification: ${pub.diversificationScore}/10`);

  return receipt!.hash;
}

// CLI entry point
if (require.main === module) {
  const portfolioId = process.argv[2];
  if (!portfolioId) {
    console.error("Usage: npx tsx src/portfolio/zkProver.ts <portfolioId>");
    process.exit(1);
  }
  proveAndSubmit(portfolioId)
    .then((txHash) => console.log(`\nDone. TX: ${txHash}`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { generateProof, proveAndSubmit, proveFromPortfolio, computePublicInputs, generateProverToml };
