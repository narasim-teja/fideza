"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Hex } from "viem";
import { VAULT_CONTRACTS, portfolioAttestationAbi } from "@/lib/contracts";
import { PortfolioCard } from "./portfolio-card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Plus } from "lucide-react";

export function PortfolioList() {
  const publicClient = usePublicClient();
  const [portfolioIds, setPortfolioIds] = useState<Hex[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicClient) return;

    async function fetchPortfolioIds() {
      try {
        const logs = await publicClient!.getContractEvents({
          address: VAULT_CONTRACTS.portfolioAttestation,
          abi: portfolioAttestationAbi,
          eventName: "AttestationSubmitted",
          fromBlock: BigInt(0),
          toBlock: "latest",
        });

        const ids = logs.map((log) => (log.args as { portfolioId: Hex }).portfolioId);
        // Deduplicate
        setPortfolioIds([...new Set(ids)]);
      } catch (e) {
        console.error("Failed to fetch portfolio IDs:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolioIds();
  }, [publicClient]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {portfolioIds.map((id) => (
          <PortfolioCard key={id} portfolioId={id} />
        ))}

        <Link href="/vaults/create">
          <div className="h-full min-h-[14rem] rounded-xl border-2 border-dashed border-border hover:border-fideza-lavender/40 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-fideza-lavender transition-colors cursor-pointer">
            <Plus className="size-8" />
            <span className="text-sm font-medium">Create Portfolio</span>
            <span className="text-xs">AI-constructed from rated bonds</span>
          </div>
        </Link>
      </div>

      {portfolioIds.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No portfolios yet. Create your first AI-constructed portfolio.
        </p>
      )}
    </div>
  );
}
