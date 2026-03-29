"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { explorerTxUrl } from "@/lib/constants";
import { formatBps, formatDiversification, truncateAddress } from "@/lib/format";
import { useDeposit } from "@/hooks/use-contracts";
import { cacheShareToken } from "@/hooks/use-vault-share-token";
import { toast } from "sonner";
import {
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ExternalLink,
  Lock,
  ChevronDown,
  Wallet,
  TrendingUp,
  Shield,
  BarChart3,
  Zap,
} from "lucide-react";
import Link from "next/link";

const RATING_OPTIONS = [
  "AAA", "AA+", "AA", "AA-", "A+", "A", "A-",
  "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-",
  "B+", "B", "B-", "CCC",
];

const PIPELINE_STAGES = [
  { key: "SIGN", label: "Sign Transaction", desc: "Deposit USDr to lending pool" },
  { key: "PARSE", label: "Parse Constraints", desc: "Validate investment parameters" },
  { key: "SCAN", label: "Scan Bonds", desc: "Read rated instruments from registry" },
  { key: "OPTIMIZE", label: "AI Optimization", desc: "LLM constructs optimal allocation" },
  { key: "CONSTRUCT", label: "On-Chain Build", desc: "Create vault + deploy share token" },
  { key: "ATTEST", label: "Sign Attestation", desc: "ECDSA-sign portfolio properties" },
  { key: "BRIDGE", label: "Bridge Shares", desc: "Teleport shares to public chain" },
  { key: "ZK_PROVE", label: "ZK Proof", desc: "Generate Noir composition proof" },
] as const;

interface PortfolioResult {
  portfolioId: string;
  shareTokenAddress: string;
  attestationTxHash: string;
  bridgeTxHash: string;
  transferToUserTxHash?: string;
  numBonds: number;
  diversificationScore: number;
  weightedCouponBps: number;
  ratingRange: string;
  avgMaturityMonths: number;
  maxSingleExposurePct: number;
  totalValue: string;
}

export default function CreatePortfolioPage() {
  const { address } = useAccount();
  const [minRating, setMinRating] = useState("BB-");
  const [maxRating, setMaxRating] = useState("AA");
  const [targetYieldBps, setTargetYieldBps] = useState(400);
  const [maxSingleExposurePct, setMaxSingleExposurePct] = useState(15);
  const [minBonds, setMinBonds] = useState(10);
  const [maturityPreference, setMaturityPreference] = useState("mixed");
  const [currencyPreference, setCurrencyPreference] = useState("any");
  const [riskTolerance, setRiskTolerance] = useState("moderate");
  const [investmentAmount, setInvestmentAmount] = useState("10");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const publicClient = usePublicClient();
  const { depositAsync } = useDeposit();

  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(-1);
  const [result, setResult] = useState<PortfolioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signatureTxHash, setSignatureTxHash] = useState<string | null>(null);

  async function handleConstruct() {
    if (!address || !publicClient) return;

    setIsRunning(true);
    setError(null);
    setResult(null);
    setSignatureTxHash(null);
    setCurrentStage(0);

    const constraints = {
      minRating,
      maxRating,
      targetYieldBps,
      maxSingleExposurePct,
      minBonds,
      maturityPreference,
      currencyPreference,
      riskTolerance,
    };

    try {
      const toastId = toast.loading("Confirm transaction in wallet...");
      const depositTx = await depositAsync(parseEther(investmentAmount));
      setSignatureTxHash(depositTx);
      toast.loading("Waiting for confirmation...", { id: toastId });
      try {
        await publicClient.waitForTransactionReceipt({
          hash: depositTx,
          timeout: 30_000,
          pollingInterval: 2_000,
        });
        toast.success("Transaction confirmed", { id: toastId });
      } catch {
        toast.success("Transaction submitted", { id: toastId });
      }

      setCurrentStage(1);
      const stageInterval = setInterval(() => {
        setCurrentStage((prev) => (prev < PIPELINE_STAGES.length - 1 ? prev + 1 : prev));
      }, 3000);

      const res = await fetch("http://localhost:3001/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ constraints, recipientAddress: address, investmentAmount }),
      });

      clearInterval(stageInterval);

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Agent returned ${res.status}`);
      }

      const data = await res.json();
      setCurrentStage(PIPELINE_STAGES.length - 1);
      setResult(data);

      // Cache share token address for lending resolution
      if (data.portfolioId && data.shareTokenAddress) {
        cacheShareToken(data.portfolioId, data.shareTokenAddress);
      }
    } catch (e: any) {
      setError(e.message || "Failed to connect to agent server");
    } finally {
      setIsRunning(false);
    }
  }

  const selectClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-fideza-lavender/50";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/vaults" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create AI Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Invest USDr into an AI-optimized portfolio of rated private credit
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Investment + Constraints */}
        <div className="lg:col-span-5 space-y-4">
          {/* Investment Amount — Hero */}
          <Card className="border-fideza-lavender/30 bg-fideza-lavender/[0.03]">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-fideza-lavender">
                <Wallet className="size-4" />
                Investment Amount
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  disabled={isRunning}
                  className="text-3xl font-bold h-14 pr-16 bg-background"
                  placeholder="10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  USDr
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Deposited to lending pool. Portfolio shares minted proportionally.
              </p>
            </CardContent>
          </Card>

          {/* Quick Strategy Presets */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Brain className="size-4 text-fideza-lavender" />
                  Strategy
                </span>
                <Badge variant="outline" className="text-xs">
                  {maxRating} to {minRating}
                </Badge>
              </div>

              {/* Rating Range */}
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block">Rating Range</label>
                <div className="flex items-center gap-2">
                  <select value={maxRating} onChange={(e) => setMaxRating(e.target.value)} className={selectClass} disabled={isRunning}>
                    {RATING_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <span className="text-xs text-muted-foreground shrink-0">to</span>
                  <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className={selectClass} disabled={isRunning}>
                    {RATING_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Risk */}
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block">Risk Tolerance</label>
                <select value={riskTolerance} onChange={(e) => setRiskTolerance(e.target.value)} className={selectClass} disabled={isRunning}>
                  {["conservative", "moderate", "aggressive"].map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <ChevronDown className={`size-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                Advanced parameters
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Target Yield (bps)</label>
                    <Input type="number" value={targetYieldBps} onChange={(e) => setTargetYieldBps(Number(e.target.value))} disabled={isRunning} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Max Exposure (%)</label>
                    <Input type="number" value={maxSingleExposurePct} onChange={(e) => setMaxSingleExposurePct(Number(e.target.value))} disabled={isRunning} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Min Bonds</label>
                    <Input type="number" value={minBonds} onChange={(e) => setMinBonds(Number(e.target.value))} disabled={isRunning} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Maturity</label>
                    <select value={maturityPreference} onChange={(e) => setMaturityPreference(e.target.value)} className={selectClass} disabled={isRunning}>
                      {["short", "medium", "long", "mixed"].map((m) => (
                        <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Currency</label>
                    <select value={currencyPreference} onChange={(e) => setCurrencyPreference(e.target.value)} className={selectClass} disabled={isRunning}>
                      {["any", "USD", "BRL"].map((c) => (
                        <option key={c} value={c}>{c === "any" ? "Any" : c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CTA */}
          <Button
            onClick={handleConstruct}
            disabled={isRunning || !address}
            className="w-full h-12 bg-fideza-lavender hover:bg-fideza-lavender/90 text-black font-semibold text-base"
          >
            {!address ? (
              "Connect Wallet First"
            ) : isRunning ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Constructing Portfolio...
              </>
            ) : (
              <>
                <Zap className="size-4 mr-2" />
                Invest {investmentAmount} USDr
              </>
            )}
          </Button>
          {address && !isRunning && (
            <p className="text-xs text-muted-foreground text-center -mt-2">
              Vault shares sent to {truncateAddress(address)}
            </p>
          )}
        </div>

        {/* Right: Pipeline + Result */}
        <div className="lg:col-span-7 space-y-4">
          {/* Pipeline Status */}
          <Card className={isRunning ? "border-fideza-lavender/30" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-5">
                <Brain className="size-4 text-fideza-lavender" />
                <span className="text-sm font-medium">AI Construction Pipeline</span>
                {isRunning && (
                  <Badge variant="outline" className="ml-auto text-xs text-fideza-lavender border-fideza-lavender/30">
                    Running
                  </Badge>
                )}
                {result && (
                  <Badge className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Complete
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                {PIPELINE_STAGES.map((stage, i) => {
                  const isComplete = currentStage > i || (result != null && !error);
                  const isActive = currentStage === i && isRunning;

                  return (
                    <div
                      key={stage.key}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive ? "bg-fideza-lavender/10" : isComplete ? "bg-emerald-500/5" : ""
                      }`}
                    >
                      <div className="shrink-0">
                        {isComplete ? (
                          <CheckCircle2 className="size-4 text-emerald-400" />
                        ) : isActive ? (
                          <Loader2 className="size-4 text-fideza-lavender animate-spin" />
                        ) : (
                          <div className="size-4 rounded-full border-[1.5px] border-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm font-medium ${
                            isComplete ? "text-emerald-400" : isActive ? "text-fideza-lavender" : "text-muted-foreground"
                          }`}
                        >
                          {stage.label}
                        </span>
                        {(isActive || isComplete) && (
                          <p className="text-[11px] text-muted-foreground truncate">{stage.desc}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {stage.key}
                      </span>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <XCircle className="size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-400" />
                  <span className="font-semibold">Portfolio Constructed</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    <Lock className="size-3 mr-1" />
                    Dark Pool
                  </Badge>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-lg bg-background p-3 text-center">
                    <TrendingUp className="size-3.5 text-fideza-lime mx-auto mb-1" />
                    <p className="text-lg font-bold text-fideza-lime">{formatBps(result.weightedCouponBps)}</p>
                    <span className="text-[10px] text-muted-foreground">Yield</span>
                  </div>
                  <div className="rounded-lg bg-background p-3 text-center">
                    <BarChart3 className="size-3.5 text-fideza-lavender mx-auto mb-1" />
                    <p className="text-lg font-bold">{result.numBonds}</p>
                    <span className="text-[10px] text-muted-foreground">Bonds</span>
                  </div>
                  <div className="rounded-lg bg-background p-3 text-center">
                    <Shield className="size-3.5 text-blue-400 mx-auto mb-1" />
                    <p className="text-lg font-bold">{formatDiversification(result.diversificationScore)}</p>
                    <span className="text-[10px] text-muted-foreground">Diversification</span>
                  </div>
                  <div className="rounded-lg bg-background p-3 text-center">
                    <Wallet className="size-3.5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-lg font-bold">{result.totalValue ? formatEther(BigInt(result.totalValue)).slice(0, 6) : investmentAmount}</p>
                    <span className="text-[10px] text-muted-foreground">USDr</span>
                  </div>
                </div>

                <Separator />

                {/* Details */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rating Range</span>
                    <span className="font-medium">{result.ratingRange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Maturity</span>
                    <span className="font-medium">{result.avgMaturityMonths}mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Exposure</span>
                    <span className="font-medium">{result.maxSingleExposurePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portfolio ID</span>
                    <span className="font-mono text-xs">{result.portfolioId.slice(0, 14)}...</span>
                  </div>
                </div>

                {/* TX Links */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {signatureTxHash && (
                    <a href={explorerTxUrl(signatureTxHash)} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      <ExternalLink className="size-3" /> Deposit TX
                    </a>
                  )}
                  {result.attestationTxHash && result.attestationTxHash !== "not-deployed" && (
                    <a href={explorerTxUrl(result.attestationTxHash)} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-fideza-lavender hover:underline flex items-center gap-1">
                      <ExternalLink className="size-3" /> Attestation
                    </a>
                  )}
                  {result.transferToUserTxHash && (
                    <a href={explorerTxUrl(result.transferToUserTxHash)} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
                      <ExternalLink className="size-3" /> Shares Sent
                    </a>
                  )}
                  <Link
                    href={`/vaults/${result.portfolioId}`}
                    className="ml-auto text-sm font-medium text-fideza-lavender hover:underline flex items-center gap-1"
                  >
                    View Portfolio <ArrowLeft className="size-3 rotate-180" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
