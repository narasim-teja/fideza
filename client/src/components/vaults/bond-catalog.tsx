"use client";

import { useState } from "react";
import { BondCard } from "./bond-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search, ArrowUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useBondCatalog } from "@/hooks/use-contracts";

const GRADE_FILTERS = ["All", "Investment Grade", "High Yield"] as const;
const SORT_OPTIONS = ["Rating", "Risk Score", "Coupon"] as const;

const INVESTMENT_GRADE = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-"];

const RATING_ORDER = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-", "B+", "B", "B-", "CCC"];

export function BondCatalog() {
  const [gradeFilter, setGradeFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("Rating");

  const { data: onChainBonds, isLoading } = useBondCatalog();

  // Map on-chain struct to UI shape
  const allBonds = ((onChainBonds as any[]) ?? []).map((b) => ({
    assetId: b.assetId as string,
    assetType: b.assetType as string,
    rating: b.rating as string,
    coupon: b.couponRange as string,
    maturity: b.maturityBucket as string,
    currency: b.currency as string,
    issuerCategory: b.issuerCategory as string,
    riskScore: Number(b.riskScore),
  }));

  const filtered = allBonds
    .filter((b) => {
      if (gradeFilter === "Investment Grade" && !INVESTMENT_GRADE.includes(b.rating)) return false;
      if (gradeFilter === "High Yield" && INVESTMENT_GRADE.includes(b.rating)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.issuerCategory.toLowerCase().includes(q) ||
          b.rating.toLowerCase().includes(q) ||
          b.currency.toLowerCase().includes(q) ||
          b.assetType.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "Risk Score") return b.riskScore - a.riskScore;
      if (sortBy === "Coupon") {
        return parseFloat(b.coupon) - parseFloat(a.coupon);
      }
      // Rating (best first)
      return RATING_ORDER.indexOf(a.rating) - RATING_ORDER.indexOf(b.rating);
    });

  // Summary stats
  const igCount = allBonds.filter((b) => INVESTMENT_GRADE.includes(b.rating)).length;
  const hyCount = allBonds.length - igCount;
  const avgRisk = allBonds.length > 0 ? Math.round(allBonds.reduce((s, b) => s + b.riskScore, 0) / allBonds.length) : 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>{allBonds.length} bonds</span>
        <span>{igCount} investment grade</span>
        <span>{hyCount} high yield</span>
        <span>Avg risk score <strong className="text-foreground">{avgRisk}</strong></span>
        <Link
          href="/vaults/create"
          className="ml-auto flex items-center gap-1 text-fideza-lavender hover:underline font-medium"
        >
          <Plus className="size-3" /> Create Portfolio
        </Link>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {GRADE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setGradeFilter(f)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full border transition-colors",
                gradeFilter === f
                  ? "bg-fideza-lavender/15 text-fideza-lavender border-fideza-lavender/30"
                  : "text-muted-foreground border-border hover:border-muted-foreground/30",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="size-3 text-muted-foreground" />
          {SORT_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                "px-2 py-0.5 text-[11px] font-medium rounded transition-colors",
                sortBy === s
                  ? "text-fideza-lavender bg-fideza-lavender/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-7 w-48 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No bonds match filters</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((bond) => (
            <BondCard key={bond.assetId} bond={bond} />
          ))}
        </div>
      )}
    </div>
  );
}
