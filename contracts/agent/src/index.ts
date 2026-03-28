/**
 * Fideza AI Compliance Agent — Phase 2
 *
 * Runs the full 6-stage compliance pipeline per asset:
 * READ → VALIDATE → ANALYZE → DISCLOSE → REPORT → ATTEST
 *
 * Usage:
 *   npx tsx src/index.ts              # Process all 3 assets
 *   npx tsx src/index.ts --asset invoice
 *   npx tsx src/index.ts --asset bond
 *   npx tsx src/index.ts --asset abs
 */
import { ethers } from "ethers";
import { config } from "./config";
import type { AssetReadResult, AssetType, ComplianceReport } from "./types";
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

async function main() {
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
  const assetArg = process.argv.find((a) => a.startsWith("--asset="))?.split("=")[1]
    || (process.argv.includes("--asset") ? process.argv[process.argv.indexOf("--asset") + 1] : null);

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

main().catch((e) => {
  console.error("Fatal error:", e.message);
  process.exit(1);
});
