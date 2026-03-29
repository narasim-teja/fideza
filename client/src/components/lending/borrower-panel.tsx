"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useNextLoanId } from "@/hooks/use-contracts";
import { LoanCard } from "./loan-card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

export function BorrowerPanel() {
  const { data: nextLoanId, isLoading } = useNextLoanId();

  const loanCount = nextLoanId ? Number(nextLoanId) : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="size-4 text-fideza-lavender" />
            <span className="text-sm font-medium">Active Loans</span>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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

        {loanCount === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No active loans. Create a vault portfolio first, then borrow against it.
            </p>
            <Link
              href="/vaults"
              className="inline-flex items-center gap-1.5 text-xs text-fideza-lavender hover:underline font-medium"
            >
              Go to Vaults <ArrowRight className="size-3" />
            </Link>
          </div>
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
