"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  useAllPortfolioIds,
  usePortfolioAttestation,
  useApproveToken,
  useBorrow,
  useTokenBalance,
  useTokenAllowance,
} from "@/hooks/use-contracts";
import { useVaultShareToken } from "@/hooks/use-vault-share-token";
import { VAULT_CONTRACTS } from "@/lib/contracts";
import { formatWei, formatBps, formatDiversification, formatCollateralRatio, collateralRatioStatus } from "@/lib/format";
import { LENDING_CONSTANTS } from "@/lib/constants";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import type { Hex } from "viem";
import { toast } from "sonner";
import { Landmark, Loader2, ChevronDown, Shield, TrendingUp, BarChart3 } from "lucide-react";

function PortfolioOption({ portfolioId }: { portfolioId: Hex }) {
  const { data: attestation } = usePortfolioAttestation(portfolioId);
  if (!attestation) return null;
  const a = attestation as { totalValue: bigint; weightedCouponBps: bigint; numBonds: number; diversificationScore: number };
  return (
    <div className="flex items-center justify-between w-full">
      <span className="font-mono text-xs">{portfolioId.slice(0, 10)}...{portfolioId.slice(-6)}</span>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>{formatWei(a.totalValue)} USDr</span>
        <span className="text-fideza-lime">{formatBps(a.weightedCouponBps)}</span>
        <span>{a.numBonds} bonds</span>
      </div>
    </div>
  );
}

function SelectedPortfolioInfo({ portfolioId }: { portfolioId: Hex }) {
  const { data: attestation } = usePortfolioAttestation(portfolioId);
  if (!attestation) return null;
  const a = attestation as { totalValue: bigint; weightedCouponBps: bigint; numBonds: number; diversificationScore: number };
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <div className="rounded-md bg-muted/30 p-2 text-center">
        <TrendingUp className="size-3 text-fideza-lime mx-auto mb-0.5" />
        <p className="font-semibold text-fideza-lime">{formatBps(a.weightedCouponBps)}</p>
        <span className="text-[10px] text-muted-foreground">Yield</span>
      </div>
      <div className="rounded-md bg-muted/30 p-2 text-center">
        <BarChart3 className="size-3 text-fideza-lavender mx-auto mb-0.5" />
        <p className="font-semibold">{a.numBonds}</p>
        <span className="text-[10px] text-muted-foreground">Bonds</span>
      </div>
      <div className="rounded-md bg-muted/30 p-2 text-center">
        <Shield className="size-3 text-blue-400 mx-auto mb-0.5" />
        <p className="font-semibold">{formatDiversification(a.diversificationScore)}</p>
        <span className="text-[10px] text-muted-foreground">Diversification</span>
      </div>
    </div>
  );
}

export function BorrowForm({ preselectedPortfolioId }: { preselectedPortfolioId?: string }) {
  const { address } = useAccount();
  const { data: portfolioIdsRaw, isLoading: loadingIds } = useAllPortfolioIds();
  const portfolioIds = (portfolioIdsRaw ?? []) as Hex[];

  const [selectedId, setSelectedId] = useState<Hex | "">(
    (preselectedPortfolioId as Hex) || "",
  );
  const [collateralInput, setCollateralInput] = useState("");
  const [borrowInput, setBorrowInput] = useState("");
  const [pendingTx, setPendingTx] = useState<`0x${string}` | undefined>();

  const selectedPortfolioId = selectedId || undefined;
  const vaultShareToken = useVaultShareToken(selectedPortfolioId as Hex | undefined);

  const { data: attestation } = usePortfolioAttestation(selectedPortfolioId as Hex | undefined);
  const attestedValue = attestation ? (attestation as { totalValue: bigint }).totalValue : BigInt(0);

  const { data: shareBalance } = useTokenBalance(vaultShareToken!, address);
  const { data: allowance } = useTokenAllowance(vaultShareToken!, address, VAULT_CONTRACTS.lendingPool);
  const { approveAsync } = useApproveToken();
  const { borrowAsync } = useBorrow();

  useWaitForTransactionReceipt({ hash: pendingTx });

  const collateralAmount = collateralInput ? parseEther(collateralInput) : BigInt(0);
  const borrowAmount = borrowInput ? parseEther(borrowInput) : BigInt(0);

  const previewRatio =
    borrowAmount > BigInt(0) && collateralAmount > BigInt(0)
      ? Number((collateralAmount * BigInt(10000)) / borrowAmount)
      : 0;

  const ratioStatus = collateralRatioStatus(previewRatio);

  async function handleBorrow() {
    if (!address || !vaultShareToken || !selectedPortfolioId || collateralAmount === BigInt(0) || borrowAmount === BigInt(0)) return;

    const id = toast.loading("Approving collateral...");
    try {
      const currentAllowance = allowance ?? BigInt(0);
      if (currentAllowance < collateralAmount) {
        const approveTx = await approveAsync(vaultShareToken, VAULT_CONTRACTS.lendingPool, collateralAmount);
        setPendingTx(approveTx);
        toast.loading("Waiting for approval...", { id });
        await new Promise((r) => setTimeout(r, 5000));
      }

      toast.loading("Borrowing USDr...", { id });
      const borrowTx = await borrowAsync(vaultShareToken, selectedPortfolioId, collateralAmount, borrowAmount);
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
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="size-4 text-fideza-lavender" />
            <span className="text-sm font-medium">Borrow USDr</span>
          </div>
          <p className="text-sm text-muted-foreground">Connect wallet to borrow against vault shares.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Landmark className="size-4 text-fideza-lavender" />
          <span className="text-sm font-medium">Borrow USDr</span>
        </div>

        {/* Portfolio selector */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Select Portfolio</label>
          {loadingIds ? (
            <div className="h-9 rounded-md border border-border bg-muted/20 flex items-center px-3">
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
            </div>
          ) : portfolioIds.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No portfolios found.{" "}
              <a href="/vaults/create" className="text-fideza-lavender hover:underline">Create one first</a>.
            </p>
          ) : (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value as Hex)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-fideza-lavender/50"
            >
              <option value="">Choose a portfolio...</option>
              {portfolioIds.map((id) => (
                <option key={id} value={id}>
                  {id.slice(0, 10)}...{id.slice(-6)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Selected portfolio info */}
        {selectedPortfolioId && (
          <SelectedPortfolioInfo portfolioId={selectedPortfolioId} />
        )}

        {selectedPortfolioId && vaultShareToken && (
          <>
            <Separator />

            <div className="text-xs flex justify-between">
              <span className="text-muted-foreground">Your Vault Shares</span>
              <span className="font-medium">{shareBalance ? formatWei(shareBalance) : "0"}</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Collateral (Vault Shares)</label>
                  {shareBalance && (
                    <button
                      onClick={() => setCollateralInput((Number(shareBalance) / 1e18).toString())}
                      className="text-[10px] text-fideza-lavender hover:underline"
                    >
                      Max
                    </button>
                  )}
                </div>
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
                disabled={!selectedPortfolioId || collateralAmount === BigInt(0) || borrowAmount === BigInt(0)}
                className="w-full bg-fideza-lavender hover:bg-fideza-lavender/90 text-black"
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
          </>
        )}

        {selectedPortfolioId && !vaultShareToken && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Share token not found for this portfolio. Create a portfolio first to cache the token address.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
