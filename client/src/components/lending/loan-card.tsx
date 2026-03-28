"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLoan, useLoanDebt, useCollateralRatio, useRepay, useLiquidate } from "@/hooks/use-contracts";
import { formatWei, formatCollateralRatio, collateralRatioStatus, truncateAddress } from "@/lib/format";
import { LENDING_CONSTANTS } from "@/lib/constants";
import { toast } from "sonner";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";

export function LoanCard({ loanId }: { loanId: bigint }) {
  const { address } = useAccount();
  const { data: loan } = useLoan(loanId);
  const { data: debt } = useLoanDebt(loanId);
  const { data: ratio } = useCollateralRatio(loanId);
  const { repayAsync } = useRepay();
  const { liquidateAsync } = useLiquidate();
  const [isPending, setIsPending] = useState(false);

  if (!loan) return null;

  const [borrower, collateralToken, portfolioId, collateralAmount, principal, startTime, active] =
    loan as [string, string, string, bigint, bigint, bigint, boolean];

  if (!active) return null;

  const ratioNum = ratio ? Number(ratio) : 0;
  const status = collateralRatioStatus(ratioNum);
  const isOwner = address?.toLowerCase() === borrower.toLowerCase();
  const canLiquidate = ratioNum > 0 && ratioNum < LENDING_CONSTANTS.liquidationThresholdBps;

  async function handleRepay() {
    if (!debt) return;
    setIsPending(true);
    const id = toast.loading("Repaying loan...");
    try {
      await repayAsync(loanId, debt);
      toast.success("Loan repaid!", { id });
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100) ?? "Repay failed", { id });
    } finally {
      setIsPending(false);
    }
  }

  async function handleLiquidate() {
    if (!debt) return;
    setIsPending(true);
    const id = toast.loading("Liquidating loan...");
    try {
      await liquidateAsync(loanId, debt);
      toast.success("Loan liquidated!", { id });
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100) ?? "Liquidation failed", { id });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="bg-card">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Loan #{loanId.toString()}</span>
          <Badge
            variant="outline"
            className={
              status === "healthy"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                : status === "warning"
                  ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
                  : "bg-red-500/15 text-red-400 border-red-500/20"
            }
          >
            {formatCollateralRatio(ratioNum)}
          </Badge>
        </div>

        {/* Health bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              status === "healthy"
                ? "bg-emerald-500"
                : status === "warning"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, (ratioNum / 200_00) * 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Principal</span>
            <p className="font-medium">{formatWei(principal)} USDr</p>
          </div>
          <div>
            <span className="text-muted-foreground">Current Debt</span>
            <p className="font-medium text-fideza-lime">{debt ? formatWei(debt) : "..."} USDr</p>
          </div>
          <div>
            <span className="text-muted-foreground">Collateral</span>
            <p className="font-medium">{formatWei(collateralAmount)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Borrower</span>
            <p className="font-mono">{truncateAddress(borrower)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {isOwner && (
            <Button
              size="sm"
              onClick={handleRepay}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? <Loader2 className="size-3 animate-spin" /> : "Repay"}
            </Button>
          )}
          {canLiquidate && !isOwner && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleLiquidate}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? <Loader2 className="size-3 animate-spin" /> : "Liquidate"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
