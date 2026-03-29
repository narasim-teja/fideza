"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ASSET_TYPE_COLORS, ratingColor } from "@/lib/constants";
import { formatBytes32 } from "@/lib/format";
import { Shield, Lock } from "lucide-react";

interface BondInfo {
  assetId: string;
  assetType: string;
  rating: string;
  couponRange: string;
  maturityBucket: string;
  currency: string;
  issuerCategory: string;
  hasCollateral: boolean;
  riskScore: number;
}

export function BondCard({ bond }: { bond: BondInfo }) {
  const typeColors = ASSET_TYPE_COLORS[bond.assetType] ?? ASSET_TYPE_COLORS.BOND;
  const rColors = ratingColor(bond.rating);

  const riskTier = bond.riskScore >= 80 ? "A" : bond.riskScore >= 60 ? "B" : "C";
  const riskBarColor =
    riskTier === "A"
      ? "bg-emerald-400"
      : riskTier === "B"
        ? "bg-yellow-400"
        : "bg-red-400";
  const riskTextColor =
    riskTier === "A"
      ? "text-emerald-400"
      : riskTier === "B"
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <Card className="bg-card border-border hover:ring-1 hover:ring-primary/30 transition-all group">
      <CardContent className="pt-5 pb-4 space-y-3">
        {/* Header: type + rating */}
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={`${typeColors.bg} ${typeColors.text} ${typeColors.border} text-[10px]`}
          >
            {bond.assetType === "ABS_TRANCHE" ? "ABS Tranche" : bond.assetType.charAt(0) + bond.assetType.slice(1).toLowerCase()}
          </Badge>
          <Badge
            variant="outline"
            className={`${rColors.bg} ${rColors.text} ${rColors.border} text-xs font-bold`}
          >
            {bond.rating}
          </Badge>
        </div>

        {/* Issuer category */}
        <p className="text-sm font-medium truncate">{bond.issuerCategory}</p>

        {/* Risk bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Risk Score</span>
            <span className={`font-semibold ${riskTextColor}`}>
              {bond.riskScore} <span className="text-muted-foreground font-normal">/ 100</span>
            </span>
          </div>
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${riskBarColor} transition-all`}
              style={{ width: `${bond.riskScore}%` }}
            />
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <span className="text-muted-foreground block">Coupon</span>
            <span className="font-medium text-fideza-lime">{bond.couponRange}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Maturity</span>
            <span className="font-medium">{bond.maturityBucket}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Currency</span>
            <span className="font-medium">{bond.currency}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {bond.hasCollateral && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Shield className="size-2.5" />
              Collateralized
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
            <Lock className="size-2.5" />
            {formatBytes32(bond.assetId)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
