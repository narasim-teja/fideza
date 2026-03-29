"use client";

import { PoolStats } from "@/components/lending/pool-stats";
import { LenderPanel } from "@/components/lending/lender-panel";
import { BorrowerPanel } from "@/components/lending/borrower-panel";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wallet,
  ArrowDownToLine,
  Shield,
  Banknote,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  {
    icon: Wallet,
    title: "Create a Vault",
    desc: "Build an AI-constructed bond portfolio. The agent selects, deploys, and attests the composition on-chain.",
  },
  {
    icon: ArrowDownToLine,
    title: "Deposit as Lender",
    desc: "Deposit USDr into the pool to earn yield. Your effective APY scales with pool utilization.",
  },
  {
    icon: Shield,
    title: "Collateralize & Borrow",
    desc: "Borrowers post AI-attested vault shares as collateral (150% ratio) and borrow USDr from the pool.",
  },
  {
    icon: Banknote,
    title: "Repay or Liquidate",
    desc: "Borrowers repay principal + 10% interest. If collateral drops below 120%, anyone can liquidate for a 5% bonus.",
  },
];

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

      {/* How it works */}
      <Card>
        <CardContent className="pt-6">
          <span className="text-sm font-medium">How it works</span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <div className="size-8 rounded-full bg-fideza-lavender/10 border border-fideza-lavender/20 flex items-center justify-center">
                    <step.icon className="size-3.5 text-fideza-lavender" />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2 hidden md:block" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-xs font-medium mb-1">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Key params */}
          <div className="flex items-center gap-6 mt-2 pt-4 border-t border-border text-[11px] text-muted-foreground">
            <span>Base Rate <strong className="text-foreground">10% APY</strong></span>
            <span>Collateral <strong className="text-foreground">150%</strong></span>
            <span>Liquidation <strong className="text-foreground">120%</strong></span>
            <span>Penalty <strong className="text-foreground">5%</strong></span>
            <span>Interest <strong className="text-foreground">Simple</strong></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
