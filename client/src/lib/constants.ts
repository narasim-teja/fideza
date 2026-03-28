export const ASSET_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  INVOICE: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  BOND: {
    bg: "bg-fideza-lavender/15",
    text: "text-fideza-lavender",
    border: "border-fideza-lavender/20",
  },
  ABS_TRANCHE: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
};

export const TOKEN_TYPE_LABELS: Record<number, string> = {
  0: "Receipt",
  1: "PT",
  2: "YT",
};

export const TOKEN_TYPE_ENUM = {
  RECEIPT: 0,
  PT: 1,
  YT: 2,
} as const;

export const EXPLORER_URL = "https://testnet-explorer.rayls.com";

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddressUrl(addr: string): string {
  return `${EXPLORER_URL}/address/${addr}`;
}

export const DISCLOSURE_FIELD_LABELS: Record<string, string> = {
  assetType: "Asset Type",
  maturityBucket: "Maturity Bucket",
  currency: "Currency",
  notionalRange: "Notional Range",
  debtorIndustry: "Debtor Industry",
  debtorCreditTier: "Credit Tier",
  recourseType: "Recourse Type",
  riskScore: "Risk Score",
  priorityClaim: "Priority Claim",
  issuerCategory: "Issuer Category",
  seniority: "Seniority",
  couponRange: "Coupon Range",
  couponFrequency: "Coupon Frequency",
  creditTier: "Credit Tier",
  hasCollateral: "Collateralized",
  parValue: "Par Value",
  poolType: "Pool Type",
  poolSizeBucket: "Pool Size",
  avgCreditScoreRange: "Avg Credit Score",
  geographicDistribution: "Geographic Distribution",
  weightedAvgTermBucket: "Weighted Avg Term",
  delinquencyRateBucket: "Delinquency Rate",
  trancheSeniority: "Tranche Seniority",
  creditEnhancement: "Credit Enhancement",
  subordinationLevel: "Subordination Level",
  expectedMaturityBucket: "Expected Maturity",
  complianceReportHash: "Compliance Report",
  policyVersionHash: "Policy Version",
  governanceApprovalTx: "Governance Approval",
  agentSignature: "Agent Signature",
};
