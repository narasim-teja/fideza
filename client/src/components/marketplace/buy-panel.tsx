"use client";

import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMarketplaceBuy } from "@/hooks/use-contracts";
import { useAssetListings } from "@/hooks/use-asset-listings";
import { formatWei, truncateAddress } from "@/lib/format";
import { TOKEN_TYPE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { ShoppingCart, Loader2 } from "lucide-react";

export function BuyPanel({ assetId }: { assetId: Hex }) {
  const { address } = useAccount();
  const { listings, isLoading } = useAssetListings(assetId);
  const { buyAsync, isPending } = useMarketplaceBuy();

  async function handleBuy(listingId: bigint, price: bigint) {
    if (!address) return;
    try {
      toast.loading("Purchasing...");
      await buyAsync(listingId, price);
      toast.success("Purchase successful");
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 100) || "Purchase failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShoppingCart className="size-4 text-primary" />
          Active Listings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : !listings || listings.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No active listings for this asset
          </p>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => (
              <div key={listing.listingId.toString()} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{TOKEN_TYPE_LABELS[listing.tokenType] ?? "Unknown"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatWei(listing.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{formatWei(listing.price)} USDr</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Seller</span>
                  <span className="font-mono text-[11px]">{truncateAddress(listing.seller)}</span>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleBuy(listing.listingId, listing.price)}
                  disabled={!address || isPending || listing.seller === address}
                >
                  {isPending ? "Buying..." : `Buy for ${formatWei(listing.price)} USDr`}
                </Button>
                <Separator />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
