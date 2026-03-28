"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, ShieldCheck, FileCheck, Vote } from "lucide-react";
import { formatBytes32 } from "@/lib/format";
import { explorerTxUrl } from "@/lib/constants";
import { toast } from "sonner";

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

interface ProvenanceChainProps {
  complianceReportHash: string;
  policyVersionHash: string;
  governanceApprovalTx: string;
}

export function ProvenanceChain({
  complianceReportHash,
  policyVersionHash,
  governanceApprovalTx,
}: ProvenanceChainProps) {
  const steps = [
    {
      icon: ShieldCheck,
      label: "Compliance Report Hash",
      value: complianceReportHash,
      isHash: true,
    },
    {
      icon: FileCheck,
      label: "Policy Version Hash",
      value: policyVersionHash,
      isHash: true,
    },
    {
      icon: Vote,
      label: "Governance Approval",
      value: governanceApprovalTx,
      isHash: true,
      isLink: governanceApprovalTx !== ZERO_HASH,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-primary" />
          Provenance Chain
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4 pl-6">
          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
          {steps.map((step) => (
            <div key={step.label} className="relative">
              <div className="absolute -left-6 top-0.5 size-[7px] rounded-full bg-primary ring-2 ring-background" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {step.label}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <code className="text-xs font-mono text-foreground/80">
                  {step.value === ZERO_HASH ? "Pending" : formatBytes32(step.value)}
                </code>
                {step.value !== ZERO_HASH && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(step.value);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="size-3" />
                  </Button>
                )}
                {step.isLink && step.value !== ZERO_HASH && (
                  <a
                    href={explorerTxUrl(step.value)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="icon-xs">
                      <ExternalLink className="size-3" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
