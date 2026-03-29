"use client";

import { use } from "react";
import type { Hex } from "viem";
import { usePortfolioAttestation, useHasValidAttestation } from "@/hooks/use-contracts";
import { useVaultShareToken } from "@/hooks/use-vault-share-token";
import { formatWei, formatBps, formatDiversification } from "@/lib/format";
import { AttestationProof } from "@/components/vaults/attestation-proof";
import { LendingPanel } from "@/components/vaults/lending-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Lock, TrendingUp, BarChart3, Layers, DollarSign } from "lucide-react";
import Link from "next/link";

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId: rawId } = use(params);
  const portfolioId = rawId as Hex;

  const { data: attestation, isLoading } = usePortfolioAttestation(portfolioId);
  const { data: isValid } = useHasValidAttestation(portfolioId);

  // Resolve vault share token for this portfolio (cached or fallback)
  const vaultShareToken = useVaultShareToken(portfolioId);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!attestation) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Link href="/vaults" className="text-muted-foreground hover:text-foreground flex items-center gap-2">
          <ArrowLeft className="size-4" />
          Back to Vaults
        </Link>
        <p className="text-sm text-muted-foreground py-8 text-center">
          No attestation found for this portfolio ID.
        </p>
      </div>
    );
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

  const stats = [
    {
      label: "Total Value",
      value: `${formatWei(a.totalValue)} USDr`,
      icon: DollarSign,
      color: "text-foreground",
    },
    {
      label: "Weighted Yield",
      value: formatBps(a.weightedCouponBps),
      icon: TrendingUp,
      color: "text-fideza-lime",
    },
    {
      label: "Instruments",
      value: `${a.numBonds} bonds`,
      icon: Layers,
      color: "text-foreground",
    },
    {
      label: "Diversification",
      value: formatDiversification(a.diversificationScore),
      icon: BarChart3,
      color: "text-foreground",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/vaults" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Portfolio Detail</h1>
            <Badge variant="outline" className="bg-fideza-lavender/15 text-fideza-lavender border-fideza-lavender/30">
              AI-Constructed
            </Badge>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {portfolioId}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <Lock className="size-3 mr-1" />
          Composition Private — Dark Pool
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <stat.icon className="size-3.5" />
                {stat.label}
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attestation + Lending */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <AttestationProof attestation={a} isValid={isValid ?? false} />
        </div>
        <div className="lg:col-span-2">
          {vaultShareToken ? (
            <LendingPanel
              portfolioId={portfolioId}
              vaultShareToken={vaultShareToken}
              attestedValue={a.totalValue}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center py-4">
                  Share token not resolved. Create a new portfolio to enable borrowing.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
