/**
 * Agentic asset issuance pipeline.
 *
 * 5-stage pipeline: DEPLOY → MINT → RATE → REGISTER → DONE
 *
 * Deploys a new token contract, initializes with metadata, runs the AI
 * compliance pipeline, and registers the rated bond in BondPropertyRegistry.
 */
import { ethers } from "ethers";
import { config, abis, bytecodes } from "../config";
import type { AssetReadResult, ComplianceReport, AssetType } from "../types";
import { readBond, readInvoice, readABS, checkIssuerKYB } from "../onchain/readAsset";
import { runRulesEngine } from "../compliance/rulesEngine";
import { runLLMReview } from "../compliance/llmReviewer";
import { generateDisclosure } from "../compliance/disclosurePolicy";
import { computeRiskScore } from "../compliance/riskScorer";
import { generateReport } from "../compliance/reportGenerator";
import { submitAttestation } from "../onchain/submitAttestation";

export interface IssuanceRequest {
  assetType: "bond" | "invoice" | "abs";
  metadata: Record<string, unknown>;
  totalSupply: string;
}

export interface IssuanceResult {
  tokenAddress: string;
  assetId: string;
  deployTxHash: string;
  mintTxHash: string;
  attestationTxHash: string;
  riskScore: number;
  riskTier: string;
  rating: string;
  recommendation: string;
  numChecks: number;
}

/** Map risk score (0-100) to letter rating (AAA through CCC). */
function scoreToRating(score: number): string {
  if (score >= 95) return "AAA";
  if (score >= 90) return "AA+";
  if (score >= 85) return "AA";
  if (score >= 80) return "AA-";
  if (score >= 75) return "A+";
  if (score >= 70) return "A";
  if (score >= 65) return "A-";
  if (score >= 60) return "BBB+";
  if (score >= 55) return "BBB";
  if (score >= 50) return "BBB-";
  if (score >= 45) return "BB+";
  if (score >= 40) return "BB";
  if (score >= 35) return "BB-";
  if (score >= 30) return "B+";
  if (score >= 25) return "B";
  if (score >= 20) return "B-";
  return "CCC";
}

/** Compute maturity bucket from timestamp. */
function maturityBucket(timestampSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const years = (timestampSec - now) / (365 * 24 * 3600);
  if (years <= 0) return "expired";
  if (years <= 2) return "0-2 years";
  if (years <= 5) return "2-5 years";
  if (years <= 10) return "5-10 years";
  return "10+ years";
}

/** Compute coupon range bucket from bps. */
function couponRangeBucket(bps: number): string {
  if (bps <= 300) return "0-3%";
  if (bps <= 600) return "3-6%";
  if (bps <= 900) return "6-9%";
  return "9%+";
}

/**
 * Run the 6-stage compliance pipeline on an asset.
 * Extracted from index.ts reviewAsset to be reusable.
 */
async function rateAsset(
  asset: AssetReadResult,
  wallet: ethers.Wallet,
  provider: ethers.JsonRpcProvider,
): Promise<ComplianceReport> {
  console.log(`  [RATE:READ] ${asset.type} — Asset ID: ${asset.assetId}`);

  console.log("  [RATE:VALIDATE] Deterministic checks...");
  const issuerApproved = await checkIssuerKYB(asset.issuer, provider);
  const ruleChecks = runRulesEngine(asset, issuerApproved);
  const passCount = ruleChecks.filter((c) => c.result === "PASS").length;
  console.log(`    Rules: ${passCount}/${ruleChecks.length} passed`);

  console.log("  [RATE:ANALYZE] LLM analysis...");
  const llmChecks = await runLLMReview(asset);
  for (const c of llmChecks) {
    console.log(`    ${c.checkId}: ${c.result} — ${c.rationale.slice(0, 60)}`);
  }
  const allChecks = [...ruleChecks, ...llmChecks];

  console.log("  [RATE:DISCLOSE] Field categorization...");
  const disclosure = generateDisclosure(asset);
  console.log(
    `    Disclosed: ${disclosure.disclosedFields.length}, Bucketed: ${disclosure.bucketedFields.length}, Withheld: ${disclosure.withheldFields.length}`,
  );

  console.log("  [RATE:REPORT] Risk scoring...");
  const riskResult = computeRiskScore(allChecks, asset.type as AssetType);
  const report = generateReport(asset, allChecks, disclosure, riskResult);
  console.log(`    Score: ${report.riskScore} (Tier ${report.riskTier}) | ${report.recommendation}`);

  console.log("  [RATE:ATTEST] Signing attestation...");
  const txHash = await submitAttestation(report, wallet);
  console.log(`    TX: ${txHash}`);

  return report;
}

/**
 * Resolve Rayls infrastructure addresses from DeploymentProxyRegistry.
 */
async function getRaylsInfra(provider: ethers.JsonRpcProvider) {
  const proxyRegistry = new ethers.Contract(
    config.deploymentProxyRegistryAddress,
    ["function getContract(string calldata name) external view returns (address)"],
    provider,
  );
  const [endpoint, rnEndpoint, userGovernance] = await Promise.all([
    proxyRegistry.getContract("Endpoint"),
    proxyRegistry.getContract("RNEndpoint"),
    proxyRegistry.getContract("RNUserGovernance"),
  ]);
  return { endpoint, rnEndpoint, userGovernance };
}

/**
 * Full agentic issuance: DEPLOY → MINT → RATE → REGISTER
 */
export async function issueAsset(
  request: IssuanceRequest,
  wallet: ethers.Wallet,
): Promise<IssuanceResult> {
  const provider = wallet.provider! as ethers.JsonRpcProvider;

  // -----------------------------------------------------------------------
  // 1. DEPLOY — new token contract
  // -----------------------------------------------------------------------
  console.log(`\n  [DEPLOY] Deploying ${request.assetType.toUpperCase()} token...`);

  const infra = await getRaylsInfra(provider);
  const abiKey = request.assetType === "abs" ? "absToken" : `${request.assetType}Token`;
  const bytecodeKey = abiKey as keyof typeof bytecodes;
  const abi = abis[abiKey as keyof typeof abis];
  const bytecode = bytecodes[bytecodeKey];

  const idField = request.assetType === "bond" ? "bondId"
    : request.assetType === "invoice" ? "invoiceId" : "absId";
  const idValue = (request.metadata[idField] as string) ?? `${request.assetType.toUpperCase()}-${Date.now()}`;
  const shortId = idValue.slice(0, 12);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const tokenContract = await factory.deploy(
    `Fideza ${request.assetType.toUpperCase()} - ${shortId}`,
    `F${request.assetType[0].toUpperCase()}-${shortId}`,
    infra.endpoint,
    infra.rnEndpoint,
    infra.userGovernance,
    config.institutionRegistryAddress,
    { type: 0 },
  );
  await tokenContract.waitForDeployment();
  const tokenAddress = await tokenContract.getAddress();
  const deployTxHash = tokenContract.deploymentTransaction()?.hash ?? "";
  console.log(`    Deployed: ${tokenAddress} (TX: ${deployTxHash.slice(0, 18)}...)`);

  // -----------------------------------------------------------------------
  // 2. MINT — initialize with metadata and mint supply
  // -----------------------------------------------------------------------
  console.log(`  [MINT] Initializing with metadata and minting ${request.totalSupply} tokens...`);

  const supply = ethers.parseEther(request.totalSupply);
  let mintTxHash = "";

  if (request.assetType === "bond") {
    const meta = {
      bondId: request.metadata.bondId ?? idValue,
      isin: request.metadata.isin ?? `XS${Date.now()}`,
      issuer: wallet.address,
      issuerName: request.metadata.issuerName ?? "",
      issuerJurisdiction: request.metadata.issuerJurisdiction ?? "BR",
      issuerSector: request.metadata.issuerSector ?? "Financial Services",
      issuerCreditRating: request.metadata.issuerCreditRating ?? "BBB",
      parValue: BigInt(Number(request.metadata.parValue ?? 1000)),
      currency: request.metadata.currency ?? "USD",
      couponRateBps: Number(request.metadata.couponRateBps ?? 500),
      couponFrequency: request.metadata.couponFrequency ?? "Semi-Annual",
      issueDate: BigInt(Math.floor(Date.now() / 1000)),
      maturityDate: BigInt(Math.floor(Date.now() / 1000) + 3 * 365 * 24 * 3600),
      seniority: request.metadata.seniority ?? "Senior Unsecured",
      collateralType: request.metadata.collateralType ?? "None",
      covenantSummary: request.metadata.covenantSummary ?? "Standard covenants",
      callProvision: request.metadata.callProvision ?? "Non-callable",
      offeringType: request.metadata.offeringType ?? "Private Placement",
      minimumDenomination: ethers.parseEther("1"),
      qualifiedBuyerOnly: Boolean(request.metadata.qualifiedBuyerOnly ?? false),
      termSheetHash: ethers.keccak256(ethers.toUtf8Bytes(`term-sheet-${idValue}`)),
    };
    const token = new ethers.Contract(tokenAddress, abi, wallet);
    const tx = await token.initializeBond(meta, supply, { type: 0 });
    const receipt = await tx.wait();
    mintTxHash = receipt.hash;
  } else if (request.assetType === "invoice") {
    const meta = {
      invoiceId: request.metadata.invoiceId ?? idValue,
      issuer: wallet.address,
      debtorName: request.metadata.debtorName ?? "Sample Debtor Corp",
      debtorJurisdiction: request.metadata.debtorJurisdiction ?? "BR",
      debtorCreditRating: request.metadata.debtorCreditRating ?? "BBB",
      debtorIndustry: request.metadata.debtorIndustry ?? "Technology",
      faceValue: ethers.parseEther(String(request.metadata.faceValue ?? "1000000")),
      currency: request.metadata.currency ?? "USD",
      issueDate: BigInt(Math.floor(Date.now() / 1000)),
      dueDate: BigInt(Math.floor(Date.now() / 1000) + 90 * 24 * 3600),
      paymentTerms: request.metadata.paymentTerms ?? "Net 90",
      recourseType: request.metadata.recourseType ?? "Full Recourse",
      priorityClaim: Boolean(request.metadata.priorityClaim ?? true),
      invoiceDocHash: ethers.keccak256(ethers.toUtf8Bytes(`invoice-doc-${idValue}`)),
      previouslyTokenized: false,
    };
    const token = new ethers.Contract(tokenAddress, abi, wallet);
    const tx = await token.initializeInvoice(meta, supply, { type: 0 });
    const receipt = await tx.wait();
    mintTxHash = receipt.hash;
  } else {
    // ABS — simplified for hackathon (no loan pool)
    const meta = {
      absId: request.metadata.absId ?? idValue,
      issuer: wallet.address,
      poolType: request.metadata.poolType ?? "auto-loans",
      totalPoolSize: BigInt(Number(request.metadata.totalPoolSize ?? 50)),
      totalPoolNotional: ethers.parseEther(String(request.metadata.totalPoolNotional ?? "5000000")),
      trancheName: request.metadata.trancheName ?? "Senior A",
      trancheSeniority: request.metadata.trancheSeniority ?? "Senior",
      trancheSize: ethers.parseEther(String(request.metadata.trancheSize ?? "1000000")),
      creditEnhancementBps: BigInt(Number(request.metadata.creditEnhancementBps ?? 1500)),
      subordinationLevelBps: BigInt(Number(request.metadata.subordinationLevelBps ?? 2000)),
      currency: request.metadata.currency ?? "USD",
      expectedMaturity: BigInt(Math.floor(Date.now() / 1000) + 5 * 365 * 24 * 3600),
      servicerName: request.metadata.servicerName ?? "Fideza Servicing",
      auditorName: request.metadata.auditorName ?? "Big Four Auditor",
      offeringCircularHash: ethers.keccak256(ethers.toUtf8Bytes(`offering-${idValue}`)),
      poolTapeHash: ethers.keccak256(ethers.toUtf8Bytes(`pool-tape-${idValue}`)),
    };
    const loanPool = [
      { loanId: "L001", borrowerRegion: "Southeast", creditScore: 720, loanAmount: ethers.parseEther("25000"), interestRateBps: 850, remainingTermMonths: 48, delinquencyStatus: 0 },
      { loanId: "L002", borrowerRegion: "Northeast", creditScore: 680, loanAmount: ethers.parseEther("30000"), interestRateBps: 950, remainingTermMonths: 36, delinquencyStatus: 0 },
    ];
    const token = new ethers.Contract(tokenAddress, abi, wallet);
    const tx = await token.initializeABS(meta, loanPool, supply, { type: 0 });
    const receipt = await tx.wait();
    mintTxHash = receipt.hash;
  }
  console.log(`    Minted: ${request.totalSupply} tokens (TX: ${mintTxHash.slice(0, 18)}...)`);

  // -----------------------------------------------------------------------
  // 3. RATE — run AI compliance pipeline
  // -----------------------------------------------------------------------
  console.log("  [RATE] Running AI compliance pipeline...");

  let asset: AssetReadResult;
  if (request.assetType === "bond") {
    asset = await readBond(provider, tokenAddress);
  } else if (request.assetType === "invoice") {
    asset = await readInvoice(provider, tokenAddress);
  } else {
    asset = await readABS(provider, tokenAddress);
  }

  const report = await rateAsset(asset, wallet, provider);
  const rating = scoreToRating(report.riskScore);
  console.log(`    Rating: ${rating} (score: ${report.riskScore})`);

  // -----------------------------------------------------------------------
  // 4. REGISTER — add to BondPropertyRegistry (only if approved)
  // -----------------------------------------------------------------------
  if (report.recommendation !== "APPROVE") {
    console.log(`  [REGISTER] Skipped — asset ${report.recommendation} (not approved)`);
    return {
      tokenAddress, assetId: asset.assetId, deployTxHash, mintTxHash,
      attestationTxHash: report.reportHash,
      riskScore: report.riskScore, riskTier: report.riskTier, rating,
      recommendation: report.recommendation, numChecks: report.checks.length,
    };
  }
  console.log("  [REGISTER] Adding to BondPropertyRegistry...");

  const registry = new ethers.Contract(
    config.bondPropertyRegistryAddress,
    abis.bondPropertyRegistry,
    wallet,
  );

  // Derive fields for registry entry
  const couponBps = request.assetType === "bond"
    ? Number(request.metadata.couponRateBps ?? 500)
    : request.assetType === "invoice" ? 0 : Number(request.metadata.creditEnhancementBps ?? 500);
  const maturityTs = request.assetType === "bond"
    ? Math.floor(Date.now() / 1000) + 3 * 365 * 24 * 3600
    : request.assetType === "invoice"
      ? Math.floor(Date.now() / 1000) + 90 * 24 * 3600
      : Math.floor(Date.now() / 1000) + 5 * 365 * 24 * 3600;

  const assetTypeLabel = request.assetType === "bond" ? "BOND"
    : request.assetType === "invoice" ? "INVOICE" : "ABS_TRANCHE";

  const regProps = {
    assetId: asset.assetId,
    bondTokenAddress: tokenAddress,
    assetType: assetTypeLabel,
    rating,
    couponRateBps: couponBps,
    couponRange: couponRangeBucket(couponBps),
    maturityBucket: maturityBucket(maturityTs),
    maturityTimestamp: BigInt(maturityTs),
    seniority: String(request.metadata.seniority ?? "Senior"),
    currency: String(request.metadata.currency ?? "USD"),
    issuerCategory: `${request.metadata.issuerJurisdiction ?? "BR"} ${request.metadata.issuerSector ?? "Financial"}, ${rating.startsWith("B") && !rating.startsWith("BBB") ? "High Yield" : "Investment Grade"}`,
    parValue: ethers.parseEther(String(request.metadata.parValue ?? "1000")),
    hasCollateral: Boolean(request.metadata.collateralType && request.metadata.collateralType !== "None"),
    riskScore: report.riskScore,
    complianceReportHash: report.reportHash,
    availableForPortfolio: report.recommendation === "APPROVE",
    availableSupply: supply,
  };

  try {
    const regTx = await registry.registerBond(regProps, { type: 0 });
    await regTx.wait();
    console.log(`    Registered in BondPropertyRegistry`);
  } catch (e: any) {
    console.log(`    Registry failed (non-fatal): ${e.message?.slice(0, 80)}`);
  }

  return {
    tokenAddress,
    assetId: asset.assetId,
    deployTxHash,
    mintTxHash,
    attestationTxHash: report.reportHash,
    riskScore: report.riskScore,
    riskTier: report.riskTier,
    rating,
    recommendation: report.recommendation,
    numChecks: report.checks.length,
  };
}
