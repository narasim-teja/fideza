"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/constants";
import { formatBytes32, truncateAddress, formatTimestamp } from "@/lib/format";
import { ShieldCheck, Copy, ExternalLink, CheckCircle2, Lock, Loader2, ShieldQuestion, FileCheck, Award } from "lucide-react";
import { toast } from "sonner";
import type { Hex } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { VAULT_CONTRACTS, zkPortfolioVerifierAbi, zkConstraintVerifierAbi, zkRatingVerifierAbi } from "@/lib/contracts";
import { useZKProofValid, useZKConstraintProofValid, useZKRatingProofValid } from "@/hooks/use-contracts";

const RATING_SCALE = [
  "AAA", "AA+", "AA", "AA-", "A+", "A", "A-",
  "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-",
  "B+", "B", "B-", "CCC",
];

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
  const { address } = useAccount();
  const { data: hasZKProof, refetch: refetchZK } = useZKProofValid(attestation.portfolioId);
  const { data: hasConstraintProof, refetch: refetchConstraint } = useZKConstraintProofValid(attestation.portfolioId);
  const { data: hasRatingProof, refetch: refetchRating } = useZKRatingProofValid(attestation.portfolioId);
  const { writeContractAsync } = useWriteContract();
  const [isVerifying, setIsVerifying] = useState(false);
  const [zkTxHash, setZkTxHash] = useState<string | null>(null);
  const [isVerifyingConstraint, setIsVerifyingConstraint] = useState(false);
  const [constraintTxHash, setConstraintTxHash] = useState<string | null>(null);
  const [isVerifyingRating, setIsVerifyingRating] = useState(false);
  const [ratingTxHash, setRatingTxHash] = useState<string | null>(null);

  async function handleVerifyZK() {
    if (!address) return;
    setIsVerifying(true);
    const id = toast.loading("Generating ZK proof...");
    try {
      const res = await fetch("http://localhost:3001/api/portfolio/verify-zk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId: attestation.portfolioId }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Server returned ${res.status}`);
      }
      const data = await res.json();

      toast.loading("Sign transaction to verify proof on-chain...", { id });
      const txHash = await writeContractAsync({
        abi: zkPortfolioVerifierAbi,
        address: VAULT_CONTRACTS.zkPortfolioVerifier,
        functionName: "verifyAndStore",
        args: [data.portfolioId as Hex, data.proof as Hex, data.publicInputs as Hex[]],
      });

      setZkTxHash(txHash);
      toast.success("ZK proof verified on-chain!", { id });
      refetchZK();
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100) ?? "ZK verification failed", { id });
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleVerifyConstraint() {
    if (!address) return;
    setIsVerifyingConstraint(true);
    const id = toast.loading("Generating constraint compliance proof...");
    try {
      const res = await fetch("http://localhost:3001/api/portfolio/verify-constraint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId: attestation.portfolioId }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Server returned ${res.status}`);
      }
      const data = await res.json();

      toast.loading("Sign transaction to verify constraint proof...", { id });
      const txHash = await writeContractAsync({
        abi: zkConstraintVerifierAbi,
        address: VAULT_CONTRACTS.zkConstraintVerifier,
        functionName: "verifyAndStore",
        args: [data.portfolioId as Hex, data.proof as Hex, data.publicInputs as Hex[]],
      });

      setConstraintTxHash(txHash);
      toast.success("Constraint compliance verified on-chain!", { id });
      refetchConstraint();
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100) ?? "Constraint verification failed", { id });
    } finally {
      setIsVerifyingConstraint(false);
    }
  }

  async function handleVerifyRating() {
    if (!address) return;
    setIsVerifyingRating(true);
    const id = toast.loading("Generating rating integrity proof...");
    try {
      // Use first bond's assetId — for demo, we use the portfolioId as proxy
      const res = await fetch("http://localhost:3001/api/bond/verify-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: attestation.portfolioId }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Server returned ${res.status}`);
      }
      const data = await res.json();

      toast.loading("Sign transaction to verify rating proof...", { id });
      const txHash = await writeContractAsync({
        abi: zkRatingVerifierAbi,
        address: VAULT_CONTRACTS.zkRatingVerifier,
        functionName: "verifyAndStore",
        args: [data.assetId as Hex, data.proof as Hex, data.publicInputs as Hex[]],
      });

      setRatingTxHash(txHash);
      toast.success("Rating integrity verified on-chain!", { id });
      refetchRating();
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100) ?? "Rating verification failed", { id });
    } finally {
      setIsVerifyingRating(false);
    }
  }

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
    <div className="space-y-4">
      {/* AI Attestation Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-4 text-fideza-lavender" />
            AI Attestation
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

      {/* ZK Proof Card */}
      <Card className={hasZKProof ? "border-emerald-500/30" : "border-amber-500/20"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="size-4 text-fideza-lime" />
            ZK Composition Proof
            {hasZKProof ? (
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs ml-auto">
                <CheckCircle2 className="size-3 mr-1" />
                Proven
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs ml-auto">
                Pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {hasZKProof
              ? "Portfolio composition verified via Noir ZK proof. Aggregate properties (value, coupon, ratings, diversification) are mathematically proven correct without revealing which bonds are held."
              : "Independently verify that the AI agent's attestation is correct. A zero-knowledge proof will cryptographically prove the portfolio composition matches the claimed properties — without revealing the bonds."}
          </p>

          {!hasZKProof && (
            <Button
              onClick={handleVerifyZK}
              disabled={isVerifying}
              className="w-full bg-fideza-lime/90 hover:bg-fideza-lime text-black font-medium"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Generating ZK Proof...
                </>
              ) : (
                <>
                  <ShieldQuestion className="size-4 mr-2" />
                  Verify with ZK Proof
                </>
              )}
            </Button>
          )}

          {zkTxHash && (
            <a
              href={explorerTxUrl(zkTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
            >
              <ExternalLink className="size-3" />
              ZK Proof TX
            </a>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Verifier Contract</span>
            <span className="font-mono text-xs">{truncateAddress(VAULT_CONTRACTS.zkPortfolioVerifier)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Proof System</span>
            <span className="font-mono text-xs">Noir / UltraHonk</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Verification</span>
            <span className="font-mono text-xs">{hasZKProof ? "On-chain (trustless)" : "ECDSA (trusted agent)"}</span>
          </div>

          <a
            href={explorerAddressUrl(VAULT_CONTRACTS.zkPortfolioVerifier)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-fideza-lime hover:underline pt-1"
          >
            <ExternalLink className="size-3" />
            View ZK Verifier on Explorer
          </a>
        </CardContent>
      </Card>

      {/* ZK Constraint Compliance Proof Card */}
      <Card className={hasConstraintProof ? "border-emerald-500/30" : "border-amber-500/20"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="size-4 text-blue-400" />
            ZK Constraint Compliance
            {hasConstraintProof ? (
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs ml-auto">
                <CheckCircle2 className="size-3 mr-1" />
                Proven
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs ml-auto">
                Pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {hasConstraintProof
              ? "Verified that the AI agent respected your investment constraints — rating range, max exposure, minimum bonds, and target yield are all mathematically proven compliant."
              : "Prove that the AI portfolio agent followed your original investment parameters. Verifies rating range, max single exposure, minimum bond count, and target yield constraints."}
          </p>

          {!hasConstraintProof && (
            <Button
              onClick={handleVerifyConstraint}
              disabled={isVerifyingConstraint}
              className="w-full bg-blue-500/90 hover:bg-blue-500 text-white font-medium"
            >
              {isVerifyingConstraint ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Generating Constraint Proof...
                </>
              ) : (
                <>
                  <FileCheck className="size-4 mr-2" />
                  Verify Constraint Compliance
                </>
              )}
            </Button>
          )}

          {constraintTxHash && (
            <a
              href={explorerTxUrl(constraintTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
            >
              <ExternalLink className="size-3" />
              Constraint Proof TX
            </a>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Verifier Contract</span>
            <span className="font-mono text-xs">{truncateAddress(VAULT_CONTRACTS.zkConstraintVerifier)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Proof System</span>
            <span className="font-mono text-xs">Noir / UltraHonk</span>
          </div>

          <a
            href={explorerAddressUrl(VAULT_CONTRACTS.zkConstraintVerifier)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-400 hover:underline pt-1"
          >
            <ExternalLink className="size-3" />
            View Constraint Verifier on Explorer
          </a>
        </CardContent>
      </Card>

      {/* ZK Rating Integrity Proof Card */}
      <Card className={hasRatingProof ? "border-emerald-500/30" : "border-amber-500/20"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="size-4 text-purple-400" />
            ZK Rating Integrity
            {hasRatingProof ? (
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs ml-auto">
                <CheckCircle2 className="size-3 mr-1" />
                Proven
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs ml-auto">
                Pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {hasRatingProof
              ? "Verified that the AI agent's published bond rating and risk score honestly derive from the private bond metadata. The AI didn't lie about what it saw."
              : "Prove that the AI's published rating and risk score were honestly computed from private bond data on the Privacy Node — verifies rating band, risk score, collateral disclosure, and coupon range."}
          </p>

          {!hasRatingProof && (
            <Button
              onClick={handleVerifyRating}
              disabled={isVerifyingRating}
              className="w-full bg-purple-500/90 hover:bg-purple-500 text-white font-medium"
            >
              {isVerifyingRating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Generating Rating Proof...
                </>
              ) : (
                <>
                  <Award className="size-4 mr-2" />
                  Verify Rating Integrity
                </>
              )}
            </Button>
          )}

          {ratingTxHash && (
            <a
              href={explorerTxUrl(ratingTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
            >
              <ExternalLink className="size-3" />
              Rating Proof TX
            </a>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Verifier Contract</span>
            <span className="font-mono text-xs">{truncateAddress(VAULT_CONTRACTS.zkRatingVerifier)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Proof System</span>
            <span className="font-mono text-xs">Noir / UltraHonk</span>
          </div>

          <a
            href={explorerAddressUrl(VAULT_CONTRACTS.zkRatingVerifier)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-purple-400 hover:underline pt-1"
          >
            <ExternalLink className="size-3" />
            View Rating Verifier on Explorer
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
