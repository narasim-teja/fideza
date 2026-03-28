"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useApproveToken, useBorrow, useTokenBalance, useTokenAllowance } from "@/hooks/use-contracts";
import { VAULT_CONTRACTS } from "@/lib/contracts";
import { formatWei, formatCollateralRatio, collateralRatioStatus } from "@/lib/format";
import { LENDING_CONSTANTS } from "@/lib/constants";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import type { Address, Hex } from "viem";
import { toast } from "sonner";
import { Landmark, Loader2 } from "lucide-react";

export function LendingPanel({
  portfolioId,
  vaultShareToken,
  attestedValue,
}: {
  portfolioId: Hex;
  vaultShareToken: Address;
  attestedValue: bigint;
}) {
  const { address } = useAccount();
  const [collateralInput, setCollateralInput] = useState("");
  const [borrowInput, setBorrowInput] = useState("");
  const [pendingTx, setPendingTx] = useState<`0x${string}` | undefined>();

  const { data: shareBalance } = useTokenBalance(vaultShareToken, address);
  const { data: allowance } = useTokenAllowance(vaultShareToken, address, VAULT_CONTRACTS.lendingPool);
  const { approveAsync } = useApproveToken();
  const { borrowAsync } = useBorrow();

  useWaitForTransactionReceipt({ hash: pendingTx });

  const collateralAmount = collateralInput ? parseEther(collateralInput) : BigInt(0);
  const borrowAmount = borrowInput ? parseEther(borrowInput) : BigInt(0);

  // Client-side collateral ratio preview
  const previewRatio =
    borrowAmount > BigInt(0) && attestedValue > BigInt(0) && collateralAmount > BigInt(0)
      ? Number((collateralAmount * BigInt(10000)) / borrowAmount)
      : 0;

  const ratioStatus = collateralRatioStatus(previewRatio);

  async function handleBorrow() {
    if (!address || collateralAmount === BigInt(0) || borrowAmount === BigInt(0)) return;

    const id = toast.loading("Approving collateral...");
    try {
      // Check if approval needed
      const currentAllowance = allowance ?? BigInt(0);
      if (currentAllowance < collateralAmount) {
        const approveTx = await approveAsync(vaultShareToken, VAULT_CONTRACTS.lendingPool, collateralAmount);
        setPendingTx(approveTx);
        toast.loading("Waiting for approval...", { id });
        // Wait a bit for tx confirmation
        await new Promise((r) => setTimeout(r, 5000));
      }

      toast.loading("Borrowing USDr...", { id });
      const borrowTx = await borrowAsync(vaultShareToken, portfolioId, collateralAmount, borrowAmount);
      setPendingTx(borrowTx);
      toast.success("Borrow successful!", { id });
      setCollateralInput("");
      setBorrowInput("");
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100) ?? "Transaction failed", { id });
    }
  }

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="size-4" />
            Borrow USDr
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Connect wallet to borrow</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="size-4 text-fideza-lavender" />
          Borrow USDr
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Your Vault Shares</span>
          <p className="font-semibold">{shareBalance ? formatWei(shareBalance) : "0"}</p>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Collateral (Vault Shares)</label>
            <Input
              type="text"
              placeholder="0.0"
              value={collateralInput}
              onChange={(e) => setCollateralInput(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Borrow Amount (USDr)</label>
            <Input
              type="text"
              placeholder="0.0"
              value={borrowInput}
              onChange={(e) => setBorrowInput(e.target.value)}
            />
          </div>

          {previewRatio > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Collateral Ratio</span>
                <span
                  className={
                    ratioStatus === "healthy"
                      ? "text-emerald-400 font-semibold"
                      : ratioStatus === "warning"
                        ? "text-yellow-400 font-semibold"
                        : "text-red-400 font-semibold"
                  }
                >
                  {formatCollateralRatio(previewRatio)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Required</span>
                <span>{formatCollateralRatio(LENDING_CONSTANTS.collateralRatioBps)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liquidation At</span>
                <span>{formatCollateralRatio(LENDING_CONSTANTS.liquidationThresholdBps)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interest Rate</span>
                <span>10% APY</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleBorrow}
            disabled={collateralAmount === BigInt(0) || borrowAmount === BigInt(0)}
            className="w-full"
          >
            {collateralAmount === BigInt(0) || borrowAmount === BigInt(0) ? (
              "Enter amounts"
            ) : previewRatio < LENDING_CONSTANTS.collateralRatioBps ? (
              "Insufficient collateral ratio"
            ) : (
              "Approve & Borrow"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
