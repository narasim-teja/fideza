"use client";

import type { Hex } from "viem";
import { useAllPortfolioIds } from "@/hooks/use-contracts";
import { PortfolioCard } from "./portfolio-card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Plus } from "lucide-react";

export function PortfolioList() {
  const { data, isLoading } = useAllPortfolioIds();
  const portfolioIds = (data ?? []) as Hex[];

  if (isLoading) {
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
          <div className="h-full min-h-56 rounded-xl border-2 border-dashed border-border hover:border-fideza-lavender/40 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-fideza-lavender transition-colors cursor-pointer">
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
