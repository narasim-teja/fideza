"use client";

import { useState } from "react";
import type { Hex, Address } from "viem";
import { parseUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useTokenBalance,
  useApproveToken,
  useSplitTokens,
  useMergeTokens,
  useRedeemPT,
  useRedeemYT,
} from "@/hooks/use-contracts";
import { CONTRACTS } from "@/lib/contracts";
import { formatWei, formatTimestamp, timeToMaturity, isMatured, truncateAddress } from "@/lib/format";
import { explorerAddressUrl } from "@/lib/constants";
import { toast } from "sonner";
import { Layers, Copy, ExternalLink } from "lucide-react";

interface PTYTPanelProps {
  assetId: Hex;
  split: {
    receiptTokenAddress: Address;
    ptTokenAddress: Address;
    ytTokenAddress: Address;
    maturityTimestamp: bigint;
    principalPerToken: bigint;
    expectedYieldPerToken: bigint;
    totalReceiptLocked: bigint;
    principalSettled: boolean;
    yieldSettled: boolean;
  };
}

export function PTYTPanel({ assetId, split }: PTYTPanelProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [splitAmount, setSplitAmount] = useState("");
  const [mergeAmount, setMergeAmount] = useState("");
  const [redeemPTAmount, setRedeemPTAmount] = useState("");
  const [redeemYTAmount, setRedeemYTAmount] = useState("");

  const receiptBalance = useTokenBalance(split.receiptTokenAddress, address);
  const ptBalance = useTokenBalance(split.ptTokenAddress, address);
  const ytBalance = useTokenBalance(split.ytTokenAddress, address);

  const { approveAsync, isPending: approving } = useApproveToken();
  const { splitAsync, isPending: splitting } = useSplitTokens();
  const { mergeAsync, isPending: merging } = useMergeTokens();
  const { redeemAsync: redeemPTAsync, isPending: redeemingPT } = useRedeemPT();
  const { redeemAsync: redeemYTAsync, isPending: redeemingYT } = useRedeemYT();

  const matured = isMatured(split.maturityTimestamp);

  async function waitForTx(hash: `0x${string}`) {
    if (!publicClient) return;
    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function handleSplit() {
    if (!splitAmount || !address) return;
    const id = toast.loading("Approving receipt tokens...");
    try {
      const amount = parseUnits(splitAmount, 18);
      const approveTx = await approveAsync(split.receiptTokenAddress, CONTRACTS.ptytSplitter, amount);
      toast.loading("Waiting for approval...", { id });
      await waitForTx(approveTx);
      toast.loading("Splitting into PT + YT...", { id });
      const splitTx = await splitAsync(assetId, amount);
      toast.loading("Waiting for split...", { id });
      await waitForTx(splitTx);
      toast.success("Split successful", { id });
      setSplitAmount("");
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 100) || "Split failed", { id });
    }
  }

  async function handleMerge() {
    if (!mergeAmount || !address) return;
    const id = toast.loading("Approving PT tokens...");
    try {
      const amount = parseUnits(mergeAmount, 18);
      const a1 = await approveAsync(split.ptTokenAddress, CONTRACTS.ptytSplitter, amount);
      toast.loading("Waiting for PT approval...", { id });
      await waitForTx(a1);
      toast.loading("Approving YT tokens...", { id });
      const a2 = await approveAsync(split.ytTokenAddress, CONTRACTS.ptytSplitter, amount);
      toast.loading("Waiting for YT approval...", { id });
      await waitForTx(a2);
      toast.loading("Merging PT + YT...", { id });
      const mergeTx = await mergeAsync(assetId, amount);
      toast.loading("Waiting for merge...", { id });
      await waitForTx(mergeTx);
      toast.success("Merge successful", { id });
      setMergeAmount("");
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 100) || "Merge failed", { id });
    }
  }

  async function handleRedeemPT() {
    if (!redeemPTAmount) return;
    const id = toast.loading("Redeeming PT...");
    try {
      const amount = parseUnits(redeemPTAmount, 18);
      const tx = await redeemPTAsync(assetId, amount);
      toast.loading("Waiting for confirmation...", { id });
      await waitForTx(tx);
      toast.success("PT redeemed", { id });
      setRedeemPTAmount("");
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 100) || "Redeem failed", { id });
    }
  }

  async function handleRedeemYT() {
    if (!redeemYTAmount) return;
    const id = toast.loading("Redeeming YT...");
    try {
      const amount = parseUnits(redeemYTAmount, 18);
      const tx = await redeemYTAsync(assetId, amount);
      toast.loading("Waiting for confirmation...", { id });
      await waitForTx(tx);
      toast.success("YT redeemed", { id });
      setRedeemYTAmount("");
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 100) || "Redeem failed", { id });
    }
  }

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers className="size-4 text-primary" />
          PT / YT Splitting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Maturity</p>
            <p className="font-medium">{formatTimestamp(split.maturityTimestamp)}</p>
            <p className="text-[10px] text-muted-foreground">{timeToMaturity(split.maturityTimestamp)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Locked</p>
            <p className="font-medium">{formatWei(split.totalReceiptLocked)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Principal / token</p>
            <p className="font-medium">{formatWei(split.principalPerToken)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Yield / token</p>
            <p className="font-medium text-fideza-lime">{formatWei(split.expectedYieldPerToken)}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2 text-xs">
          <TokenRow label="PT" address={split.ptTokenAddress} onCopy={copyAddress} />
          <TokenRow label="YT" address={split.ytTokenAddress} onCopy={copyAddress} />
        </div>

        {address && (
          <>
            <Separator />
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div>
                <p className="text-muted-foreground">Receipt</p>
                <p className="font-medium">{receiptBalance.data != null ? formatWei(receiptBalance.data) : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">PT</p>
                <p className="font-medium">{ptBalance.data != null ? formatWei(ptBalance.data) : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">YT</p>
                <p className="font-medium">{ytBalance.data != null ? formatWei(ytBalance.data) : "—"}</p>
              </div>
            </div>
          </>
        )}

        <Separator />

        <Tabs defaultValue="split">
          <TabsList variant="line" className="w-full">
            <TabsTrigger value="split">Split</TabsTrigger>
            <TabsTrigger value="merge">Merge</TabsTrigger>
            {(split.principalSettled || split.yieldSettled) && (
              <TabsTrigger value="redeem">Redeem</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="split" className="mt-3 space-y-2">
            <Input
              type="text"
              placeholder="Amount to split"
              value={splitAmount}
              onChange={(e) => setSplitAmount(e.target.value)}
              className="text-xs h-8"
            />
            <Button
              size="sm"
              className="w-full"
              onClick={handleSplit}
              disabled={!address || !splitAmount || approving || splitting}
            >
              {approving ? "Approving..." : splitting ? "Splitting..." : "Split into PT + YT"}
            </Button>
          </TabsContent>

          <TabsContent value="merge" className="mt-3 space-y-2">
            <Input
              type="text"
              placeholder="Amount to merge"
              value={mergeAmount}
              onChange={(e) => setMergeAmount(e.target.value)}
              className="text-xs h-8"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleMerge}
              disabled={!address || !mergeAmount || approving || merging || matured}
            >
              {approving ? "Approving..." : merging ? "Merging..." : "Merge PT + YT"}
            </Button>
            {matured && (
              <p className="text-[10px] text-muted-foreground">Merge unavailable after maturity</p>
            )}
          </TabsContent>

          {(split.principalSettled || split.yieldSettled) && (
            <TabsContent value="redeem" className="mt-3 space-y-3">
              {split.principalSettled && (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="PT amount to redeem"
                    value={redeemPTAmount}
                    onChange={(e) => setRedeemPTAmount(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleRedeemPT}
                    disabled={!address || !redeemPTAmount || redeemingPT}
                  >
                    {redeemingPT ? "Redeeming..." : "Redeem PT"}
                  </Button>
                </div>
              )}
              {split.yieldSettled && (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="YT amount to redeem"
                    value={redeemYTAmount}
                    onChange={(e) => setRedeemYTAmount(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleRedeemYT}
                    disabled={!address || !redeemYTAmount || redeemingYT}
                  >
                    {redeemingYT ? "Redeeming..." : "Redeem YT"}
                  </Button>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TokenRow({
  label,
  address,
  onCopy,
}: {
  label: string;
  address: string;
  onCopy: (addr: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <code className="font-mono text-[11px]">{truncateAddress(address)}</code>
        <Button variant="ghost" size="icon-xs" onClick={() => onCopy(address)}>
          <Copy className="size-3" />
        </Button>
        <a href={explorerAddressUrl(address)} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon-xs">
            <ExternalLink className="size-3" />
          </Button>
        </a>
      </div>
    </div>
  );
}
