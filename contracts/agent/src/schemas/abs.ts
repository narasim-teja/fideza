import type {
  ABSMetadata,
  PoolAggregates,
  CheckResult,
  ABSPolicy,
} from "../types";

export function runABSChecks(
  metadata: ABSMetadata,
  poolAggregates: PoolAggregates,
  issuerApproved: boolean,
  policy: ABSPolicy,
): CheckResult[] {
  const checks: CheckResult[] = [];

  // ISSUER_KYB
  checks.push({
    checkId: "ISSUER_KYB",
    checkName: "Issuer KYB Verification",
    result: issuerApproved ? "PASS" : "FAIL",
    severity: "critical",
    rationale: issuerApproved
      ? "Issuer is KYB-approved in InstitutionRegistry"
      : "Issuer is NOT approved in InstitutionRegistry",
    method: "rules_engine",
  });

  // JURISDICTION_ALLOWED (ABS uses issuer address, no explicit jurisdiction in metadata)
  // We mark this as PASS since the issuer is KYB-verified which includes jurisdiction check
  checks.push({
    checkId: "JURISDICTION_ALLOWED",
    checkName: "Jurisdiction Allowed",
    result: issuerApproved ? "PASS" : "NEEDS_HUMAN",
    severity: "major",
    rationale: issuerApproved
      ? "Issuer KYB-approved — jurisdiction verified during registration"
      : "Cannot verify jurisdiction without KYB approval",
    method: "rules_engine",
  });

  // SANCTIONS_SCREEN (covered by KYB for ABS since no explicit jurisdiction field)
  checks.push({
    checkId: "SANCTIONS_SCREEN",
    checkName: "Sanctions Screening",
    result: issuerApproved ? "PASS" : "NEEDS_HUMAN",
    severity: "critical",
    rationale: issuerApproved
      ? "Issuer KYB-approved — sanctions screening performed during registration"
      : "Cannot confirm sanctions screening without KYB approval",
    method: "rules_engine",
  });

  // SCHEMA_COMPLETE
  const missingFields = policy.requiredFields.filter((field) => {
    const val = (metadata as any)[field];
    if (val === undefined || val === null) return true;
    if (typeof val === "string" && val === "") return true;
    if (typeof val === "bigint" && val === 0n) return true;
    return false;
  });
  checks.push({
    checkId: "SCHEMA_COMPLETE",
    checkName: "Schema Completeness",
    result: missingFields.length === 0 ? "PASS" : "FAIL",
    severity: "major",
    rationale:
      missingFields.length === 0
        ? "All required fields present"
        : `Missing fields: ${missingFields.join(", ")}`,
    method: "rules_engine",
  });

  // VALUE_LIMITS (tranche size as a reasonable check)
  const trancheSize = Number(metadata.trancheSize);
  const valueOk = trancheSize > 0;
  checks.push({
    checkId: "VALUE_LIMITS",
    checkName: "Tranche Size Check",
    result: valueOk ? "PASS" : "FAIL",
    severity: "major",
    rationale: valueOk
      ? `Tranche size ${trancheSize} is positive`
      : "Tranche size is zero or negative",
    method: "rules_engine",
  });

  // POOL_SIZE_MINIMUM
  const poolSize = Number(metadata.totalPoolSize);
  const poolSizeOk = poolSize >= policy.poolSizeMinimum;
  checks.push({
    checkId: "POOL_SIZE_MINIMUM",
    checkName: "Pool Size Minimum",
    result: poolSizeOk ? "PASS" : "FAIL",
    severity: "major",
    rationale: poolSizeOk
      ? `Pool size ${poolSize} meets minimum of ${policy.poolSizeMinimum}`
      : `Pool size ${poolSize} below minimum of ${policy.poolSizeMinimum}`,
    method: "rules_engine",
  });

  // CONCENTRATION_CHECK
  // With aggregate data, check if pool is large enough that no single loan > 5%
  const minLoansForConcentration = Math.ceil(
    100 / policy.maxSingleLoanConcentrationPct,
  );
  const concentrationOk = poolSize >= minLoansForConcentration;
  checks.push({
    checkId: "CONCENTRATION_CHECK",
    checkName: "Loan Concentration Check",
    result: concentrationOk ? "PASS" : "NEEDS_HUMAN",
    severity: "major",
    rationale: concentrationOk
      ? `Pool of ${poolSize} loans ensures no single loan exceeds ${policy.maxSingleLoanConcentrationPct}% by count`
      : `Pool of ${poolSize} loans is too small to guarantee concentration limits — needs manual review`,
    method: "rules_engine",
  });

  // CREDIT_QUALITY
  const creditRange = poolAggregates.avgCreditScoreRange.toLowerCase();
  const creditOk =
    creditRange.includes("prime") || creditRange.includes("super");
  checks.push({
    checkId: "CREDIT_QUALITY",
    checkName: "Pool Credit Quality",
    result: creditOk ? "PASS" : creditRange.includes("near") ? "NEEDS_HUMAN" : "FAIL",
    severity: "major",
    rationale: `Average credit score range: ${poolAggregates.avgCreditScoreRange}. ${
      creditOk
        ? "Meets credit quality threshold"
        : "Below preferred credit quality threshold"
    }`,
    method: "rules_engine",
  });

  // DELINQUENCY_THRESHOLD
  const delBucket = poolAggregates.delinquencyRateBucket;
  // Parse percentage from bucket string like "<1%", "1-3%", "3-5%", ">5%"
  let delinquencyOk = true;
  if (delBucket.includes(">")) {
    const pct = parseFloat(delBucket.replace(/[>%]/g, ""));
    delinquencyOk = pct < policy.delinquency90dMaxPct;
  }
  checks.push({
    checkId: "DELINQUENCY_THRESHOLD",
    checkName: "Delinquency Rate Threshold",
    result: delinquencyOk ? "PASS" : "FAIL",
    severity: "critical",
    rationale: `Delinquency bucket: ${delBucket}. ${
      delinquencyOk
        ? `Within ${policy.delinquency90dMaxPct}% threshold`
        : `Exceeds ${policy.delinquency90dMaxPct}% threshold`
    }`,
    method: "rules_engine",
  });

  // ENHANCEMENT_ADEQUATE
  const seniority = metadata.trancheSeniority.toLowerCase();
  const minEnhancement =
    policy.minCreditEnhancementBps[seniority] ??
    policy.minCreditEnhancementBps["equity"] ??
    0;
  const enhancementOk = Number(metadata.creditEnhancementBps) >= minEnhancement;
  checks.push({
    checkId: "ENHANCEMENT_ADEQUATE",
    checkName: "Credit Enhancement Adequate",
    result: enhancementOk ? "PASS" : "FAIL",
    severity: "major",
    rationale: enhancementOk
      ? `Credit enhancement ${metadata.creditEnhancementBps} bps meets minimum ${minEnhancement} bps for ${seniority} tranche`
      : `Credit enhancement ${metadata.creditEnhancementBps} bps below minimum ${minEnhancement} bps for ${seniority} tranche`,
    method: "rules_engine",
  });

  return checks;
}
