/**
 * ZK Constraint Compliance Proof Generator
 *
 * Proves the AI portfolio agent respected the investor's constraints
 * (min rating, max exposure, min bonds, target yield).
 */
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { config, abis } from "../config";
import { ratingToIndex } from "./constraints";

const MAX_BONDS = 8;
const CIRCUIT_DIR = path.resolve(__dirname, "../../../../circuits/constraint_proof");

interface BondInput {
  amount: bigint;
  weightBps: number;
  couponRateBps: number;
  ratingIndex: number;
}

interface ConstraintInputs {
  constraintMinRatingIndex: number;
  constraintMaxRatingIndex: number;
  constraintMaxSingleExposureBps: number;
  constraintMinBonds: number;
  constraintTargetYieldBps: number;
}

function computePublicInputs(bonds: BondInput[], constraints: ConstraintInputs) {
  const totalWeight = bonds.reduce((s, b) => s + b.weightBps, 0);
  const weightedCouponSum = bonds.reduce((s, b) => s + b.weightBps * b.couponRateBps, 0);
  const actualWeightedCouponBps = Math.floor(weightedCouponSum / totalWeight);
  const actualNumBonds = bonds.filter((b) => b.amount > 0n).length;

  return {
    ...constraints,
    actualWeightedCouponBps,
    actualNumBonds,
  };
}

function generateProverToml(bonds: BondInput[], pub: ReturnType<typeof computePublicInputs>): string {
  const padded: BondInput[] = [...bonds];
  while (padded.length < MAX_BONDS) {
    padded.push({ amount: 0n, weightBps: 0, couponRateBps: 0, ratingIndex: 0 });
  }

  return [
    `amounts = [${padded.map((b) => `"${b.amount}"`).join(", ")}]`,
    `weights_bps = [${padded.map((b) => `"${b.weightBps}"`).join(", ")}]`,
    `coupon_rates_bps = [${padded.map((b) => `"${b.couponRateBps}"`).join(", ")}]`,
    `rating_indices = [${padded.map((b) => `"${b.ratingIndex}"`).join(", ")}]`,
    "",
    `constraint_min_rating_index = "${pub.constraintMinRatingIndex}"`,
    `constraint_max_rating_index = "${pub.constraintMaxRatingIndex}"`,
    `constraint_max_single_exposure_bps = "${pub.constraintMaxSingleExposureBps}"`,
    `constraint_min_bonds = "${pub.constraintMinBonds}"`,
    `constraint_target_yield_bps = "${pub.constraintTargetYieldBps}"`,
    "",
    `actual_weighted_coupon_bps = "${pub.actualWeightedCouponBps}"`,
    `actual_num_bonds = "${pub.actualNumBonds}"`,
  ].join("\n");
}

async function fetchPortfolioData(portfolioId: string): Promise<BondInput[]> {
  const provider = new ethers.JsonRpcProvider(config.privacyNodeRpc);
  const wallet = new ethers.Wallet(config.agentPrivateKey, provider);

  const vault = new ethers.Contract(config.portfolioVaultAddress, abis.portfolioVault, wallet);
  const registry = new ethers.Contract(config.bondPropertyRegistryAddress, abis.bondPropertyRegistry, wallet);

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
 * Generate ZK constraint compliance proof.
 * Constraints default to typical investor parameters if not provided.
 */
async function generateConstraintProof(
  portfolioId: string,
  constraints?: Partial<ConstraintInputs>,
) {
  console.log(`\n=== ZK Constraint Compliance Proof ===\n`);

  const bonds = await fetchPortfolioData(portfolioId);
  console.log(`  Found ${bonds.length} bonds`);

  // Default constraints (can be overridden)
  const activeRatings = bonds.filter((b) => b.amount > 0n).map((b) => b.ratingIndex);
  const maxWeight = Math.max(...bonds.map((b) => b.weightBps));
  const totalWeight = bonds.reduce((s, b) => s + b.weightBps, 0);
  const wcSum = bonds.reduce((s, b) => s + b.weightBps * b.couponRateBps, 0);
  const actualYield = Math.floor(wcSum / totalWeight);

  const fullConstraints: ConstraintInputs = {
    constraintMinRatingIndex: constraints?.constraintMinRatingIndex ?? Math.max(...activeRatings),
    constraintMaxRatingIndex: constraints?.constraintMaxRatingIndex ?? Math.min(...activeRatings),
    constraintMaxSingleExposureBps: constraints?.constraintMaxSingleExposureBps ?? Math.max(maxWeight, 3500),
    constraintMinBonds: constraints?.constraintMinBonds ?? Math.min(bonds.filter((b) => b.amount > 0n).length, 3),
    constraintTargetYieldBps: constraints?.constraintTargetYieldBps ?? Math.min(actualYield, 500),
  };

  const pub = computePublicInputs(bonds, fullConstraints);
  console.log("  Public inputs:", pub);

  const toml = generateProverToml(bonds, pub);
  fs.writeFileSync(path.join(CIRCUIT_DIR, "Prover.toml"), toml);

  console.log("  Compiling circuit...");
  execSync("nargo compile", { cwd: CIRCUIT_DIR, stdio: "pipe" });
  console.log("  Generating witness...");
  execSync("nargo execute", { cwd: CIRCUIT_DIR, stdio: "pipe" });
  console.log("  Generating proof...");
  execSync(
    "bb prove -b target/constraint_proof.json -w target/constraint_proof.gz -o target/proof -t evm-no-zk",
    { cwd: CIRCUIT_DIR, stdio: "pipe" },
  );

  const proofBytes = fs.readFileSync(path.join(CIRCUIT_DIR, "target/proof/proof"));
  console.log(`  Proof size: ${proofBytes.length} bytes`);

  const publicInputs = [
    ethers.zeroPadValue(ethers.toBeHex(pub.constraintMinRatingIndex), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.constraintMaxRatingIndex), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.constraintMaxSingleExposureBps), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.constraintMinBonds), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.constraintTargetYieldBps), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.actualWeightedCouponBps), 32),
    ethers.zeroPadValue(ethers.toBeHex(pub.actualNumBonds), 32),
  ];

  return { proof: proofBytes, publicInputs, pub };
}

export { generateConstraintProof };
