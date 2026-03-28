"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNextLoanId } from "@/hooks/use-contracts";
import { LoanCard } from "./loan-card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

export function BorrowerPanel() {
  const { data: nextLoanId, isLoading } = useNextLoanId();

  const loanCount = nextLoanId ? Number(nextLoanId) : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4" />
            Active Loans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="size-4 text-fideza-lavender" />
          Active Loans
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loanCount === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No loans yet. Borrow USDr against your vault shares from a portfolio detail page.
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
  );
}
