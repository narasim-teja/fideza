/**
 * Fideza AI Compliance & Portfolio Agent
 *
 * Mode: rate (default) — 6-stage compliance pipeline per asset:
 *   READ → VALIDATE → ANALYZE → DISCLOSE → REPORT → ATTEST
 *
 * Mode: portfolio — 6-stage portfolio construction pipeline:
 *   PARSE → SCAN → OPTIMIZE → CONSTRUCT → ATTEST → BRIDGE
 *
 * Usage:
 *   npx tsx src/index.ts                          # Rate all 3 assets
 *   npx tsx src/index.ts --asset invoice           # Rate single asset
 *   npx tsx src/index.ts --mode portfolio --constraints '{"minRating":"BB-","maxRating":"AA","targetYieldBps":400,"maxSingleExposurePct":15,"minBonds":10,"maturityPreference":"mixed","currencyPreference":"any","riskTolerance":"moderate"}'
 */
import { ethers } from "ethers";
import { config } from "./config";
import type { AssetReadResult, ComplianceReport } from "./types";
import { readInvoice, readBond, readABS, checkIssuerKYB } from "./onchain/readAsset";
import { runRulesEngine } from "./compliance/rulesEngine";
import { runLLMReview } from "./compliance/llmReviewer";
import { generateDisclosure } from "./compliance/disclosurePolicy";
import { computeRiskScore } from "./compliance/riskScorer";
import { generateReport } from "./compliance/reportGenerator";
import {
  submitAttestation,
  checkAgentAddress,
} from "./onchain/submitAttestation";

// Portfolio pipeline imports
import { parseConstraints, validateConstraints } from "./portfolio/constraints";
import { scanAvailableBonds } from "./portfolio/bondScanner";
import { optimizePortfolio } from "./portfolio/optimizer";
import { constructPortfolio } from "./portfolio/vaultConstructor";
import { attestPortfolio } from "./portfolio/attestor";
import { bridgePortfolioShares } from "./portfolio/bridger";

// ---------------------------------------------------------------------------
// CLI arg helpers
// ---------------------------------------------------------------------------

function getArg(name: string): string | null {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  if (eq !== undefined) return eq;
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return null;
}

// ---------------------------------------------------------------------------
// Rating pipeline (existing)
// ---------------------------------------------------------------------------

async function reviewAsset(
  asset: AssetReadResult,
  wallet: ethers.Wallet,
  provider: ethers.JsonRpcProvider,
): Promise<ComplianceReport> {
  console.log(`\n[READ] ${asset.type} — Asset ID: ${asset.assetId}`);
  console.log(`  Issuer: ${asset.issuer}`);

  // 2. VALIDATE — deterministic rule checks
  console.log("[VALIDATE] Running deterministic checks...");
  const issuerApproved = await checkIssuerKYB(asset.issuer, provider);
  console.log(`  Issuer KYB approved: ${issuerApproved}`);
  const ruleChecks = runRulesEngine(asset, issuerApproved);
  const passCount = ruleChecks.filter((c) => c.result === "PASS").length;
  console.log(`  Rules: ${passCount}/${ruleChecks.length} passed`);

  // 3. ANALYZE — LLM-based review
  console.log("[ANALYZE] Running LLM analysis...");
  const llmChecks = await runLLMReview(asset);
  for (const c of llmChecks) {
    console.log(`  ${c.checkId}: ${c.result} — ${c.rationale.slice(0, 80)}`);
  }
  const allChecks = [...ruleChecks, ...llmChecks];

  // 4. DISCLOSE — policy-driven field categorization
  console.log("[DISCLOSE] Generating disclosure recommendation...");
  const disclosure = generateDisclosure(asset);
  console.log(
    `  Disclosed: ${disclosure.disclosedFields.length}, Bucketed: ${disclosure.bucketedFields.length}, Withheld: ${disclosure.withheldFields.length}`,
  );

  // 5. REPORT — assemble and hash
  console.log("[REPORT] Computing risk score and assembling report...");
  const riskResult = computeRiskScore(allChecks, asset.type);
  const report = generateReport(asset, allChecks, disclosure, riskResult);
  console.log(
    `  Risk Score: ${report.riskScore} (Tier ${report.riskTier}) | Recommendation: ${report.recommendation}`,
  );
  if (report.riskFactors.length > 0) {
    console.log(`  Risk Factors: ${report.riskFactors.join(", ")}`);
  }

  // 6. ATTEST — sign and submit on-chain
  console.log("[ATTEST] Signing and submitting attestation...");
  const txHash = await submitAttestation(report, wallet);
  if (txHash === "already-attested") {
    console.log("  Skipped — attestation already exists on-chain");
  } else {
    console.log(`  Transaction: ${txHash}`);
  }
  console.log(`  Report Hash: ${report.reportHash}`);

  return report;
}

async function runRatingPipeline() {
  const provider = new ethers.JsonRpcProvider(config.privacyNodeRpc);
  const wallet = new ethers.Wallet(config.agentPrivateKey, provider);

  console.log("=== Fideza AI Compliance Agent ===");
  console.log(`Agent address: ${wallet.address}`);

  // Verify agent address matches ComplianceStore
  const agentCheck = await checkAgentAddress(wallet);
  if (!agentCheck.match) {
    console.error(
      `\n⚠ Agent address mismatch!\n  Wallet: ${agentCheck.actual}\n  ComplianceStore expects: ${agentCheck.expected}`,
    );
    console.error(
      "  Fix: call complianceStore.setAgentAddress() or use the correct AGENT_PRIVATE_KEY",
    );
    process.exit(1);
  }
  console.log("Agent address verified against ComplianceStore ✓");

  // Parse CLI args
  const assetArg = getArg("asset");

  // Read assets
  const assets: AssetReadResult[] = [];

  if (!assetArg || assetArg === "all") {
    console.log("\nReading all 3 assets from Privacy Node...");
    const [invoice, bond, abs] = await Promise.all([
      readInvoice(provider),
      readBond(provider),
      readABS(provider),
    ]);
    assets.push(invoice, bond, abs);
  } else {
    const type = assetArg.toLowerCase();
    if (type === "invoice") {
      assets.push(await readInvoice(provider));
    } else if (type === "bond") {
      assets.push(await readBond(provider));
    } else if (type === "abs") {
      assets.push(await readABS(provider));
    } else {
      console.error(`Unknown asset type: ${assetArg}. Use: invoice, bond, abs, or all`);
      process.exit(1);
    }
  }

  // Process each asset
  const reports: ComplianceReport[] = [];
  for (const asset of assets) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Processing: ${asset.type}`);
    console.log("=".repeat(60));
    try {
      const report = await reviewAsset(asset, wallet, provider);
      reports.push(report);
    } catch (e: any) {
      console.error(`Failed to process ${asset.type}:`, e.message);
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log("=".repeat(60));
  for (const r of reports) {
    console.log(
      `  ${r.assetType.padEnd(12)} | Score: ${String(r.riskScore).padStart(3)} | Tier: ${r.riskTier} | ${r.recommendation}`,
    );
  }
  console.log(`\nProcessed ${reports.length} asset(s).`);
}

// ---------------------------------------------------------------------------
// Portfolio pipeline (Phase 7)
// ---------------------------------------------------------------------------

async function runPortfolioPipeline(constraintsJson: string) {
  const provider = new ethers.JsonRpcProvider(config.privacyNodeRpc);

  // Use deployer wallet — holds all minted tokens and is vault owner
  if (!config.deployerPrivateKey) {
    console.error("DEPLOYER_PRIVATE_KEY is required for portfolio mode (deployer holds the bond tokens)");
    process.exit(1);
  }
  const wallet = new ethers.Wallet(config.deployerPrivateKey, provider);

  console.log("=== Fideza AI Portfolio Construction Agent ===");
  console.log(`Constructor address: ${wallet.address}`);

  // 1. PARSE
  console.log(`\n${"=".repeat(60)}`);
  console.log("[PARSE] Parsing user constraints...");
  console.log("=".repeat(60));
  const constraints = parseConstraints(constraintsJson);
  validateConstraints(constraints);
  console.log(`  Rating range: ${constraints.maxRating ?? "AAA"} to ${constraints.minRating}`);
  console.log(`  Target yield: ${constraints.targetYieldBps} bps`);
  console.log(`  Min bonds: ${constraints.minBonds}`);
  console.log(`  Max single exposure: ${constraints.maxSingleExposurePct}%`);
  console.log(`  Maturity: ${constraints.maturityPreference ?? "mixed"}`);
  console.log(`  Currency: ${constraints.currencyPreference ?? "any"}`);
  console.log(`  Risk tolerance: ${constraints.riskTolerance ?? "moderate"}`);

  // 2. SCAN
  console.log(`\n${"=".repeat(60)}`);
  console.log("[SCAN] Reading available bonds from registry...");
  console.log("=".repeat(60));
  const bonds = await scanAvailableBonds(provider, constraints);
  for (const b of bonds) {
    console.log(
      `  ${b.assetId.slice(0, 10)}... | ${b.assetType.padEnd(11)} | ${b.rating.padEnd(4)} | ${String(b.couponRateBps).padStart(4)} bps | ${b.maturityBucket.padEnd(10)} | ${b.currency} | ${b.issuerCategory.slice(0, 30)}`,
    );
  }

  // 3. OPTIMIZE
  console.log(`\n${"=".repeat(60)}`);
  console.log("[OPTIMIZE] Building portfolio allocation...");
  console.log("=".repeat(60));
  const portfolio = await optimizePortfolio(bonds, constraints);
  console.log(`  Method: ${portfolio.method}`);
  console.log(`  Bonds selected: ${portfolio.allocations.length}`);
  console.log(`  Weighted coupon: ${portfolio.weightedCouponBps} bps`);
  console.log(`  Weighted risk: ${portfolio.weightedRiskScore}`);
  console.log(`  Diversification score: ${portfolio.diversificationScore}/10`);
  console.log(`  Total weight: ${portfolio.totalWeightBps} bps`);
  console.log("\n  Allocations:");
  for (const a of portfolio.allocations) {
    console.log(
      `    ${a.assetId.slice(0, 10)}... | ${(a.weightBps / 100).toFixed(1)}% | ${a.rating.padEnd(4)} | ${a.assetType.padEnd(11)} | ${a.rationale?.slice(0, 40) ?? ""}`,
    );
  }

  // 4. CONSTRUCT
  console.log(`\n${"=".repeat(60)}`);
  console.log("[CONSTRUCT] Creating portfolio on-chain...");
  console.log("=".repeat(60));
  const { portfolioId, shareTokenAddress, txHash } = await constructPortfolio(
    portfolio,
    wallet,
  );

  // 5. ATTEST
  console.log(`\n${"=".repeat(60)}`);
  console.log("[ATTEST] Signing portfolio attestation...");
  console.log("=".repeat(60));
  const attestation = await attestPortfolio(portfolio, portfolioId, bonds, wallet);

  // 6. BRIDGE — Submit attestation to public chain + bridge shares
  console.log(`\n${"=".repeat(60)}`);
  console.log("[BRIDGE] Submitting attestation + bridging shares...");
  console.log("=".repeat(60));
  const bridgeResult = await bridgePortfolioShares(shareTokenAddress, attestation, wallet);

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("PORTFOLIO CONSTRUCTION COMPLETE");
  console.log("=".repeat(60));
  console.log(`  Portfolio ID:       ${portfolioId}`);
  console.log(`  Share Token:        ${shareTokenAddress}`);
  console.log(`  Create TX:          ${txHash}`);
  console.log(`  Attestation TX:     ${bridgeResult.attestationTxHash}`);
  console.log(`  Bridge TX:          ${bridgeResult.bridgeTxHash}`);
  console.log(`  Bonds:              ${attestation.numBonds}`);
  console.log(`  Diversification:    ${attestation.diversificationScore}/10`);
  console.log(`  Weighted Yield:     ${attestation.weightedCouponBps} bps`);
  console.log(`  Rating Range:       ${attestation.ratingRange}`);
  console.log(`  Avg Maturity:       ${attestation.avgMaturityMonths} months`);
  console.log(`  Max Exposure:       ${attestation.maxSingleExposurePct}%`);
  console.log(`  Methodology Hash:   ${attestation.methodologyHash}`);
  console.log(`  Attestation Signed: ${attestation.signature.slice(0, 20)}...`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const mode = getArg("mode") ?? "rate";

  if (mode === "portfolio") {
    const constraintsJson = getArg("constraints");
    if (!constraintsJson) {
      console.error("--constraints is required for portfolio mode");
      console.error(
        'Example: --constraints \'{"minRating":"BB-","maxRating":"AA","targetYieldBps":400,"maxSingleExposurePct":15,"minBonds":10,"maturityPreference":"mixed","currencyPreference":"any","riskTolerance":"moderate"}\'',
      );
      process.exit(1);
    }
    await runPortfolioPipeline(constraintsJson);
  } else if (mode === "rate") {
    await runRatingPipeline();
  } else {
    console.error(`Unknown mode: ${mode}. Use: rate, portfolio`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e.message);
  process.exit(1);
});
