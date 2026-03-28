import type { InvoiceMetadata, CheckResult, InvoicePolicy } from "../types";

const DAY_SECONDS = 86400n;
const DECIMALS_18 = 10n ** 18n;

export function runInvoiceChecks(
  metadata: InvoiceMetadata,
  issuerApproved: boolean,
  policy: InvoicePolicy,
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
    metadata.debtorJurisdiction,
  );
  checks.push({
    checkId: "JURISDICTION_ALLOWED",
    checkName: "Jurisdiction Allowed",
    result: jurisdictionAllowed ? "PASS" : "FAIL",
    severity: "major",
    rationale: jurisdictionAllowed
      ? `Debtor jurisdiction ${metadata.debtorJurisdiction} is in allowed list`
      : `Debtor jurisdiction ${metadata.debtorJurisdiction} is NOT in allowed list`,
    method: "rules_engine",
  });

  // SANCTIONS_SCREEN
  const sanctioned = policy.sanctionedJurisdictions.includes(
    metadata.debtorJurisdiction,
  );
  checks.push({
    checkId: "SANCTIONS_SCREEN",
    checkName: "Sanctions Screening",
    result: sanctioned ? "FAIL" : "PASS",
    severity: "critical",
    rationale: sanctioned
      ? `Debtor jurisdiction ${metadata.debtorJurisdiction} is on sanctions list`
      : `Debtor jurisdiction ${metadata.debtorJurisdiction} is not sanctioned`,
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

  // VALUE_LIMITS (faceValue is stored with 18 decimals on-chain)
  const fv = Number(metadata.faceValue / DECIMALS_18);
  const valueOk =
    fv >= policy.valueLimits.minFaceValue &&
    fv <= policy.valueLimits.maxFaceValue;
  checks.push({
    checkId: "VALUE_LIMITS",
    checkName: "Notional Value Limits",
    result: valueOk ? "PASS" : "FAIL",
    severity: "major",
    rationale: valueOk
      ? `Face value ${fv} within limits [${policy.valueLimits.minFaceValue}, ${policy.valueLimits.maxFaceValue}]`
      : `Face value ${fv} outside limits [${policy.valueLimits.minFaceValue}, ${policy.valueLimits.maxFaceValue}]`,
    method: "rules_engine",
  });

  // DOUBLE_TOKENIZATION
  checks.push({
    checkId: "DOUBLE_TOKENIZATION",
    checkName: "Double Tokenization Check",
    result: metadata.previouslyTokenized ? "FAIL" : "PASS",
    severity: "critical",
    rationale: metadata.previouslyTokenized
      ? "Invoice was previously tokenized — double-financing risk"
      : "Invoice has not been previously tokenized",
    method: "rules_engine",
  });

  // DEBTOR_JURISDICTION
  const debtorJurisdictionOk = policy.allowedJurisdictions.includes(
    metadata.debtorJurisdiction,
  );
  checks.push({
    checkId: "DEBTOR_JURISDICTION",
    checkName: "Debtor Jurisdiction Check",
    result: debtorJurisdictionOk ? "PASS" : "FAIL",
    severity: "major",
    rationale: debtorJurisdictionOk
      ? `Debtor jurisdiction ${metadata.debtorJurisdiction} is allowed`
      : `Debtor jurisdiction ${metadata.debtorJurisdiction} is not in allowed list`,
    method: "rules_engine",
  });

  // MATURITY_RANGE
  const maturityDays = Number(
    (metadata.dueDate - metadata.issueDate) / DAY_SECONDS,
  );
  const maturityOk =
    maturityDays >= policy.maturityRange.minDays &&
    maturityDays <= policy.maturityRange.maxDays;
  checks.push({
    checkId: "MATURITY_RANGE",
    checkName: "Maturity Range Check",
    result: maturityOk ? "PASS" : "FAIL",
    severity: "minor",
    rationale: maturityOk
      ? `Maturity ${maturityDays} days within range [${policy.maturityRange.minDays}, ${policy.maturityRange.maxDays}]`
      : `Maturity ${maturityDays} days outside range [${policy.maturityRange.minDays}, ${policy.maturityRange.maxDays}]`,
    method: "rules_engine",
  });

  return checks;
}
