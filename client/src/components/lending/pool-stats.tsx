"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useLendingPoolStats } from "@/hooks/use-contracts";
import { formatWei } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export function PoolStats() {
  const { data, isLoading } = useLendingPoolStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const zero = BigInt(0);
  const [totalDeposited, totalBorrowed, availableLiquidity, utilizationBps] = (data ?? [zero, zero, zero, zero]) as [bigint, bigint, bigint, bigint];

  const utilization = Number(utilizationBps) / 100;
  const effectiveAPY = (10 * Number(utilizationBps)) / 10000;

  return (
    <div className="space-y-4">
      {/* Main metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Deposited"
          value={`${formatWei(totalDeposited)} USDr`}
          color="text-foreground"
        />
        <MetricCard
          label="Total Borrowed"
          value={`${formatWei(totalBorrowed)} USDr`}
          color="text-fideza-lavender"
        />
        <MetricCard
          label="Available Liquidity"
          value={`${formatWei(availableLiquidity)} USDr`}
          color="text-emerald-400"
        />
        <MetricCard
          label="Effective Lender APY"
          value={`${effectiveAPY.toFixed(2)}%`}
          sub={`${utilization.toFixed(1)}% utilization - Base 10%`}
          color="text-fideza-lime"
        />
      </div>

      {/* Utilization bar */}
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">Pool Utilization</span>
          <span className="font-medium">{utilization.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-linear-to-r from-fideza-lavender to-fideza-lime transition-all duration-500"
            style={{ width: `${Math.min(100, utilization)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
          <span>0%</span>
          <span>Optimal 60-80%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color }: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}
