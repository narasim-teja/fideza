"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useNextLoanId } from "@/hooks/use-contracts";
import { LoanCard } from "./loan-card";
import { BorrowForm } from "./borrow-form";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

export function BorrowerPanel({ preselectedPortfolioId }: { preselectedPortfolioId?: string }) {
  const { data: nextLoanId, isLoading } = useNextLoanId();

  const loanCount = nextLoanId ? Number(nextLoanId) : 0;

  return (
    <div className="space-y-4">
      <BorrowForm preselectedPortfolioId={preselectedPortfolioId} />

      {/* Active Loans */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="size-4 text-fideza-lavender" />
            <span className="text-sm font-medium">Active Loans</span>
            {loanCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fideza-lavender/15 text-fideza-lavender ml-auto">
                {loanCount}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : loanCount === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No active loans yet.
            </p>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: loanCount }).map((_, i) => (
                <LoanCard key={i} loanId={BigInt(i)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
