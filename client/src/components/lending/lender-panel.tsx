"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useDeposit, useWithdraw, useLenderBalance } from "@/hooks/use-contracts";
import { useAccount, useBalance } from "wagmi";
import { parseEther } from "viem";
import { formatWei } from "@/lib/format";
import { toast } from "sonner";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";

export function LenderPanel() {
  const { address } = useAccount();
  const { data: walletBalance } = useBalance({ address });
  const { data: lenderBalance } = useLenderBalance(address);
  const { depositAsync } = useDeposit();
  const { withdrawAsync } = useWithdraw();

  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

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
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="size-4" />
            Lender
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Connect wallet to deposit</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="size-4 text-fideza-lavender" />
          Lender
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Wallet Balance</span>
            <p className="font-semibold">{walletBalance ? formatWei(walletBalance.value) : "0"} USDr</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Deposited</span>
            <p className="font-semibold text-fideza-lime">{lenderBalance ? formatWei(lenderBalance) : "0"} USDr</p>
          </div>
        </div>

        <Separator />

        {/* Deposit */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Deposit USDr</label>
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
              className="shrink-0"
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
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Withdraw USDr</label>
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

        <p className="text-xs text-muted-foreground">
          Earn 10% APY on deposited USDr. Funds are used by borrowers who collateralize with AI-constructed portfolio vault shares.
        </p>
      </CardContent>
    </Card>
  );
}
