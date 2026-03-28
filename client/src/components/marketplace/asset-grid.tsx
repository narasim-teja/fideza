"use client";

import { useReadContracts } from "wagmi";
import { useAllReceiptIds, useReceiptsByType } from "@/hooks/use-contracts";
import { CONTRACTS, receiptTokenFactoryAbi } from "@/lib/contracts";
import { AssetCard } from "./asset-card";
import { LoadingCard } from "./loading-card";
import type { Hex } from "viem";

const ASSET_TYPES = ["INVOICE", "BOND", "ABS_TRANCHE"];

export function AssetGrid({ assetType }: { assetType: string }) {
  const isAll = assetType === "all";

  // For "all" tab: fetch IDs for each type in parallel via multicall
  const typeIdCalls = ASSET_TYPES.map((t) => ({
    abi: receiptTokenFactoryAbi,
    address: CONTRACTS.receiptTokenFactory,
    functionName: "getReceiptsByType" as const,
    args: [t] as const,
  }));

  const { data: allTypeResults, isLoading: allTypesLoading } = useReadContracts({
    contracts: typeIdCalls,
    query: { enabled: isAll },
  });

  // For specific type tab: single call
  const { data: typedIds, isLoading: typedLoading } = useReceiptsByType(assetType);

  // Resolve IDs
  let ids: readonly Hex[] | undefined;
  let idsLoading: boolean;

  if (isAll) {
    idsLoading = allTypesLoading;
    if (allTypeResults) {
      const combined: Hex[] = [];
      for (const result of allTypeResults) {
        if (result.status === "success" && Array.isArray(result.result)) {
          combined.push(...(result.result as Hex[]));
        }
      }
      ids = combined;
    }
  } else {
    idsLoading = typedLoading;
    ids = typedIds as Hex[] | undefined;
  }

  // Batch-read all receipt data in one multicall
  const receiptCalls = (ids ?? []).map((id) => ({
    abi: receiptTokenFactoryAbi,
    address: CONTRACTS.receiptTokenFactory,
    functionName: "getReceipt" as const,
    args: [id] as const,
  }));

  const { data: receiptResults, isLoading: receiptsLoading } = useReadContracts({
    contracts: receiptCalls,
    query: { enabled: !!ids && ids.length > 0 },
  });

  const loading = idsLoading || receiptsLoading;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
    );
  }

  if (!ids || ids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">No assets found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ids.map((id, i) => {
        const result = receiptResults?.[i];
        const receipt =
          result?.status === "success" ? (result.result as ReceiptData) : undefined;
        return <AssetCard key={id} assetId={id} receipt={receipt} />;
      })}
    </div>
  );
}

type ReceiptData = {
  assetId: Hex;
  mirrorTokenAddress: string;
  assetType: string;
  disclosureJSON: string;
  complianceReportHash: string;
  policyVersionHash: string;
  governanceApprovalTx: string;
  maturityTimestamp: bigint;
  principalValue: bigint;
  expectedYieldValue: bigint;
};
