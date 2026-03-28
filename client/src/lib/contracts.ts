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
