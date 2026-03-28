import type { AssetReadResult, CheckResult } from "../types";
import { callLLM, parseJSON } from "../providers/llm";

const SYSTEM_PROMPT =
  "You are a financial compliance analyst. Respond with ONLY a JSON object, no markdown, no extra text.";

// -- Invoice: PAYMENT_TERMS_ANALYSIS ------------------------------------------

interface PaymentTermsAnalysis {
  termsStandard: boolean;
  unusualConditions: string[];
  riskFlags: string[];
  rationale: string;
}

async function analyzeInvoicePaymentTerms(
  asset: Extract<AssetReadResult, { type: "INVOICE" }>,
): Promise<CheckResult> {
  const m = asset.metadata;
  const maturityDays = Number(
    (m.dueDate - m.issueDate) / 86400n,
  );

  const userPrompt = `Evaluate these invoice payment terms for a trade receivable tokenization:

- Payment Terms: ${m.paymentTerms}
- Recourse Type: ${m.recourseType}
- Face Value: ${Number(m.faceValue / (10n ** 18n)).toLocaleString()} ${m.currency}
- Maturity: ${maturityDays} days
- Debtor Industry: ${m.debtorIndustry}
- Debtor Credit Rating: ${m.debtorCreditRating}

Are these payment terms standard for this industry and deal size? Flag any unusual conditions.

Respond with ONLY this JSON format:
{"termsStandard": true/false, "unusualConditions": ["..."], "riskFlags": ["..."], "rationale": "..."}`;

  try {
    const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
    const analysis = parseJSON<PaymentTermsAnalysis>(raw);

    return {
      checkId: "PAYMENT_TERMS_ANALYSIS",
      checkName: "Payment Terms Analysis (LLM)",
      result: analysis.termsStandard
        ? "PASS"
        : analysis.riskFlags.length > 0
          ? "FAIL"
          : "NEEDS_HUMAN",
      severity: "minor",
      rationale: analysis.rationale,
      method: "llm",
    };
  } catch (e: any) {
    return {
      checkId: "PAYMENT_TERMS_ANALYSIS",
      checkName: "Payment Terms Analysis (LLM)",
      result: "NEEDS_HUMAN",
      severity: "minor",
      rationale: `LLM analysis failed: ${e.message?.slice(0, 100)}`,
      method: "llm",
    };
  }
}

// -- Bond: COVENANT_ANALYSIS --------------------------------------------------

interface CovenantAnalysis {
  covenantQuality: "standard" | "weak" | "aggressive";
  aggressiveTerms: string[];
  protectiveTerms: string[];
  riskFlags: string[];
  rationale: string;
}

async function analyzeBondCovenants(
  asset: Extract<AssetReadResult, { type: "BOND" }>,
): Promise<CheckResult> {
  const m = asset.metadata;

  const userPrompt = `Evaluate these corporate bond covenant terms:

- Covenant Summary: ${m.covenantSummary}
- Call Provision: ${m.callProvision}
- Seniority: ${m.seniority}
- Issuer Credit Rating: ${m.issuerCreditRating}
- Coupon Rate: ${Number(m.couponRateBps) / 100}%
- Offering Type: ${m.offeringType}

Classify covenant quality and identify protective vs aggressive terms.

Respond with ONLY this JSON format:
{"covenantQuality": "standard"|"weak"|"aggressive", "aggressiveTerms": ["..."], "protectiveTerms": ["..."], "riskFlags": ["..."], "rationale": "..."}`;

  try {
    const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
    const analysis = parseJSON<CovenantAnalysis>(raw);

    const result =
      analysis.covenantQuality === "standard"
        ? "PASS"
        : analysis.covenantQuality === "aggressive"
          ? "FAIL"
          : "NEEDS_HUMAN";

    return {
      checkId: "COVENANT_ANALYSIS",
      checkName: "Covenant Analysis (LLM)",
      result,
      severity: "major",
      rationale: analysis.rationale,
      method: "llm",
    };
  } catch (e: any) {
    return {
      checkId: "COVENANT_ANALYSIS",
      checkName: "Covenant Analysis (LLM)",
      result: "NEEDS_HUMAN",
      severity: "major",
      rationale: `LLM analysis failed: ${e.message?.slice(0, 100)}`,
      method: "llm",
    };
  }
}

// -- ABS: POOL_ANALYSIS -------------------------------------------------------

interface PoolAnalysis {
  poolQuality: "acceptable" | "marginal" | "poor";
  concentrationConcerns: string[];
  structuralRisks: string[];
  riskFlags: string[];
  rationale: string;
}

async function analyzeABSPool(
  asset: Extract<AssetReadResult, { type: "ABS_TRANCHE" }>,
): Promise<CheckResult> {
  const m = asset.metadata;
  const pa = asset.poolAggregates;

  const userPrompt = `Evaluate this ABS pool composition and tranche structure:

- Pool Type: ${m.poolType}
- Total Pool Size: ${m.totalPoolSize} loans
- Total Pool Notional: ${Number(m.totalPoolNotional / (10n ** 18n)).toLocaleString()} ${m.currency}
- Tranche Seniority: ${m.trancheSeniority}
- Credit Enhancement: ${Number(m.creditEnhancementBps)} bps
- Subordination Level: ${Number(m.subordinationLevelBps)} bps

Pool Aggregates (privacy-preserving, computed from individual loans):
- Average Credit Score Range: ${pa.avgCreditScoreRange}
- Weighted Average Term: ${pa.weightedAvgTermBucket}
- Delinquency Rate: ${pa.delinquencyRateBucket}

Assess pool quality, diversification, and structural adequacy for the tranche seniority.

Respond with ONLY this JSON format:
{"poolQuality": "acceptable"|"marginal"|"poor", "concentrationConcerns": ["..."], "structuralRisks": ["..."], "riskFlags": ["..."], "rationale": "..."}`;

  try {
    const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
    const analysis = parseJSON<PoolAnalysis>(raw);

    const result =
      analysis.poolQuality === "acceptable"
        ? "PASS"
        : analysis.poolQuality === "poor"
          ? "FAIL"
          : "NEEDS_HUMAN";

    return {
      checkId: "POOL_ANALYSIS",
      checkName: "Pool Composition Analysis (LLM)",
      result,
      severity: "major",
      rationale: analysis.rationale,
      method: "llm",
    };
  } catch (e: any) {
    return {
      checkId: "POOL_ANALYSIS",
      checkName: "Pool Composition Analysis (LLM)",
      result: "NEEDS_HUMAN",
      severity: "major",
      rationale: `LLM analysis failed: ${e.message?.slice(0, 100)}`,
      method: "llm",
    };
  }
}

// -- Public API ---------------------------------------------------------------

export async function runLLMReview(
  asset: AssetReadResult,
): Promise<CheckResult[]> {
  switch (asset.type) {
    case "INVOICE":
      return [await analyzeInvoicePaymentTerms(asset)];
    case "BOND":
      return [await analyzeBondCovenants(asset)];
    case "ABS_TRANCHE":
      return [await analyzeABSPool(asset)];
  }
}
