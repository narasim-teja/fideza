"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ASSET_TYPE_COLORS } from "@/lib/constants";
import { ratingColor } from "@/lib/constants";
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
  const riskColors =
    riskTier === "A"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
      : riskTier === "B"
        ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
        : "bg-red-500/15 text-red-400 border-red-500/20";

  return (
    <Card className="bg-card border-border hover:ring-1 hover:ring-primary/30 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={`${typeColors.bg} ${typeColors.text} ${typeColors.border} text-xs`}
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
        <p className="text-sm text-muted-foreground truncate mt-1">{bond.issuerCategory}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Coupon</span>
            <p className="font-medium text-fideza-lime">{bond.couponRange}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Maturity</span>
            <p className="font-medium">{bond.maturityBucket}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Currency</span>
            <p className="font-medium">{bond.currency}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Risk Score</span>
            <p className={`font-medium`}>
              <span className={riskColors.split(" ")[1]}>{bond.riskScore}</span>
              <span className="text-muted-foreground"> ({riskTier})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-border">
          {bond.hasCollateral && (
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              <Shield className="size-3" />
              Collateralized
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Lock className="size-3" />
            {formatBytes32(bond.assetId)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
