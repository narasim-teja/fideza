"use client";

import { useState } from "react";
import { BondCard } from "./bond-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, ArrowUpDown, Plus } from "lucide-react";
import Link from "next/link";

const TYPE_FILTERS = ["All", "BOND", "INVOICE", "ABS_TRANCHE"] as const;
const GRADE_FILTERS = ["All", "Investment Grade", "High Yield"] as const;
const SORT_OPTIONS = ["Rating", "Risk Score", "Coupon"] as const;

const INVESTMENT_GRADE = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-"];

const RATING_ORDER = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-", "B+", "B", "B-", "CCC"];

const BOND_CATALOG = [
  { assetId: "0xb6b7c9bd65da", assetType: "BOND", rating: "BB+", couponRange: "7-9%", maturityBucket: "5-10 years", currency: "USD", issuerCategory: "BR Energy/Utilities, High Yield", hasCollateral: false, riskScore: 55 },
  { assetId: "0xdc5f3233554c", assetType: "INVOICE", rating: "BBB+", couponRange: "1-2%", maturityBucket: "0-2 years", currency: "BRL", issuerCategory: "BR Construction, Investment Grade", hasCollateral: false, riskScore: 72 },
  { assetId: "0xa795beaafc8", assetType: "ABS_TRANCHE", rating: "A", couponRange: "3-4%", maturityBucket: "2-5 years", currency: "BRL", issuerCategory: "BR Auto Loans, Investment Grade", hasCollateral: true, riskScore: 82 },
  { assetId: "0xee8ea20be48e", assetType: "BOND", rating: "BBB", couponRange: "5-6%", maturityBucket: "2-5 years", currency: "USD", issuerCategory: "BR Telecom, Investment Grade", hasCollateral: false, riskScore: 68 },
  { assetId: "0x61fb06d5fc60", assetType: "BOND", rating: "A-", couponRange: "4-5%", maturityBucket: "5-10 years", currency: "BRL", issuerCategory: "BR Infrastructure, Investment Grade", hasCollateral: true, riskScore: 80 },
  { assetId: "0xaa6c49eae34f", assetType: "INVOICE", rating: "BBB", couponRange: "2-3%", maturityBucket: "0-2 years", currency: "BRL", issuerCategory: "BR Agriculture, Investment Grade", hasCollateral: false, riskScore: 65 },
  { assetId: "0x4de93f1c5fe3", assetType: "ABS_TRANCHE", rating: "AA-", couponRange: "2-3%", maturityBucket: "5-10 years", currency: "BRL", issuerCategory: "BR Mortgages, Investment Grade", hasCollateral: true, riskScore: 90 },
  { assetId: "0xfd0cffe1b904", assetType: "BOND", rating: "BB", couponRange: "8-10%", maturityBucket: "2-5 years", currency: "USD", issuerCategory: "BR Banking, High Yield", hasCollateral: false, riskScore: 48 },
  { assetId: "0xac5cd22ba21a", assetType: "INVOICE", rating: "A", couponRange: "1-2%", maturityBucket: "0-2 years", currency: "BRL", issuerCategory: "BR Technology, Investment Grade", hasCollateral: false, riskScore: 85 },
  { assetId: "0x4504efc3a747", assetType: "ABS_TRANCHE", rating: "BBB+", couponRange: "4-5%", maturityBucket: "2-5 years", currency: "BRL", issuerCategory: "BR Consumer Credit, Investment Grade", hasCollateral: true, riskScore: 70 },
  { assetId: "0x7c3d9f12e5b8", assetType: "BOND", rating: "B+", couponRange: "9-12%", maturityBucket: "5-10 years", currency: "USD", issuerCategory: "BR Mining, High Yield", hasCollateral: true, riskScore: 38 },
  { assetId: "0x9e2a4b7d3c1f", assetType: "BOND", rating: "BBB-", couponRange: "5-7%", maturityBucket: "2-5 years", currency: "BRL", issuerCategory: "BR Retail, Investment Grade", hasCollateral: false, riskScore: 62 },
];

export function BondCatalog() {
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [gradeFilter, setGradeFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("Rating");

  const allBonds = BOND_CATALOG;

  const filtered = allBonds
    .filter((b) => {
      if (typeFilter !== "All" && b.assetType !== typeFilter) return false;
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
        const getMax = (r: string) => {
          const match = r.match(/(\d+)/g);
          return match ? parseInt(match[match.length - 1]) : 0;
        };
        return getMax(b.couponRange) - getMax(a.couponRange);
      }
      // Rating (best first)
      return RATING_ORDER.indexOf(a.rating) - RATING_ORDER.indexOf(b.rating);
    });

  // Summary stats
  const bondCount = allBonds.filter((b) => b.assetType === "BOND").length;
  const invoiceCount = allBonds.filter((b) => b.assetType === "INVOICE").length;
  const absCount = allBonds.filter((b) => b.assetType === "ABS_TRANCHE").length;
  const avgRisk = allBonds.length > 0 ? Math.round(allBonds.reduce((s, b) => s + b.riskScore, 0) / allBonds.length) : 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>{allBonds.length} instruments</span>
        <span>{bondCount} bonds</span>
        <span>{invoiceCount} invoices</span>
        <span>{absCount} ABS</span>
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
