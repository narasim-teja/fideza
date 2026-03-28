"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { explorerAddressUrl } from "@/lib/constants";
import { formatBytes32, truncateAddress, formatTimestamp } from "@/lib/format";
import { ShieldCheck, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Hex } from "viem";
import { VAULT_CONTRACTS } from "@/lib/contracts";

interface AttestationData {
  portfolioId: Hex;
  totalValue: bigint;
  weightedCouponBps: bigint;
  numBonds: number;
  diversificationScore: number;
  methodologyHash: Hex;
  agentSignature: Hex;
  timestamp: bigint;
}

export function AttestationProof({
  attestation,
  isValid,
}: {
  attestation: AttestationData;
  isValid: boolean;
}) {
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  const rows = [
    { label: "Methodology Hash", value: attestation.methodologyHash, full: attestation.methodologyHash },
    { label: "Agent Signature", value: attestation.agentSignature.slice(0, 40) + "...", full: attestation.agentSignature },
    { label: "Attested At", value: formatTimestamp(attestation.timestamp), full: null },
    { label: "Contract", value: truncateAddress(VAULT_CONTRACTS.portfolioAttestation), full: VAULT_CONTRACTS.portfolioAttestation },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="size-4 text-fideza-lavender" />
          Attestation Proof
          {isValid ? (
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs ml-auto">
              <CheckCircle2 className="size-3 mr-1" />
              Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/20 text-xs ml-auto">
              Invalid
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs">
                {row.label === "Attested At" ? row.value : formatBytes32(String(row.value))}
              </span>
              {row.full && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => copyToClipboard(String(row.full), row.label)}
                >
                  <Copy className="size-3" />
                </Button>
              )}
            </div>
          </div>
        ))}

        <a
          href={explorerAddressUrl(VAULT_CONTRACTS.portfolioAttestation)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-fideza-lavender hover:underline pt-1"
        >
          <ExternalLink className="size-3" />
          View on Explorer
        </a>
      </CardContent>
    </Card>
  );
}
