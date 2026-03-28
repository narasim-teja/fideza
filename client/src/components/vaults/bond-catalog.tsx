"use client";

import { useState } from "react";
import { useBondCatalog } from "@/hooks/use-contracts";
import { BondCard } from "./bond-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TYPE_FILTERS = ["All", "BOND", "INVOICE", "ABS_TRANCHE"] as const;
const GRADE_FILTERS = ["All", "Investment Grade", "High Yield"] as const;

// Investment grade: AAA through BBB-
const INVESTMENT_GRADE = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-"];

export function BondCatalog() {
  const { data: bonds, isLoading } = useBondCatalog();
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [gradeFilter, setGradeFilter] = useState<string>("All");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const allBonds = (bonds ?? []) as Array<{
    assetId: string;
    assetType: string;
    rating: string;
    couponRange: string;
    maturityBucket: string;
    currency: string;
    issuerCategory: string;
    hasCollateral: boolean;
    riskScore: number;
  }>;

  const filtered = allBonds.filter((b) => {
    if (typeFilter !== "All" && b.assetType !== typeFilter) return false;
    if (gradeFilter === "Investment Grade" && !INVESTMENT_GRADE.includes(b.rating)) return false;
    if (gradeFilter === "High Yield" && INVESTMENT_GRADE.includes(b.rating)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full border transition-colors",
                typeFilter === f
                  ? "bg-fideza-lavender/15 text-fideza-lavender border-fideza-lavender/30"
                  : "text-muted-foreground border-border hover:border-muted-foreground/30",
              )}
            >
              {f === "ABS_TRANCHE" ? "ABS" : f === "All" ? "All Types" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-border" />
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
        <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">
          {filtered.length} instrument{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No instruments match filters</p>
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
