"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { explorerTxUrl, explorerAddressUrl } from "@/lib/constants";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  Eye,
  EyeOff,
  Layers,
  AlertTriangle,
} from "lucide-react";

interface IssuanceResult {
  tokenAddress: string;
  assetId: string;
  riskScore: number;
  riskTier: string;
  rating: string;
  recommendation: string;
  recommendationRationale: string;
  numChecks: number;
  deployTxHash: string;
  mintTxHash: string;
  attestationTxHash: string;
  checks: Array<{
    checkId: string;
    checkName: string;
    result: string;
    severity: string;
    rationale: string;
    method: string;
  }>;
  riskFactors: string[];
  disclosure: { disclosed: string[]; bucketed: string[]; withheld: string[] };
}

export function IssuanceResults({ result }: { result: IssuanceResult }) {
  const [checksExpanded, setChecksExpanded] = useState(false);
  const passed = result.checks.filter((c) => c.result === "PASS").length;
  const total = result.checks.length;
  const isApproved = result.recommendation === "APPROVE";

  return (
    <div className="space-y-4">
      {/* Rating Hero */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-6">
          {/* Big rating circle */}
          <div className="shrink-0">
            <div
              className={`size-24 rounded-full flex flex-col items-center justify-center border-[3px] ${
                isApproved
                  ? "border-fideza-lavender bg-fideza-lavender/5"
                  : "border-red-400 bg-red-400/5"
              }`}
            >
              <span
                className={`text-2xl font-bold tracking-tight ${
                  isApproved ? "text-fideza-lavender" : "text-red-400"
                }`}
              >
                {result.rating}
              </span>
              <span className="text-[10px] text-muted-foreground">
                AI Rating
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isApproved ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {result.recommendation}
              </span>
              <span className="text-xs text-muted-foreground">
                - {passed}/{total} checks passed
              </span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.recommendationRationale}
            </p>

            {/* Inline metrics */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Score</span>
                <span className="font-semibold text-fideza-lime">
                  {result.riskScore}/100
                </span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Tier</span>
                <span className="font-semibold">{result.riskTier}</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Checks</span>
                <span className="font-semibold">{total}</span>
              </div>
              {result.riskFactors.length > 0 && (
                <>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="size-3 text-yellow-400" />
                    <span className="text-yellow-400 font-medium">
                      {result.riskFactors.length} risk factor
                      {result.riskFactors.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </>
              )}
            </div>

            {result.riskFactors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.riskFactors.map((f) => (
                  <span
                    key={f}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Checks - Compact */}
      <div className="rounded-xl border border-border bg-card">
        <button
          onClick={() => setChecksExpanded(!checksExpanded)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium">Compliance Checks</span>
            {/* Mini check indicators */}
            <div className="flex items-center gap-0.5 ml-2">
              {result.checks.map((c) => (
                <div
                  key={c.checkId}
                  className={`size-1.5 rounded-full ${
                    c.result === "PASS"
                      ? "bg-emerald-400"
                      : c.result === "FAIL"
                        ? "bg-red-400"
                        : "bg-yellow-400"
                  }`}
                />
              ))}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {passed}/{total}
          </span>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${checksExpanded ? "rotate-180" : ""}`}
          />
        </button>

        {checksExpanded && (
          <div className="px-4 pb-4 space-y-1.5">
            {result.checks.map((check) => (
              <div
                key={check.checkId}
                className="flex items-start gap-2.5 py-2 px-3 rounded-lg bg-muted/20"
              >
                {check.result === "PASS" ? (
                  <CheckCircle2 className="size-3.5 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="size-3.5 text-red-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {check.checkName}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0 rounded-full ${
                        check.method === "llm"
                          ? "bg-fideza-lavender/15 text-fideza-lavender"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {check.method === "llm" ? "AI" : "Rules"}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {check.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {check.rationale}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclosure Policy - Horizontal bar style */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <span className="text-sm font-medium">Disclosure Policy</span>

        <div className="space-y-2.5">
          <DisclosureRow
            icon={<Eye className="size-3.5" />}
            label="Public"
            count={result.disclosure.disclosed.length}
            items={result.disclosure.disclosed}
            color="emerald"
          />
          <DisclosureRow
            icon={<Layers className="size-3.5" />}
            label="Bucketed"
            count={result.disclosure.bucketed.length}
            items={result.disclosure.bucketed}
            color="amber"
          />
          <DisclosureRow
            icon={<EyeOff className="size-3.5" />}
            label="Withheld"
            count={result.disclosure.withheld.length}
            items={result.disclosure.withheld}
            color="red"
          />
        </div>

        {/* Visual bar */}
        <div className="flex rounded-full overflow-hidden h-1.5">
          <div
            className="bg-emerald-400"
            style={{
              width: `${(result.disclosure.disclosed.length / (result.disclosure.disclosed.length + result.disclosure.bucketed.length + result.disclosure.withheld.length)) * 100}%`,
            }}
          />
          <div
            className="bg-amber-400"
            style={{
              width: `${(result.disclosure.bucketed.length / (result.disclosure.disclosed.length + result.disclosure.bucketed.length + result.disclosure.withheld.length)) * 100}%`,
            }}
          />
          <div
            className="bg-red-400"
            style={{
              width: `${(result.disclosure.withheld.length / (result.disclosure.disclosed.length + result.disclosure.bucketed.length + result.disclosure.withheld.length)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* On-Chain - Compact row style */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
        <span className="text-sm font-medium">On-Chain</span>
        <div className="grid grid-cols-2 gap-2">
          <ExplorerLink
            label="Token"
            hash={result.tokenAddress}
            href={explorerAddressUrl(result.tokenAddress)}
          />
          <ExplorerLink
            label="Asset ID"
            hash={result.assetId}
            href={explorerTxUrl(result.assetId)}
          />
          <ExplorerLink
            label="Deploy"
            hash={result.deployTxHash}
            href={explorerTxUrl(result.deployTxHash)}
          />
          <ExplorerLink
            label="Attestation"
            hash={result.attestationTxHash}
            href={explorerTxUrl(result.attestationTxHash)}
          />
        </div>
      </div>
    </div>
  );
}

function DisclosureRow({
  icon,
  label,
  count,
  items,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  items: string[];
  color: "emerald" | "amber" | "red";
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  const bgMap = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="flex items-start gap-2.5">
      <div
        className={`flex items-center gap-1.5 shrink-0 w-20 pt-0.5 ${colorMap[color]}`}
      >
        {icon}
        <span className="text-[11px] font-medium">
          {label} ({count})
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((f) => (
          <span
            key={f}
            className={`text-[10px] px-1.5 py-0.5 rounded ${bgMap[color]}`}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function ExplorerLink({
  label,
  hash,
  href,
}: {
  label: string;
  hash: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/20">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 font-mono text-[11px] text-fideza-lavender hover:underline"
      >
        {hash.slice(0, 10)}...{hash.slice(-4)}
        <ExternalLink className="size-2.5" />
      </a>
    </div>
  );
}
