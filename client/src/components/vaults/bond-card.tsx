"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ASSET_TYPE_COLORS, ratingColor } from "@/lib/constants";
import { formatBytes32 } from "@/lib/format";
import { Lock, Info } from "lucide-react";

interface BondInfo {
  assetId: string;
  assetType: string;
  rating: string;
  coupon: string;
  maturity: string;
  currency: string;
  issuerCategory: string;
  riskScore: number;
}

export function BondCard({ bond }: { bond: BondInfo }) {
  const [showRiskInfo, setShowRiskInfo] = useState(false);
  const typeColors = ASSET_TYPE_COLORS[bond.assetType] ?? ASSET_TYPE_COLORS.BOND;
  const rColors = ratingColor(bond.rating);

  const riskTier = bond.riskScore >= 70 ? "A" : bond.riskScore >= 40 ? "B" : "C";
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
        <div className="space-y-1 relative">
          <div className="flex items-center justify-between text-[10px]">
            <button
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onMouseEnter={() => setShowRiskInfo(true)}
              onMouseLeave={() => setShowRiskInfo(false)}
            >
              Risk Score
              <Info className="size-2.5" />
            </button>
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

          {/* Risk info tooltip */}
          {showRiskInfo && (
            <div className="absolute left-0 top-full mt-1 z-10 w-64 p-3 rounded-lg bg-popover border border-border shadow-lg text-[10px] space-y-1.5">
              <p className="font-medium text-xs">How is risk calculated?</p>
              <p className="text-muted-foreground leading-relaxed">
                Starts at 100 and deducts points per failed compliance check.
                Each check has a severity level:
              </p>
              <div className="space-y-0.5 text-muted-foreground">
                <p><span className="text-red-400 font-medium">Critical fail: -30</span> (KYB, sanctions)</p>
                <p><span className="text-yellow-400 font-medium">Major fail: -15</span> (schema, value limits)</p>
                <p><span className="text-foreground font-medium">Minor fail: -5</span> (coupon range, maturity)</p>
              </div>
              <div className="pt-1 border-t border-border space-y-0.5 text-muted-foreground">
                <p><span className="text-emerald-400">Tier A</span> = 70-100 (low risk)</p>
                <p><span className="text-yellow-400">Tier B</span> = 40-69 (moderate risk)</p>
                <p><span className="text-red-400">Tier C</span> = 0-39 (high risk)</p>
              </div>
            </div>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <span className="text-muted-foreground block">Coupon</span>
            <span className="font-medium text-fideza-lime">{bond.coupon}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Maturity</span>
            <span className="font-medium">{bond.maturity}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Currency</span>
            <span className="font-medium">{bond.currency}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
            <Lock className="size-2.5" />
            {formatBytes32(bond.assetId)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
