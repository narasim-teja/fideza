"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DISCLOSURE_FIELD_LABELS } from "@/lib/constants";
import { FileText } from "lucide-react";

const HIDDEN_FIELDS = new Set([
  "complianceReportHash",
  "policyVersionHash",
  "governanceApprovalTx",
  "agentSignature",
]);

export function DisclosurePanel({
  disclosure,
}: {
  disclosure: Record<string, unknown> | null;
}) {
  if (!disclosure) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="size-4" />
            Disclosure Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No disclosure data available</p>
        </CardContent>
      </Card>
    );
  }

  const entries = Object.entries(disclosure).filter(
    ([key]) => !HIDDEN_FIELDS.has(key)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="size-4" />
          Disclosure Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {entries.map(([key, value]) => (
            <div key={key}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {DISCLOSURE_FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").trim()}
              </p>
              <p className="text-sm font-medium mt-0.5">
                {renderValue(value)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return String(value);
}
