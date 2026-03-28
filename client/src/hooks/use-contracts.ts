"use client";

import { useReadContract, useWriteContract } from "wagmi";
import type { Address, Hex } from "viem";
import {
  CONTRACTS,
  VAULT_CONTRACTS,
  receiptTokenFactoryAbi,
  ptytSplitterAbi,
  marketplaceAbi,
  erc20Abi,
  bondCatalogAbi,
  portfolioAttestationAbi,
  lendingPoolAbi,
} from "@/lib/contracts";

// ---------------------------------------------------------------------------
// ReceiptTokenFactory reads
// ---------------------------------------------------------------------------

export function useAllReceiptIds() {
  return useReadContract({
    abi: receiptTokenFactoryAbi,
    address: CONTRACTS.receiptTokenFactory,
    functionName: "getAllReceiptIds",
  });
}

export function useReceipt(assetId: Hex) {
  return useReadContract({
    abi: receiptTokenFactoryAbi,
    address: CONTRACTS.receiptTokenFactory,
    functionName: "getReceipt",
    args: [assetId],
  });
}

export function useReceiptsByType(assetType: string) {
  return useReadContract({
    abi: receiptTokenFactoryAbi,
    address: CONTRACTS.receiptTokenFactory,
    functionName: "getReceiptsByType",
    args: [assetType],
  });
}

// ---------------------------------------------------------------------------
// PTYTSplitter reads
// ---------------------------------------------------------------------------

export function useAllSplitIds() {
  return useReadContract({
    abi: ptytSplitterAbi,
    address: CONTRACTS.ptytSplitter,
    functionName: "getAllSplitIds",
  });
}

export function useSplit(assetId: Hex) {
  return useReadContract({
    abi: ptytSplitterAbi,
    address: CONTRACTS.ptytSplitter,
    functionName: "getSplit",
    args: [assetId],
  });
}

// ---------------------------------------------------------------------------
// Marketplace reads
// ---------------------------------------------------------------------------

export function useActiveListings() {
  return useReadContract({
    abi: marketplaceAbi,
    address: CONTRACTS.marketplace,
    functionName: "getActiveListings",
  });
}

export function useListingWithMetadata(listingId: bigint) {
  return useReadContract({
    abi: marketplaceAbi,
    address: CONTRACTS.marketplace,
    functionName: "getListingWithMetadata",
    args: [listingId],
  });
}

export function useListingsByTokenType(tokenType: number) {
  return useReadContract({
    abi: marketplaceAbi,
    address: CONTRACTS.marketplace,
    functionName: "getListingsByTokenType",
    args: [tokenType],
  });
}

// ---------------------------------------------------------------------------
// ERC-20 reads
// ---------------------------------------------------------------------------

export function useTokenBalance(token: Address, account: Address | undefined) {
  return useReadContract({
    abi: erc20Abi,
    address: token,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: !!account },
  });
}

export function useTokenAllowance(
  token: Address,
  owner: Address | undefined,
  spender: Address,
) {
  return useReadContract({
    abi: erc20Abi,
    address: token,
    functionName: "allowance",
    args: owner ? [owner, spender] : undefined,
    query: { enabled: !!owner },
  });
}

export function useTokenInfo(token: Address) {
  const name = useReadContract({ abi: erc20Abi, address: token, functionName: "name" });
  const symbol = useReadContract({ abi: erc20Abi, address: token, functionName: "symbol" });
  const decimals = useReadContract({ abi: erc20Abi, address: token, functionName: "decimals" });
  const totalSupply = useReadContract({ abi: erc20Abi, address: token, functionName: "totalSupply" });
  return { name, symbol, decimals, totalSupply };
}

// ---------------------------------------------------------------------------
// Write hooks
// ---------------------------------------------------------------------------

export function useApproveToken() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    approve: (token: Address, spender: Address, amount: bigint) =>
      writeContract({ abi: erc20Abi, address: token, functionName: "approve", args: [spender, amount] }),
    approveAsync: (token: Address, spender: Address, amount: bigint) =>
      writeContractAsync({ abi: erc20Abi, address: token, functionName: "approve", args: [spender, amount] }),
  };
}

export function useSplitTokens() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    split: (assetId: Hex, amount: bigint) =>
      writeContract({ abi: ptytSplitterAbi, address: CONTRACTS.ptytSplitter, functionName: "split", args: [assetId, amount] }),
    splitAsync: (assetId: Hex, amount: bigint) =>
      writeContractAsync({ abi: ptytSplitterAbi, address: CONTRACTS.ptytSplitter, functionName: "split", args: [assetId, amount] }),
  };
}

export function useMergeTokens() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    merge: (assetId: Hex, amount: bigint) =>
      writeContract({ abi: ptytSplitterAbi, address: CONTRACTS.ptytSplitter, functionName: "merge", args: [assetId, amount] }),
    mergeAsync: (assetId: Hex, amount: bigint) =>
      writeContractAsync({ abi: ptytSplitterAbi, address: CONTRACTS.ptytSplitter, functionName: "merge", args: [assetId, amount] }),
  };
}

export function useRedeemPT() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    redeem: (assetId: Hex, amount: bigint) =>
      writeContract({ abi: ptytSplitterAbi, address: CONTRACTS.ptytSplitter, functionName: "redeemPT", args: [assetId, amount] }),
    redeemAsync: (assetId: Hex, amount: bigint) =>
      writeContractAsync({ abi: ptytSplitterAbi, address: CONTRACTS.ptytSplitter, functionName: "redeemPT", args: [assetId, amount] }),
  };
}

export function useRedeemYT() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    redeem: (assetId: Hex, amount: bigint) =>
      writeContract({ abi: ptytSplitterAbi, address: CONTRACTS.ptytSplitter, functionName: "redeemYT", args: [assetId, amount] }),
    redeemAsync: (assetId: Hex, amount: bigint) =>
      writeContractAsync({ abi: ptytSplitterAbi, address: CONTRACTS.ptytSplitter, functionName: "redeemYT", args: [assetId, amount] }),
  };
}

export function useMarketplaceBuy() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    buy: (listingId: bigint, price: bigint) =>
      writeContract({ abi: marketplaceAbi, address: CONTRACTS.marketplace, functionName: "buy", args: [listingId], value: price }),
    buyAsync: (listingId: bigint, price: bigint) =>
      writeContractAsync({ abi: marketplaceAbi, address: CONTRACTS.marketplace, functionName: "buy", args: [listingId], value: price }),
  };
}

export function useMarketplaceList() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    list: (
      token: Address,
      amount: bigint,
      price: bigint,
      metadata: { assetId: Hex; tokenType: number; disclosureURI: string; complianceReportHash: Hex },
    ) =>
      writeContract({
        abi: marketplaceAbi,
        address: CONTRACTS.marketplace,
        functionName: "listWithMetadata",
        args: [token, amount, price, metadata],
      }),
    listAsync: (
      token: Address,
      amount: bigint,
      price: bigint,
      metadata: { assetId: Hex; tokenType: number; disclosureURI: string; complianceReportHash: Hex },
    ) =>
      writeContractAsync({
        abi: marketplaceAbi,
        address: CONTRACTS.marketplace,
        functionName: "listWithMetadata",
        args: [token, amount, price, metadata],
      }),
  };
}

export function useMarketplaceDelist() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    delist: (listingId: bigint) =>
      writeContract({ abi: marketplaceAbi, address: CONTRACTS.marketplace, functionName: "delist", args: [listingId] }),
    delistAsync: (listingId: bigint) =>
      writeContractAsync({ abi: marketplaceAbi, address: CONTRACTS.marketplace, functionName: "delist", args: [listingId] }),
  };
}

// ---------------------------------------------------------------------------
// BondCatalog reads (Phase 8)
// ---------------------------------------------------------------------------

export function useBondCatalog() {
  return useReadContract({
    abi: bondCatalogAbi,
    address: VAULT_CONTRACTS.bondCatalog,
    functionName: "getAllBonds",
  });
}

export function useBondCatalogCount() {
  return useReadContract({
    abi: bondCatalogAbi,
    address: VAULT_CONTRACTS.bondCatalog,
    functionName: "getBondCount",
  });
}

// ---------------------------------------------------------------------------
// PortfolioAttestation reads (Phase 8)
// ---------------------------------------------------------------------------

export function usePortfolioAttestation(portfolioId: Hex | undefined) {
  return useReadContract({
    abi: portfolioAttestationAbi,
    address: VAULT_CONTRACTS.portfolioAttestation,
    functionName: "getAttestation",
    args: portfolioId ? [portfolioId] : undefined,
    query: { enabled: !!portfolioId },
  });
}

export function useHasValidAttestation(portfolioId: Hex | undefined) {
  return useReadContract({
    abi: portfolioAttestationAbi,
    address: VAULT_CONTRACTS.portfolioAttestation,
    functionName: "hasValidAttestation",
    args: portfolioId ? [portfolioId] : undefined,
    query: { enabled: !!portfolioId },
  });
}

// ---------------------------------------------------------------------------
// FidezaLendingPool reads (Phase 8)
// ---------------------------------------------------------------------------

export function useLendingPoolStats() {
  return useReadContract({
    abi: lendingPoolAbi,
    address: VAULT_CONTRACTS.lendingPool,
    functionName: "getPoolStats",
  });
}

export function useLenderBalance(account: Address | undefined) {
  return useReadContract({
    abi: lendingPoolAbi,
    address: VAULT_CONTRACTS.lendingPool,
    functionName: "lenderBalances",
    args: account ? [account] : undefined,
    query: { enabled: !!account },
  });
}

export function useLoan(loanId: bigint | undefined) {
  return useReadContract({
    abi: lendingPoolAbi,
    address: VAULT_CONTRACTS.lendingPool,
    functionName: "loans",
    args: loanId !== undefined ? [loanId] : undefined,
    query: { enabled: loanId !== undefined },
  });
}

export function useLoanDebt(loanId: bigint | undefined) {
  return useReadContract({
    abi: lendingPoolAbi,
    address: VAULT_CONTRACTS.lendingPool,
    functionName: "getDebt",
    args: loanId !== undefined ? [loanId] : undefined,
    query: { enabled: loanId !== undefined },
  });
}

export function useCollateralRatio(loanId: bigint | undefined) {
  return useReadContract({
    abi: lendingPoolAbi,
    address: VAULT_CONTRACTS.lendingPool,
    functionName: "getCollateralRatio",
    args: loanId !== undefined ? [loanId] : undefined,
    query: { enabled: loanId !== undefined },
  });
}

export function useNextLoanId() {
  return useReadContract({
    abi: lendingPoolAbi,
    address: VAULT_CONTRACTS.lendingPool,
    functionName: "nextLoanId",
  });
}

export function useAvailableLiquidity() {
  return useReadContract({
    abi: lendingPoolAbi,
    address: VAULT_CONTRACTS.lendingPool,
    functionName: "getAvailableLiquidity",
  });
}

// ---------------------------------------------------------------------------
// FidezaLendingPool writes (Phase 8)
// ---------------------------------------------------------------------------

export function useDeposit() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    deposit: (amount: bigint) =>
      writeContract({ abi: lendingPoolAbi, address: VAULT_CONTRACTS.lendingPool, functionName: "deposit", value: amount }),
    depositAsync: (amount: bigint) =>
      writeContractAsync({ abi: lendingPoolAbi, address: VAULT_CONTRACTS.lendingPool, functionName: "deposit", value: amount }),
  };
}

export function useWithdraw() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    withdraw: (amount: bigint) =>
      writeContract({ abi: lendingPoolAbi, address: VAULT_CONTRACTS.lendingPool, functionName: "withdraw", args: [amount] }),
    withdrawAsync: (amount: bigint) =>
      writeContractAsync({ abi: lendingPoolAbi, address: VAULT_CONTRACTS.lendingPool, functionName: "withdraw", args: [amount] }),
  };
}

export function useBorrow() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    borrow: (collateralToken: Address, portfolioId: Hex, collateralAmount: bigint, borrowAmount: bigint) =>
      writeContract({ abi: lendingPoolAbi, address: VAULT_CONTRACTS.lendingPool, functionName: "borrow", args: [collateralToken, portfolioId, collateralAmount, borrowAmount] }),
    borrowAsync: (collateralToken: Address, portfolioId: Hex, collateralAmount: bigint, borrowAmount: bigint) =>
      writeContractAsync({ abi: lendingPoolAbi, address: VAULT_CONTRACTS.lendingPool, functionName: "borrow", args: [collateralToken, portfolioId, collateralAmount, borrowAmount] }),
  };
}

export function useRepay() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    repay: (loanId: bigint, amount: bigint) =>
      writeContract({ abi: lendingPoolAbi, address: VAULT_CONTRACTS.lendingPool, functionName: "repay", args: [loanId], value: amount }),
    repayAsync: (loanId: bigint, amount: bigint) =>
      writeContractAsync({ abi: lendingPoolAbi, address: VAULT_CONTRACTS.lendingPool, functionName: "repay", args: [loanId], value: amount }),
  };
}

export function useLiquidate() {
  const { writeContract, writeContractAsync, ...rest } = useWriteContract();
  return {
    ...rest,
    liquidate: (loanId: bigint, amount: bigint) =>
      writeContract({ abi: lendingPoolAbi, address: VAULT_CONTRACTS.lendingPool, functionName: "liquidate", args: [loanId], value: amount }),
    liquidateAsync: (loanId: bigint, amount: bigint) =>
      writeContractAsync({ abi: lendingPoolAbi, address: VAULT_CONTRACTS.lendingPool, functionName: "liquidate", args: [loanId], value: amount }),
  };
}
