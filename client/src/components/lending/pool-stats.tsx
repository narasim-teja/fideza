"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useLendingPoolStats } from "@/hooks/use-contracts";
import { formatWei, formatBps } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, BarChart3, Activity } from "lucide-react";

export function PoolStats() {
  const { data, isLoading } = useLendingPoolStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const zero = BigInt(0);
  const [totalDeposited, totalBorrowed, availableLiquidity, utilizationBps] = (data ?? [zero, zero, zero, zero]) as [bigint, bigint, bigint, bigint];

  const stats = [
    { label: "Total Deposited", value: `${formatWei(totalDeposited)} USDr`, icon: Wallet, color: "text-foreground" },
    { label: "Total Borrowed", value: `${formatWei(totalBorrowed)} USDr`, icon: TrendingUp, color: "text-fideza-lavender" },
    { label: "Available", value: `${formatWei(availableLiquidity)} USDr`, icon: BarChart3, color: "text-emerald-400" },
    { label: "Utilization", value: formatBps(utilizationBps), icon: Activity, color: "text-yellow-400" },
    { label: "Lender APY", value: "10.00%", icon: TrendingUp, color: "text-fideza-lime" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <stat.icon className="size-3.5" />
              {stat.label}
            </div>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
