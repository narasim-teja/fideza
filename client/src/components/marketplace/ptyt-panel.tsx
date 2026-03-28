"use client";

import { useState } from "react";
import type { Hex, Address } from "viem";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
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

  async function handleSplit() {
    if (!splitAmount || !address) return;
    try {
      const amount = parseUnits(splitAmount, 18);
      toast.loading("Approving receipt tokens...");
      await approveAsync(split.receiptTokenAddress, CONTRACTS.ptytSplitter, amount);
      toast.loading("Splitting into PT + YT...");
      await splitAsync(assetId, amount);
      toast.success("Split successful");
      setSplitAmount("");
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 100) || "Split failed");
    }
  }

  async function handleMerge() {
    if (!mergeAmount || !address) return;
    try {
      const amount = parseUnits(mergeAmount, 18);
      toast.loading("Approving PT tokens...");
      await approveAsync(split.ptTokenAddress, CONTRACTS.ptytSplitter, amount);
      toast.loading("Approving YT tokens...");
      await approveAsync(split.ytTokenAddress, CONTRACTS.ptytSplitter, amount);
      toast.loading("Merging PT + YT...");
      await mergeAsync(assetId, amount);
      toast.success("Merge successful");
      setMergeAmount("");
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 100) || "Merge failed");
    }
  }

  async function handleRedeemPT() {
    if (!redeemPTAmount) return;
    try {
      const amount = parseUnits(redeemPTAmount, 18);
      toast.loading("Redeeming PT...");
      await redeemPTAsync(assetId, amount);
      toast.success("PT redeemed");
      setRedeemPTAmount("");
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 100) || "Redeem failed");
    }
  }

  async function handleRedeemYT() {
    if (!redeemYTAmount) return;
    try {
      const amount = parseUnits(redeemYTAmount, 18);
      toast.loading("Redeeming YT...");
      await redeemYTAsync(assetId, amount);
      toast.success("YT redeemed");
      setRedeemYTAmount("");
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 100) || "Redeem failed");
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
