import type { Address } from "viem";

// ---------------------------------------------------------------------------
// Deployed contract addresses (Rayls Public Chain)
// ---------------------------------------------------------------------------

export const CONTRACTS = {
  receiptTokenFactory: "0x72433fF3388d7ed7da10ebB65CA1EA8198BCf9de" as Address,
  ptytSplitter: "0xf1E4a482A9F48c970c7673974Ac215f5F521320a" as Address,
  marketplace: "0x37d5AA068529eb99dc2AA60Cc56F7f0A3adC06b8" as Address,
} as const;

export const MIRROR_TOKENS = {
  invoice: "0xCa3Dc500c3E2676aB69D6202d7A7C0Bb8605c23d" as Address,
  bond: "0xd76c7146b6cD41c42699e3a0A0F0a214e4a5B419" as Address,
  abs: "0x5d298fa68606979Eaf426190B22CB06E9C22082E" as Address,
} as const;

export const PT_TOKENS = {
  invoice: "0xcf3bFf828E258a341af5fc0b578d9d3a55BaED6e" as Address,
  bond: "0x89370fC62FD849D6E4D4c0b763Da74106ADed677" as Address,
  abs: "0x8a3E3DEbB7917802347F3330cCAD91d23Ab90a88" as Address,
} as const;

export const YT_TOKENS = {
  invoice: "0xeE4b84d4b365F3e25AEd4F74a3F6285d941a01Ac" as Address,
  bond: "0xc955A2b4235cF6FeB4392fDeAef3DdA70A792161" as Address,
  abs: "0xD993C487DFB24A5Ee7518103Cb351d44A30a8931" as Address,
} as const;

export type AssetKey = "invoice" | "bond" | "abs";

// ---------------------------------------------------------------------------
// Phase 8 — Vault + Lending contracts (Rayls Public Chain)
// ---------------------------------------------------------------------------

export const VAULT_CONTRACTS = {
  bondCatalog: "0x40713c6040eA8E4c6a88897cf70A5e789553aaC0" as Address,
  portfolioAttestation: "0xAc7E7F211594c1e25a88B0Ca8C2824a5d0315855" as Address,
  aiAttestationVerifier: "0x6adF0665e7aFa93a9CF20749e7c6e09efd9cF6C4" as Address,
  lendingPool: "0xCFe85abB69E13876d7de9Dd5427Bf61c51Cb61D1" as Address, // ZK-backed lending pool (Phase 11)
  lendingPoolLegacy: "0x36C508b13B5a9509eB0E8d9F173Ba886961bcFca" as Address, // AI-backed (Phase 8)
  // Phase 11: ZK Verifier
  zkPortfolioVerifier: "0x60A1c66c6C308Afb003769CD35fACF5f593B3dA4" as Address,
} as const;

/** Known vault share tokens on public chain (mirror tokens after bridge) */
export const VAULT_SHARE_TOKENS = [
  {
    address: "0x200Df3Ad400ed1Bd35d6805C1E48d8Bf9eaFD4dA" as Address,
    label: "AI Portfolio — Phase 8",
  },
] as const;

// ---------------------------------------------------------------------------
// ABIs (inlined as const for wagmi type inference)
// ---------------------------------------------------------------------------

export const receiptTokenFactoryAbi = [
  { type: "function", name: "getAllReceiptIds", inputs: [], outputs: [{ name: "", type: "bytes32[]" }], stateMutability: "view" },
  { type: "function", name: "getReceipt", inputs: [{ name: "assetId", type: "bytes32" }], outputs: [{ name: "", type: "tuple", components: [{ name: "assetId", type: "bytes32" }, { name: "mirrorTokenAddress", type: "address" }, { name: "assetType", type: "string" }, { name: "disclosureJSON", type: "string" }, { name: "complianceReportHash", type: "bytes32" }, { name: "policyVersionHash", type: "bytes32" }, { name: "governanceApprovalTx", type: "bytes32" }, { name: "maturityTimestamp", type: "uint256" }, { name: "principalValue", type: "uint256" }, { name: "expectedYieldValue", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "getReceiptsByType", inputs: [{ name: "assetType", type: "string" }], outputs: [{ name: "", type: "bytes32[]" }], stateMutability: "view" },
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "receiptIds", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "bytes32" }], stateMutability: "view" },
  { type: "event", name: "ReceiptRegistered", inputs: [{ name: "assetId", type: "bytes32", indexed: true }, { name: "mirrorTokenAddress", type: "address", indexed: false }, { name: "assetType", type: "string", indexed: false }] },
] as const;

export const ptytSplitterAbi = [
  { type: "function", name: "getAllSplitIds", inputs: [], outputs: [{ name: "", type: "bytes32[]" }], stateMutability: "view" },
  { type: "function", name: "getSplit", inputs: [{ name: "assetId", type: "bytes32" }], outputs: [{ name: "", type: "tuple", components: [{ name: "assetId", type: "bytes32" }, { name: "receiptTokenAddress", type: "address" }, { name: "ptTokenAddress", type: "address" }, { name: "ytTokenAddress", type: "address" }, { name: "maturityTimestamp", type: "uint256" }, { name: "principalPerToken", type: "uint256" }, { name: "expectedYieldPerToken", type: "uint256" }, { name: "totalPrincipalSettled", type: "uint256" }, { name: "totalYieldDistributed", type: "uint256" }, { name: "totalReceiptLocked", type: "uint256" }, { name: "principalSettled", type: "bool" }, { name: "yieldSettled", type: "bool" }] }], stateMutability: "view" },
  { type: "function", name: "split", inputs: [{ name: "assetId", type: "bytes32" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "merge", inputs: [{ name: "assetId", type: "bytes32" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "redeemPT", inputs: [{ name: "assetId", type: "bytes32" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "redeemYT", inputs: [{ name: "assetId", type: "bytes32" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "settlePrincipal", inputs: [{ name: "assetId", type: "bytes32" }], outputs: [], stateMutability: "payable" },
  { type: "function", name: "distributeYield", inputs: [{ name: "assetId", type: "bytes32" }], outputs: [], stateMutability: "payable" },
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "splitAssetIds", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "bytes32" }], stateMutability: "view" },
  { type: "event", name: "SplitInitialized", inputs: [{ name: "assetId", type: "bytes32", indexed: true }, { name: "pt", type: "address", indexed: false }, { name: "yt", type: "address", indexed: false }] },
  { type: "event", name: "TokensSplit", inputs: [{ name: "assetId", type: "bytes32", indexed: true }, { name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "TokensMerged", inputs: [{ name: "assetId", type: "bytes32", indexed: true }, { name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "PrincipalSettled", inputs: [{ name: "assetId", type: "bytes32", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "YieldDistributed", inputs: [{ name: "assetId", type: "bytes32", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "PTRedeemed", inputs: [{ name: "assetId", type: "bytes32", indexed: true }, { name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "payout", type: "uint256", indexed: false }] },
  { type: "event", name: "YTRedeemed", inputs: [{ name: "assetId", type: "bytes32", indexed: true }, { name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "payout", type: "uint256", indexed: false }] },
] as const;

export const marketplaceAbi = [
  { type: "function", name: "buy", inputs: [{ name: "listingId", type: "uint256" }], outputs: [], stateMutability: "payable" },
  { type: "function", name: "delist", inputs: [{ name: "listingId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getActiveListings", inputs: [], outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "getListingWithMetadata", inputs: [{ name: "listingId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "price", type: "uint256" }, { name: "active", type: "bool" }, { name: "seller", type: "address" }] }, { name: "", type: "tuple", components: [{ name: "assetId", type: "bytes32" }, { name: "tokenType", type: "uint8" }, { name: "disclosureURI", type: "string" }, { name: "complianceReportHash", type: "bytes32" }] }], stateMutability: "view" },
  { type: "function", name: "getListingsByTokenType", inputs: [{ name: "tokenType", type: "uint8" }], outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "listWithMetadata", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "price", type: "uint256" }, { name: "metadata", type: "tuple", components: [{ name: "assetId", type: "bytes32" }, { name: "tokenType", type: "uint8" }, { name: "disclosureURI", type: "string" }, { name: "complianceReportHash", type: "bytes32" }] }], outputs: [{ name: "listingId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "nextListingId", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "updatePrice", inputs: [{ name: "listingId", type: "uint256" }, { name: "newPrice", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "event", name: "Bought", inputs: [{ name: "listingId", type: "uint256", indexed: true }, { name: "buyer", type: "address", indexed: true }, { name: "price", type: "uint256", indexed: false }] },
  { type: "event", name: "Delisted", inputs: [{ name: "listingId", type: "uint256", indexed: true }] },
  { type: "event", name: "Listed", inputs: [{ name: "listingId", type: "uint256", indexed: true }, { name: "token", type: "address", indexed: true }, { name: "tokenType", type: "uint8", indexed: false }, { name: "price", type: "uint256", indexed: false }, { name: "seller", type: "address", indexed: false }] },
  { type: "event", name: "Updated", inputs: [{ name: "listingId", type: "uint256", indexed: true }, { name: "newPrice", type: "uint256", indexed: false }] },
] as const;

export const erc20Abi = [
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "name", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "transferFrom", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "event", name: "Approval", inputs: [{ name: "owner", type: "address", indexed: true }, { name: "spender", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
  { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
] as const;

// ---------------------------------------------------------------------------
// Phase 8 ABIs
// ---------------------------------------------------------------------------

export const bondCatalogAbi = [
  { type: "function", name: "getAllBonds", inputs: [], outputs: [{ name: "", type: "tuple[]", components: [{ name: "assetId", type: "bytes32" }, { name: "assetType", type: "string" }, { name: "rating", type: "string" }, { name: "couponRange", type: "string" }, { name: "maturityBucket", type: "string" }, { name: "currency", type: "string" }, { name: "issuerCategory", type: "string" }, { name: "hasCollateral", type: "bool" }, { name: "riskScore", type: "uint8" }] }], stateMutability: "view" },
  { type: "function", name: "getBond", inputs: [{ name: "assetId", type: "bytes32" }], outputs: [{ name: "", type: "tuple", components: [{ name: "assetId", type: "bytes32" }, { name: "assetType", type: "string" }, { name: "rating", type: "string" }, { name: "couponRange", type: "string" }, { name: "maturityBucket", type: "string" }, { name: "currency", type: "string" }, { name: "issuerCategory", type: "string" }, { name: "hasCollateral", type: "bool" }, { name: "riskScore", type: "uint8" }] }], stateMutability: "view" },
  { type: "function", name: "getBondCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "event", name: "BondCatalogued", inputs: [{ name: "assetId", type: "bytes32", indexed: true }, { name: "assetType", type: "string", indexed: false }, { name: "rating", type: "string", indexed: false }] },
] as const;

export const portfolioAttestationAbi = [
  { type: "function", name: "getAttestation", inputs: [{ name: "portfolioId", type: "bytes32" }], outputs: [{ name: "", type: "tuple", components: [{ name: "portfolioId", type: "bytes32" }, { name: "totalValue", type: "uint256" }, { name: "weightedCouponBps", type: "uint256" }, { name: "numBonds", type: "uint8" }, { name: "diversificationScore", type: "uint8" }, { name: "methodologyHash", type: "bytes32" }, { name: "agentSignature", type: "bytes" }, { name: "timestamp", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "hasValidAttestation", inputs: [{ name: "portfolioId", type: "bytes32" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getAttestedValue", inputs: [{ name: "portfolioId", type: "bytes32" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getAllPortfolioIds", inputs: [], outputs: [{ name: "", type: "bytes32[]" }], stateMutability: "view" },
  { type: "function", name: "getPortfolioCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "event", name: "AttestationSubmitted", inputs: [{ name: "portfolioId", type: "bytes32", indexed: true }, { name: "totalValue", type: "uint256", indexed: false }, { name: "numBonds", type: "uint8", indexed: false }, { name: "diversificationScore", type: "uint8", indexed: false }, { name: "timestamp", type: "uint256", indexed: false }] },
] as const;

export const lendingPoolAbi = [
  // Lender
  { type: "function", name: "deposit", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "withdraw", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "lenderBalances", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  // Borrower
  { type: "function", name: "borrow", inputs: [{ name: "collateralToken", type: "address" }, { name: "portfolioId", type: "bytes32" }, { name: "collateralAmount", type: "uint256" }, { name: "borrowAmount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "repay", inputs: [{ name: "loanId", type: "uint256" }], outputs: [], stateMutability: "payable" },
  // Liquidation
  { type: "function", name: "liquidate", inputs: [{ name: "loanId", type: "uint256" }], outputs: [], stateMutability: "payable" },
  // Views
  { type: "function", name: "getDebt", inputs: [{ name: "loanId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getCollateralRatio", inputs: [{ name: "loanId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getAvailableLiquidity", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getPoolStats", inputs: [], outputs: [{ name: "_totalDeposited", type: "uint256" }, { name: "_totalBorrowed", type: "uint256" }, { name: "_availableLiquidity", type: "uint256" }, { name: "_utilizationBps", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "loans", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "borrower", type: "address" }, { name: "collateralToken", type: "address" }, { name: "portfolioId", type: "bytes32" }, { name: "collateralAmount", type: "uint256" }, { name: "principal", type: "uint256" }, { name: "startTime", type: "uint256" }, { name: "active", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "nextLoanId", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalDeposited", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalBorrowed", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  // Constants
  { type: "function", name: "INTEREST_RATE_BPS", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "COLLATERAL_RATIO_BPS", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "LIQUIDATION_THRESHOLD_BPS", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "LIQUIDATION_PENALTY_BPS", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  // Events
  { type: "event", name: "Deposited", inputs: [{ name: "lender", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "Withdrawn", inputs: [{ name: "lender", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "Borrowed", inputs: [{ name: "loanId", type: "uint256", indexed: true }, { name: "borrower", type: "address", indexed: true }, { name: "principal", type: "uint256", indexed: false }, { name: "portfolioId", type: "bytes32", indexed: false }] },
  { type: "event", name: "Repaid", inputs: [{ name: "loanId", type: "uint256", indexed: true }, { name: "borrower", type: "address", indexed: true }, { name: "totalPaid", type: "uint256", indexed: false }] },
  { type: "event", name: "Liquidated", inputs: [{ name: "loanId", type: "uint256", indexed: true }, { name: "liquidator", type: "address", indexed: true }, { name: "debtRepaid", type: "uint256", indexed: false }] },
] as const;

// ---------------------------------------------------------------------------
// Phase 11 — ZK Portfolio Verifier ABI
// ---------------------------------------------------------------------------

export const zkPortfolioVerifierAbi = [
  { type: "function", name: "hasValidProof", inputs: [{ name: "portfolioId", type: "bytes32" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getVerifiedPortfolio", inputs: [{ name: "portfolioId", type: "bytes32" }], outputs: [{ name: "", type: "tuple", components: [{ name: "totalValue", type: "uint256" }, { name: "weightedCouponBps", type: "uint256" }, { name: "numBonds", type: "uint8" }, { name: "minRatingIndex", type: "uint8" }, { name: "maxRatingIndex", type: "uint8" }, { name: "maxSingleExposureBps", type: "uint256" }, { name: "diversificationScore", type: "uint8" }, { name: "verifiedAt", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "verifyPortfolio", inputs: [{ name: "portfolioId", type: "bytes32" }], outputs: [{ name: "valid", type: "bool" }, { name: "totalValue", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "verifyAndStore", inputs: [{ name: "portfolioId", type: "bytes32" }, { name: "proof", type: "bytes" }, { name: "publicInputs", type: "bytes32[]" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getPortfolioCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "event", name: "PortfolioVerified", inputs: [{ name: "portfolioId", type: "bytes32", indexed: true }, { name: "totalValue", type: "uint256", indexed: false }, { name: "numBonds", type: "uint8", indexed: false }, { name: "diversificationScore", type: "uint8", indexed: false }, { name: "timestamp", type: "uint256", indexed: false }] },
] as const;
