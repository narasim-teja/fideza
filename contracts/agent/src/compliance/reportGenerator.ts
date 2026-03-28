import { ethers } from "ethers";
import type {
  AssetReadResult,
  CheckResult,
  DisclosureRecommendation,
  ComplianceReport,
} from "../types";
import { bigintReplacer } from "../types";

import invoicePolicy from "../policies/invoice-policy.json";
import bondPolicy from "../policies/bond-policy.json";
import absPolicy from "../policies/abs-policy.json";

function getPolicyVersion(assetType: string): string {
  switch (assetType) {
    case "INVOICE":
      return invoicePolicy.policyVersion;
    case "BOND":
      return bondPolicy.policyVersion;
    case "ABS_TRANCHE":
      return absPolicy.policyVersion;
    default:
      return "1.0.0";
  }
}

function deriveRecommendation(
  checks: CheckResult[],
): { recommendation: "APPROVE" | "REJECT" | "ESCALATE"; rationale: string } {
  const criticalFails = checks.filter(
    (c) => c.result === "FAIL" && c.severity === "critical",
  );
  const anyFails = checks.filter((c) => c.result === "FAIL");
  const needsHuman = checks.filter((c) => c.result === "NEEDS_HUMAN");

  if (criticalFails.length > 0) {
    return {
      recommendation: "REJECT",
      rationale: `Critical failures: ${criticalFails.map((c) => c.checkName).join(", ")}`,
    };
  }

  if (anyFails.length > 0) {
    return {
      recommendation: "REJECT",
      rationale: `Failed checks: ${anyFails.map((c) => c.checkName).join(", ")}`,
    };
  }

  if (needsHuman.length > 0) {
    return {
      recommendation: "ESCALATE",
      rationale: `Checks requiring human review: ${needsHuman.map((c) => c.checkName).join(", ")}`,
    };
  }

  return {
    recommendation: "APPROVE",
    rationale: `All ${checks.length} checks passed. Asset meets compliance requirements.`,
  };
}

export function generateReport(
  asset: AssetReadResult,
  checks: CheckResult[],
  disclosure: DisclosureRecommendation,
  riskResult: { riskScore: number; riskTier: "A" | "B" | "C"; riskFactors: string[] },
): ComplianceReport {
  const policyVersion = getPolicyVersion(asset.type);
  const policyVersionHash = ethers.keccak256(
    ethers.toUtf8Bytes(policyVersion),
  );

  const inputsCommitment = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(asset.metadata, bigintReplacer)),
  );

  const { recommendation, rationale } = deriveRecommendation(checks);

  // Build report without hash first
  const reportWithoutHash: ComplianceReport = {
    assetId: asset.assetId,
    assetType: asset.type,
    policyVersion,
    policyVersionHash,
    reviewedAt: new Date().toISOString(),
    checks,
    disclosureRecommendation: disclosure,
    riskScore: riskResult.riskScore,
    riskTier: riskResult.riskTier,
    riskFactors: riskResult.riskFactors,
    recommendation,
    recommendationRationale: rationale,
    inputsCommitment,
    reportHash: "",
  };

  // Compute report hash
  const reportHash = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(reportWithoutHash)),
  );

  return { ...reportWithoutHash, reportHash };
}
