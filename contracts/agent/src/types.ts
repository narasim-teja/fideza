// ============================================================================
// Fideza AI Compliance Agent — Shared Type Definitions
// Mirrors Solidity structs from Privacy Node contracts
// ============================================================================

export type AssetType = "INVOICE" | "BOND" | "ABS_TRANCHE";

// -- Invoice ------------------------------------------------------------------

export interface InvoiceMetadata {
  invoiceId: string;
  issuer: string;
  debtorName: string;
  debtorJurisdiction: string;
  debtorCreditRating: string;
  debtorIndustry: string;
  faceValue: bigint;
  currency: string;
  issueDate: bigint;
  dueDate: bigint;
  paymentTerms: string;
  recourseType: string;
  priorityClaim: boolean;
  invoiceDocHash: string;
  previouslyTokenized: boolean;
}

export interface InvoiceDisclosure {
  assetType: string;
  maturityBucket: string;
  currency: string;
  notionalRange: string;
  debtorIndustry: string;
  debtorCreditTier: string;
  recourseType: string;
  riskScore: bigint;
  priorityClaim: boolean;
}

// -- Bond ---------------------------------------------------------------------

export interface BondMetadata {
  bondId: string;
  isin: string;
  issuer: string;
  issuerName: string;
  issuerJurisdiction: string;
  issuerSector: string;
  issuerCreditRating: string;
  parValue: bigint;
  currency: string;
  couponRateBps: bigint;
  couponFrequency: string;
  issueDate: bigint;
  maturityDate: bigint;
  seniority: string;
  collateralType: string;
  covenantSummary: string;
  callProvision: string;
  offeringType: string;
  minimumDenomination: bigint;
  qualifiedBuyerOnly: boolean;
  termSheetHash: string;
}

export interface BondDisclosure {
  assetType: string;
  issuerCategory: string;
  seniority: string;
  maturityBucket: string;
  couponRange: string;
  currency: string;
  parValue: bigint;
  couponFrequency: string;
  creditTier: string;
  hasCollateral: boolean;
  offeringType: string;
  qualifiedBuyerOnly: boolean;
}

// -- ABS ----------------------------------------------------------------------

export interface ABSMetadata {
  absId: string;
  issuer: string;
  poolType: string;
  totalPoolSize: bigint;
  totalPoolNotional: bigint;
  trancheName: string;
  trancheSeniority: string;
  trancheSize: bigint;
  creditEnhancementBps: bigint;
  subordinationLevelBps: bigint;
  currency: string;
  expectedMaturity: bigint;
  servicerName: string;
  auditorName: string;
  offeringCircularHash: string;
  poolTapeHash: string;
}

export interface PoolAggregates {
  poolSize: bigint;
  totalNotional: bigint;
  avgCreditScoreRange: string;
  weightedAvgTermBucket: string;
  delinquencyRateBucket: string;
}

export interface ABSDisclosure {
  assetType: string;
  poolType: string;
  poolSizeBucket: string;
  trancheSeniority: string;
  creditEnhancementBps: bigint;
  subordinationLevelBps: bigint;
  currency: string;
  maturityBucket: string;
  poolAggregates: PoolAggregates;
}

// -- Compliance Pipeline ------------------------------------------------------

export interface CheckResult {
  checkId: string;
  checkName: string;
  result: "PASS" | "FAIL" | "NEEDS_HUMAN";
  severity: "critical" | "major" | "minor";
  rationale: string;
  method: "rules_engine" | "llm";
}

export interface DisclosureRecommendation {
  disclosedFields: string[];
  withheldFields: Array<{ field: string; reason: string }>;
  bucketedFields: Array<{
    field: string;
    originalValue: string;
    bucketedValue: string;
    reason: string;
  }>;
}

export interface ComplianceReport {
  assetId: string;
  assetType: AssetType;
  policyVersion: string;
  policyVersionHash: string;
  reviewedAt: string;
  checks: CheckResult[];
  disclosureRecommendation: DisclosureRecommendation;
  riskScore: number;
  riskTier: "A" | "B" | "C";
  riskFactors: string[];
  recommendation: "APPROVE" | "REJECT" | "ESCALATE";
  recommendationRationale: string;
  inputsCommitment: string;
  reportHash: string;
}

// -- Asset Read Results (discriminated union) ---------------------------------

export type AssetReadResult =
  | {
      type: "INVOICE";
      metadata: InvoiceMetadata;
      assetId: string;
      issuer: string;
    }
  | {
      type: "BOND";
      metadata: BondMetadata;
      assetId: string;
      issuer: string;
    }
  | {
      type: "ABS_TRANCHE";
      metadata: ABSMetadata;
      poolAggregates: PoolAggregates;
      assetId: string;
      issuer: string;
    };

// -- Policy types -------------------------------------------------------------

export interface PolicyDisclosureConfig {
  disclosed: string[];
  bucketed: Array<{ field: string; reason: string }>;
  withheld: Array<{ field: string; reason: string }>;
}

export interface InvoicePolicy {
  policyVersion: string;
  assetType: "INVOICE";
  allowedJurisdictions: string[];
  sanctionedJurisdictions: string[];
  requiredFields: string[];
  valueLimits: { minFaceValue: number; maxFaceValue: number };
  maturityRange: { minDays: number; maxDays: number };
  disclosure: PolicyDisclosureConfig;
}

export interface BondPolicy {
  policyVersion: string;
  assetType: "BOND";
  allowedJurisdictions: string[];
  sanctionedJurisdictions: string[];
  requiredFields: string[];
  valueLimits: { minParValue: number; maxParValue: number };
  maturityRange: { minYears: number; maxYears: number };
  couponRange: { minBps: number; maxBps: number };
  recognizedRatings: string[];
  disclosure: PolicyDisclosureConfig;
}

export interface ABSPolicy {
  policyVersion: string;
  assetType: "ABS_TRANCHE";
  allowedJurisdictions: string[];
  sanctionedJurisdictions: string[];
  requiredFields: string[];
  poolSizeMinimum: number;
  maxSingleLoanConcentrationPct: number;
  creditScoreMinimum: number;
  delinquency90dMaxPct: number;
  minCreditEnhancementBps: Record<string, number>;
  disclosure: PolicyDisclosureConfig;
}

export type AssetPolicy = InvoicePolicy | BondPolicy | ABSPolicy;

// -- Portfolio Construction Pipeline ------------------------------------------

export interface PortfolioConstraints {
  minRating: string;
  maxRating?: string;
  targetYieldBps: number;
  maxSingleExposurePct: number;
  minBonds: number;
  maturityPreference?: string;
  currencyPreference?: string;
  riskTolerance?: string;
  /** Investment amount in wei (USDr). When set, allocation amounts are scaled proportionally. */
  investmentAmountWei?: bigint;
}

export interface RatedBondOnChain {
  assetId: string;
  bondTokenAddress: string;
  assetType: string;
  rating: string;
  couponRateBps: number;
  couponRange: string;
  maturityBucket: string;
  maturityTimestamp: bigint;
  seniority: string;
  currency: string;
  issuerCategory: string;
  parValue: bigint;
  hasCollateral: boolean;
  riskScore: number;
  complianceReportHash: string;
  availableForPortfolio: boolean;
  availableSupply: bigint;
}

export interface PortfolioAllocation {
  assetId: string;
  bondTokenAddress: string;
  weightBps: number;
  amount: bigint;
  rating: string;
  couponRateBps: number;
  assetType: string;
  maturityTimestamp: bigint;
  rationale?: string;
}

export interface OptimizedPortfolio {
  allocations: PortfolioAllocation[];
  totalWeightBps: number;
  weightedCouponBps: number;
  weightedRiskScore: number;
  diversificationScore: number;
  method: "llm" | "greedy";
}

export interface PortfolioAttestation {
  portfolioId: string;
  totalValue: bigint;
  ratingRange: string;
  weightedCouponBps: number;
  avgMaturityMonths: number;
  diversificationScore: number;
  numBonds: number;
  maxSingleExposurePct: number;
  methodologyHash: string;
  signature: string;
}

// -- Helpers ------------------------------------------------------------------

export function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
