"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BondCatalog } from "@/components/vaults/bond-catalog";
import { PortfolioList } from "@/components/vaults/portfolio-list";
import { cn } from "@/lib/utils";
import { BarChart3, Briefcase } from "lucide-react";

const TABS = [
  { key: "catalog", label: "Bond Catalog", icon: BarChart3 },
  { key: "portfolios", label: "My Portfolios", icon: Briefcase },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function VaultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: TabKey = raw === "portfolios" ? "portfolios" : "catalog";

  const setTab = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`?${params.toString()}`);
  };

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
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "text-fideza-lavender border-fideza-lavender"
                : "text-muted-foreground border-transparent hover:text-foreground",
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "catalog" ? <BondCatalog /> : <PortfolioList />}
    </div>
  );
}
