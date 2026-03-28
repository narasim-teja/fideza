"use client";

import { PoolStats } from "@/components/lending/pool-stats";
import { LenderPanel } from "@/components/lending/lender-panel";
import { BorrowerPanel } from "@/components/lending/borrower-panel";

export default function LendingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lending Pool</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deposit USDr to earn yield, or borrow against AI-attested vault share positions
        </p>
      </div>

      <PoolStats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LenderPanel />
        <BorrowerPanel />
      </div>
    </div>
  );
}
