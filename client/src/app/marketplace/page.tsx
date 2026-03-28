"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AssetGrid } from "@/components/marketplace/asset-grid";
import { ShieldCheck } from "lucide-react";

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Browse AI-verified, privacy-preserving RWA receipt tokens. Split into PT/YT for structured trading.
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList variant="line">
          <TabsTrigger value="all">All Assets</TabsTrigger>
          <TabsTrigger value="INVOICE">Invoices</TabsTrigger>
          <TabsTrigger value="BOND">Bonds</TabsTrigger>
          <TabsTrigger value="ABS_TRANCHE">ABS Tranches</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <AssetGrid assetType="all" />
        </TabsContent>
        <TabsContent value="INVOICE" className="mt-4">
          <AssetGrid assetType="INVOICE" />
        </TabsContent>
        <TabsContent value="BOND" className="mt-4">
          <AssetGrid assetType="BOND" />
        </TabsContent>
        <TabsContent value="ABS_TRANCHE" className="mt-4">
          <AssetGrid assetType="ABS_TRANCHE" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
