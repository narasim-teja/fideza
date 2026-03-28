"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { explorerTxUrl } from "@/lib/constants";
import { formatBps, formatDiversification, truncateAddress } from "@/lib/format";
import {
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ExternalLink,
  Lock,
} from "lucide-react";
import Link from "next/link";

const RATING_OPTIONS = [
  "AAA", "AA+", "AA", "AA-", "A+", "A", "A-",
  "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-",
  "B+", "B", "B-", "CCC",
];

const PIPELINE_STAGES = ["PARSE", "SCAN", "OPTIMIZE", "CONSTRUCT", "ATTEST", "BRIDGE"] as const;

interface PortfolioResult {
  portfolioId: string;
  shareTokenAddress: string;
  attestationTxHash: string;
  bridgeTxHash: string;
  numBonds: number;
  diversificationScore: number;
  weightedCouponBps: number;
  ratingRange: string;
  avgMaturityMonths: number;
  maxSingleExposurePct: number;
  totalValue: string;
}

export default function CreatePortfolioPage() {
  const [minRating, setMinRating] = useState("BB-");
  const [maxRating, setMaxRating] = useState("AA");
  const [targetYieldBps, setTargetYieldBps] = useState(400);
  const [maxSingleExposurePct, setMaxSingleExposurePct] = useState(15);
  const [minBonds, setMinBonds] = useState(10);
  const [maturityPreference, setMaturityPreference] = useState("mixed");
  const [currencyPreference, setCurrencyPreference] = useState("any");
  const [riskTolerance, setRiskTolerance] = useState("moderate");

  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(-1);
  const [result, setResult] = useState<PortfolioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConstruct() {
    setIsRunning(true);
    setError(null);
    setResult(null);
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
      // Simulate stage progression for UX
      const stageInterval = setInterval(() => {
        setCurrentStage((prev) => (prev < PIPELINE_STAGES.length - 1 ? prev + 1 : prev));
      }, 3000);

      const res = await fetch("http://localhost:3001/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ constraints }),
      });

      clearInterval(stageInterval);

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Agent returned ${res.status}`);
      }

      const data = await res.json();
      setCurrentStage(PIPELINE_STAGES.length - 1);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to connect to agent server");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/vaults" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create AI Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Define constraints and let the AI agent construct an optimal portfolio from rated debt
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Constraint Form */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="size-4 text-fideza-lavender" />
              Portfolio Constraints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max Rating (Best)</label>
                <select
                  value={maxRating}
                  onChange={(e) => setMaxRating(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  disabled={isRunning}
                >
                  {RATING_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min Rating (Worst)</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  disabled={isRunning}
                >
                  {RATING_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Target Yield (bps)</label>
                <Input
                  type="number"
                  value={targetYieldBps}
                  onChange={(e) => setTargetYieldBps(Number(e.target.value))}
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max Single Exposure (%)</label>
                <Input
                  type="number"
                  value={maxSingleExposurePct}
                  onChange={(e) => setMaxSingleExposurePct(Number(e.target.value))}
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min Bonds</label>
                <Input
                  type="number"
                  value={minBonds}
                  onChange={(e) => setMinBonds(Number(e.target.value))}
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Maturity Preference</label>
                <select
                  value={maturityPreference}
                  onChange={(e) => setMaturityPreference(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  disabled={isRunning}
                >
                  {["short", "medium", "long", "mixed"].map((m) => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Currency</label>
                <select
                  value={currencyPreference}
                  onChange={(e) => setCurrencyPreference(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  disabled={isRunning}
                >
                  {["any", "USD", "BRL"].map((c) => (
                    <option key={c} value={c}>{c === "any" ? "Any" : c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Risk Tolerance</label>
                <select
                  value={riskTolerance}
                  onChange={(e) => setRiskTolerance(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  disabled={isRunning}
                >
                  {["conservative", "moderate", "aggressive"].map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <Separator />

            <Button
              onClick={handleConstruct}
              disabled={isRunning}
              className="w-full bg-fideza-lavender hover:bg-fideza-lavender/90 text-black font-semibold"
            >
              {isRunning ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Constructing Portfolio...
                </>
              ) : (
                <>
                  <Brain className="size-4 mr-2" />
                  Construct Portfolio
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Pipeline Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">AI Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PIPELINE_STAGES.map((stage, i) => {
                const isComplete = currentStage > i || (result && !error);
                const isActive = currentStage === i && isRunning;
                const isPending = currentStage < i;

                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {isComplete ? (
                        <CheckCircle2 className="size-5 text-emerald-400" />
                      ) : isActive ? (
                        <Loader2 className="size-5 text-fideza-lavender animate-spin" />
                      ) : (
                        <div className="size-5 rounded-full border-2 border-border" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-mono ${
                        isComplete
                          ? "text-emerald-400"
                          : isActive
                            ? "text-fideza-lavender"
                            : "text-muted-foreground"
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <XCircle className="size-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Result */}
      {result && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              Portfolio Constructed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Bonds</span>
                <p className="text-lg font-semibold">{result.numBonds}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Weighted Yield</span>
                <p className="text-lg font-semibold text-fideza-lime">{formatBps(result.weightedCouponBps)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Diversification</span>
                <p className="text-lg font-semibold">{formatDiversification(result.diversificationScore)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Rating Range</span>
                <p className="text-lg font-semibold">{result.ratingRange}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Portfolio ID</span>
                <span className="font-mono text-xs">{result.portfolioId.slice(0, 18)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Share Token</span>
                <span className="font-mono text-xs">{truncateAddress(result.shareTokenAddress)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg Maturity</span>
                <span>{result.avgMaturityMonths} months</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max Exposure</span>
                <span>{result.maxSingleExposurePct}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {result.attestationTxHash && result.attestationTxHash !== "not-deployed" && (
                <a
                  href={explorerTxUrl(result.attestationTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-fideza-lavender hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="size-3" />
                  Attestation TX
                </a>
              )}
              <Badge variant="outline" className="text-xs">
                <Lock className="size-3 mr-1" />
                Composition Private
              </Badge>
              <Link
                href={`/vaults/${result.portfolioId}`}
                className="ml-auto text-xs text-fideza-lavender hover:underline"
              >
                View Portfolio →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
