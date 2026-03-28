import type { AssetType, CheckResult } from "../types";

const SEVERITY_DEDUCTIONS: Record<string, { fail: number; needsHuman: number }> = {
  critical: { fail: 30, needsHuman: 15 },
  major: { fail: 15, needsHuman: 7 },
  minor: { fail: 5, needsHuman: 2 },
};

export function computeRiskScore(
  checks: CheckResult[],
  _assetType: AssetType,
): { riskScore: number; riskTier: "A" | "B" | "C"; riskFactors: string[] } {
  let score = 100;
  const riskFactors: string[] = [];

  for (const check of checks) {
    if (check.result === "PASS") continue;

    const deductions = SEVERITY_DEDUCTIONS[check.severity];
    if (check.result === "FAIL") {
      score -= deductions.fail;
      riskFactors.push(`${check.checkName} (FAIL)`);
    } else if (check.result === "NEEDS_HUMAN") {
      score -= deductions.needsHuman;
      riskFactors.push(`${check.checkName} (NEEDS_HUMAN)`);
    }
  }

  score = Math.max(0, Math.min(100, score));

  const riskTier: "A" | "B" | "C" =
    score >= 70 ? "A" : score >= 40 ? "B" : "C";

  return { riskScore: score, riskTier, riskFactors };
}
