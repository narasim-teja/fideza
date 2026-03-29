"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useDeposit, useWithdraw, useLenderBalance, useLendingPoolStats } from "@/hooks/use-contracts";
import { useAccount, useBalance } from "wagmi";
import { parseEther } from "viem";
import { formatWei } from "@/lib/format";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Wallet, TrendingUp } from "lucide-react";

export function LenderPanel() {
  const { address } = useAccount();
  const { data: walletBalance } = useBalance({ address });
  const { data: lenderBalance } = useLenderBalance(address);
  const { data: poolData } = useLendingPoolStats();
  const { depositAsync } = useDeposit();
  const { withdrawAsync } = useWithdraw();

  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const zero = BigInt(0);
  const utilizationBps = poolData ? (poolData as [bigint, bigint, bigint, bigint])[3] : zero;
  const effectiveAPY = (10 * Number(utilizationBps)) / 10000;

  const deposited = lenderBalance ? lenderBalance as bigint : zero;
  const walletBal = walletBalance?.value ?? zero;

  // Projected yearly earnings based on deposited amount
  const depositedNum = Number(deposited) / 1e18;
  const projectedYearly = depositedNum * (effectiveAPY / 100);

  async function handleDeposit() {
    if (!depositInput) return;
    setIsDepositing(true);
    const id = toast.loading("Depositing USDr...");
    try {
      await depositAsync(parseEther(depositInput));
      toast.success("Deposit successful!", { id });
      setDepositInput("");
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100) ?? "Deposit failed", { id });
    } finally {
      setIsDepositing(false);
    }
  }

  async function handleWithdraw() {
    if (!withdrawInput) return;
    setIsWithdrawing(true);
    const id = toast.loading("Withdrawing USDr...");
    try {
      await withdrawAsync(parseEther(withdrawInput));
      toast.success("Withdrawal successful!", { id });
      setWithdrawInput("");
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100) ?? "Withdrawal failed", { id });
    } finally {
      setIsWithdrawing(false);
    }
  }

  if (!address) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="size-4 text-fideza-lavender" />
            <span className="text-sm font-medium">Lender</span>
          </div>
          <p className="text-sm text-muted-foreground">Connect wallet to start earning yield.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-fideza-lavender" />
            <span className="text-sm font-medium">Lender</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <TrendingUp className="size-3 text-fideza-lime" />
            <span className="text-fideza-lime font-medium">{effectiveAPY.toFixed(2)}% APY</span>
          </div>
        </div>

        {/* Balances */}
        <div className="rounded-lg bg-muted/20 p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Wallet Balance</span>
            <span className="font-medium">{formatWei(walletBal)} USDr</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Deposited</span>
            <span className="font-medium text-fideza-lime">{formatWei(deposited)} USDr</span>
          </div>
          {projectedYearly > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Projected Yearly</span>
              <span className="font-medium text-fideza-lime">+{projectedYearly.toFixed(2)} USDr</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Deposit */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Deposit USDr</label>
            <button
              onClick={() => setDepositInput(walletBalance ? (Number(walletBalance.value) / 1e18).toString() : "")}
              className="text-[10px] text-fideza-lavender hover:underline"
            >
              Max
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="0.0"
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              disabled={isDepositing}
            />
            <Button
              onClick={handleDeposit}
              disabled={isDepositing || !depositInput}
              className="shrink-0 bg-fideza-lavender hover:bg-fideza-lavender/90 text-black"
            >
              {isDepositing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="size-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Withdraw */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Withdraw USDr</label>
            <button
              onClick={() => setWithdrawInput(deposited ? (Number(deposited) / 1e18).toString() : "")}
              className="text-[10px] text-fideza-lavender hover:underline"
            >
              Max
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="0.0"
              value={withdrawInput}
              onChange={(e) => setWithdrawInput(e.target.value)}
              disabled={isWithdrawing}
            />
            <Button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !withdrawInput}
              variant="outline"
              className="shrink-0"
            >
              {isWithdrawing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
