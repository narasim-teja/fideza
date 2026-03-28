"use client";

import { useReadContracts } from "wagmi";
import type { Hex } from "viem";
import { useActiveListings } from "./use-contracts";
import { CONTRACTS, marketplaceAbi } from "@/lib/contracts";

export function useAssetListings(assetId?: Hex) {
  const { data: listingIds, isLoading: idsLoading } = useActiveListings();

  const contracts = (listingIds ?? []).map((id) => ({
    abi: marketplaceAbi,
    address: CONTRACTS.marketplace,
    functionName: "getListingWithMetadata" as const,
    args: [id] as const,
  }));

  const { data: results, isLoading: metaLoading } = useReadContracts({
    contracts,
    query: { enabled: !!listingIds?.length },
  });

  const listings = (listingIds ?? [])
    .map((id, i) => {
      const result = results?.[i];
      if (!result || result.status !== "success") return null;
      const [listing, metadata] = result.result as [
        { token: string; amount: bigint; price: bigint; active: boolean; seller: string },
        { assetId: Hex; tokenType: number; disclosureURI: string; complianceReportHash: Hex },
      ];
      if (!listing.active) return null;
      if (assetId && metadata.assetId !== assetId) return null;
      return { listingId: id, ...listing, ...metadata };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return {
    listings,
    isLoading: idsLoading || metaLoading,
  };
}
