import type { AssetReadResult, CheckResult } from "../types";
import { runInvoiceChecks } from "../schemas/invoice";
import { runBondChecks } from "../schemas/bond";
import { runABSChecks } from "../schemas/abs";

import invoicePolicy from "../policies/invoice-policy.json";
import bondPolicy from "../policies/bond-policy.json";
import absPolicy from "../policies/abs-policy.json";

export function runRulesEngine(
  asset: AssetReadResult,
  issuerApproved: boolean,
): CheckResult[] {
  switch (asset.type) {
    case "INVOICE":
      return runInvoiceChecks(
        asset.metadata,
        issuerApproved,
        invoicePolicy as any,
      );
    case "BOND":
      return runBondChecks(
        asset.metadata,
        issuerApproved,
        bondPolicy as any,
      );
    case "ABS_TRANCHE":
      return runABSChecks(
        asset.metadata,
        asset.poolAggregates,
        issuerApproved,
        absPolicy as any,
      );
  }
}
