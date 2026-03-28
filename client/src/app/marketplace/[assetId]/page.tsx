"use client";

import { use } from "react";
import type { Hex } from "viem";
import { useReceiptData } from "@/hooks/use-receipt-data";
import { AssetTypeBadge } from "@/components/marketplace/asset-type-badge";
import { RiskBadge } from "@/components/marketplace/risk-badge";
import { DisclosurePanel } from "@/components/marketplace/disclosure-panel";
import { ProvenanceChain } from "@/components/marketplace/provenance-chain";
import { PTYTPanel } from "@/components/marketplace/ptyt-panel";
import { BuyPanel } from "@/components/marketplace/buy-panel";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatWei, formatTimestamp, timeToMaturity, formatBytes32 } from "@/lib/format";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId: rawAssetId } = use(params);
  const assetId = rawAssetId as Hex;
  const { receipt, split, disclosure, isLoading } = useReceiptData(assetId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!receipt.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">Asset not found</p>
        <Link href="/marketplace" className="text-xs text-primary mt-2 hover:underline">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const r = receipt.data;
  const riskScore = disclosure?.riskScore as number | undefined;

  return (
    <div className="space-y-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3" />
        Back to marketplace
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <AssetTypeBadge type={r.assetType} />
        {riskScore != null && <RiskBadge score={riskScore} />}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {timeToMaturity(r.maturityTimestamp)}
        </div>
        <code className="text-xs font-mono text-muted-foreground ml-auto">
          {formatBytes32(assetId)}
        </code>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox label="Principal Value" value={formatWei(r.principalValue)} />
        <StatBox label="Expected Yield" value={formatWei(r.expectedYieldValue)} accent />
        <StatBox label="Maturity" value={formatTimestamp(r.maturityTimestamp)} />
        <StatBox
          label="Mirror Token"
          value={r.mirrorTokenAddress.slice(0, 10) + "..."}
          mono
        />
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DisclosurePanel disclosure={disclosure} />
          <ProvenanceChain
            complianceReportHash={r.complianceReportHash}
            policyVersionHash={r.policyVersionHash}
            governanceApprovalTx={r.governanceApprovalTx}
          />
        </div>
        <div className="space-y-6">
          {split.data && (
            <PTYTPanel assetId={assetId} split={split.data} />
          )}
          <BuyPanel assetId={assetId} />
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`text-sm font-semibold mt-1 ${accent ? "text-fideza-lime" : ""} ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
