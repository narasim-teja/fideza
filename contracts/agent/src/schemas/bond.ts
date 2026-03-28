import type { BondMetadata, CheckResult, BondPolicy } from "../types";

const YEAR_SECONDS = 365n * 86400n;

export function runBondChecks(
  metadata: BondMetadata,
  issuerApproved: boolean,
  policy: BondPolicy,
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

  // JURISDICTION_ALLOWED
  const jurisdictionAllowed = policy.allowedJurisdictions.includes(
    metadata.issuerJurisdiction,
  );
  checks.push({
    checkId: "JURISDICTION_ALLOWED",
    checkName: "Jurisdiction Allowed",
    result: jurisdictionAllowed ? "PASS" : "FAIL",
    severity: "major",
    rationale: jurisdictionAllowed
      ? `Issuer jurisdiction ${metadata.issuerJurisdiction} is in allowed list`
      : `Issuer jurisdiction ${metadata.issuerJurisdiction} is NOT in allowed list`,
    method: "rules_engine",
  });

  // SANCTIONS_SCREEN
  const sanctioned = policy.sanctionedJurisdictions.includes(
    metadata.issuerJurisdiction,
  );
  checks.push({
    checkId: "SANCTIONS_SCREEN",
    checkName: "Sanctions Screening",
    result: sanctioned ? "FAIL" : "PASS",
    severity: "critical",
    rationale: sanctioned
      ? `Issuer jurisdiction ${metadata.issuerJurisdiction} is on sanctions list`
      : `Issuer jurisdiction ${metadata.issuerJurisdiction} is not sanctioned`,
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

  // VALUE_LIMITS
  const pv = Number(metadata.parValue);
  const valueOk =
    pv >= policy.valueLimits.minParValue &&
    pv <= policy.valueLimits.maxParValue;
  checks.push({
    checkId: "VALUE_LIMITS",
    checkName: "Par Value Limits",
    result: valueOk ? "PASS" : "FAIL",
    severity: "major",
    rationale: valueOk
      ? `Par value ${pv} within limits [${policy.valueLimits.minParValue}, ${policy.valueLimits.maxParValue}]`
      : `Par value ${pv} outside limits [${policy.valueLimits.minParValue}, ${policy.valueLimits.maxParValue}]`,
    method: "rules_engine",
  });

  // CREDIT_RATING_VALID
  const ratingValid = policy.recognizedRatings.includes(
    metadata.issuerCreditRating,
  );
  checks.push({
    checkId: "CREDIT_RATING_VALID",
    checkName: "Credit Rating Valid",
    result: ratingValid ? "PASS" : "FAIL",
    severity: "major",
    rationale: ratingValid
      ? `Credit rating ${metadata.issuerCreditRating} is from recognized scale`
      : `Credit rating ${metadata.issuerCreditRating} is not recognized`,
    method: "rules_engine",
  });

  // COUPON_REASONABLE
  const coupon = Number(metadata.couponRateBps);
  const couponOk =
    coupon >= policy.couponRange.minBps &&
    coupon <= policy.couponRange.maxBps;
  checks.push({
    checkId: "COUPON_REASONABLE",
    checkName: "Coupon Rate Reasonable",
    result: couponOk ? "PASS" : "FAIL",
    severity: "minor",
    rationale: couponOk
      ? `Coupon ${coupon} bps within range [${policy.couponRange.minBps}, ${policy.couponRange.maxBps}]`
      : `Coupon ${coupon} bps outside range [${policy.couponRange.minBps}, ${policy.couponRange.maxBps}]`,
    method: "rules_engine",
  });

  // MATURITY_RANGE
  const maturityYears = Number(
    (metadata.maturityDate - metadata.issueDate) / YEAR_SECONDS,
  );
  const maturityOk =
    maturityYears >= policy.maturityRange.minYears &&
    maturityYears <= policy.maturityRange.maxYears;
  checks.push({
    checkId: "MATURITY_RANGE",
    checkName: "Maturity Range Check",
    result: maturityOk ? "PASS" : "FAIL",
    severity: "minor",
    rationale: maturityOk
      ? `Maturity ~${maturityYears} years within range [${policy.maturityRange.minYears}, ${policy.maturityRange.maxYears}]`
      : `Maturity ~${maturityYears} years outside range [${policy.maturityRange.minYears}, ${policy.maturityRange.maxYears}]`,
    method: "rules_engine",
  });

  return checks;
}
