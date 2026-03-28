"use client";

import { useState } from "react";
import { BondCatalog } from "@/components/vaults/bond-catalog";
import { PortfolioList } from "@/components/vaults/portfolio-list";
import { cn } from "@/lib/utils";

const TABS = ["Bond Catalog", "My Portfolios"] as const;

export default function VaultsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Bond Catalog");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vault Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse AI-rated debt instruments and manage dark pool portfolios
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "text-fideza-lavender border-fideza-lavender"
                : "text-muted-foreground border-transparent hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Bond Catalog" ? <BondCatalog /> : <PortfolioList />}
    </div>
  );
}
