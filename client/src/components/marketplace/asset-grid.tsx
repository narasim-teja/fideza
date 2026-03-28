"use client";

import { useAllReceiptIds, useReceiptsByType } from "@/hooks/use-contracts";
import { AssetCard } from "./asset-card";
import { LoadingCard } from "./loading-card";
import type { Hex } from "viem";

export function AssetGrid({ assetType }: { assetType: string }) {
  const allIds = useAllReceiptIds();
  const typedIds = useReceiptsByType(assetType);

  const isAll = assetType === "all";
  const { data: ids, isLoading } = isAll ? allIds : typedIds;

  if (isLoading) {
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
      {ids.map((id) => (
        <AssetCard key={id} assetId={id as Hex} />
      ))}
    </div>
  );
}
