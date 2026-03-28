"use client";

import Link from "next/link";
import type { Hex } from "viem";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useReceipt } from "@/hooks/use-contracts";
import { AssetTypeBadge } from "./asset-type-badge";
import { RiskBadge } from "./risk-badge";
import { LoadingCard } from "./loading-card";
import { parseDisclosure, formatWei, timeToMaturity } from "@/lib/format";
import { Clock, ArrowRight } from "lucide-react";

const KEY_FIELDS: Record<string, string[]> = {
  INVOICE: ["currency", "maturityBucket", "debtorCreditTier", "recourseType"],
  BOND: ["issuerCategory", "seniority", "couponRange", "creditTier"],
  ABS_TRANCHE: ["poolType", "trancheSeniority", "avgCreditScoreRange", "delinquencyRateBucket"],
};

const FIELD_LABELS: Record<string, string> = {
  currency: "Currency",
  maturityBucket: "Maturity",
  debtorCreditTier: "Credit Tier",
  recourseType: "Recourse",
  issuerCategory: "Issuer",
  seniority: "Seniority",
  couponRange: "Coupon",
  creditTier: "Credit Tier",
  poolType: "Pool Type",
  trancheSeniority: "Tranche",
  avgCreditScoreRange: "Avg Credit",
  delinquencyRateBucket: "Delinquency",
};

export function AssetCard({ assetId }: { assetId: Hex }) {
  const { data: receipt, isLoading } = useReceipt(assetId);

  if (isLoading) return <LoadingCard />;
  if (!receipt) return null;

  const disclosure = parseDisclosure(receipt.disclosureJSON);
  const assetType = receipt.assetType;
  const fields = KEY_FIELDS[assetType] ?? KEY_FIELDS.INVOICE;
  const riskScore = disclosure?.riskScore as number | undefined;

  return (
    <Link href={`/marketplace/${assetId}`}>
      <Card className="h-full hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between">
            <AssetTypeBadge type={assetType} />
            {riskScore != null && <RiskBadge score={riskScore} />}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Clock className="size-3" />
            {timeToMaturity(receipt.maturityTimestamp)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {fields.map((field) => {
              const value = disclosure?.[field];
              if (value == null) return null;
              return (
                <div key={field}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {FIELD_LABELS[field] ?? field}
                  </p>
                  <p className="text-xs font-medium truncate">
                    {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                  </p>
                </div>
              );
            })}
          </div>
          <Separator />
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-muted-foreground">Principal </span>
              <span className="font-medium">{formatWei(receipt.principalValue)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Yield </span>
              <span className="font-medium text-fideza-lime">{formatWei(receipt.expectedYieldValue)}</span>
            </div>
          </div>
          <div className="flex items-center justify-end text-xs text-primary gap-1">
            View details <ArrowRight className="size-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
