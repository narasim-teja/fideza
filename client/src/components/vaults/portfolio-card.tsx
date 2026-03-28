"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortfolioAttestation } from "@/hooks/use-contracts";
import { formatWei, formatBps, formatDiversification, formatTimestamp } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, TrendingUp, BarChart3, ShieldCheck } from "lucide-react";
import type { Hex } from "viem";

export function PortfolioCard({ portfolioId }: { portfolioId: Hex }) {
  const { data: attestation, isLoading } = usePortfolioAttestation(portfolioId);

  if (isLoading) {
    return <Skeleton className="h-56 rounded-xl" />;
  }

  if (!attestation) {
    return null;
  }

  const a = attestation as {
    portfolioId: Hex;
    totalValue: bigint;
    weightedCouponBps: bigint;
    numBonds: number;
    diversificationScore: number;
    methodologyHash: Hex;
    agentSignature: Hex;
    timestamp: bigint;
  };

  return (
    <Link href={`/vaults/${portfolioId}`}>
      <Card className="bg-card border-border hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-fideza-lavender/15 text-fideza-lavender border-fideza-lavender/30 text-xs">
                AI Portfolio
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">
                <ShieldCheck className="size-3 mr-1" />
                Attested
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3" />
              Dark Pool
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="size-3" /> Weighted Yield
              </span>
              <p className="font-semibold text-fideza-lime">{formatBps(a.weightedCouponBps)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <BarChart3 className="size-3" /> Diversification
              </span>
              <p className="font-semibold">{formatDiversification(a.diversificationScore)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total Value</span>
              <p className="font-semibold">{formatWei(a.totalValue)} USDr</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Bonds</span>
              <p className="font-semibold">{a.numBonds} instruments</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-t border-border pt-2">
            Attested {formatTimestamp(a.timestamp)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
