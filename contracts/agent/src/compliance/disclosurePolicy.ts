import type {
  AssetReadResult,
  DisclosureRecommendation,
  PolicyDisclosureConfig,
} from "../types";
import { bigintReplacer } from "../types";

import invoicePolicy from "../policies/invoice-policy.json";
import bondPolicy from "../policies/bond-policy.json";
import absPolicy from "../policies/abs-policy.json";

function getDisclosureConfig(assetType: string): PolicyDisclosureConfig {
  switch (assetType) {
    case "INVOICE":
      return invoicePolicy.disclosure;
    case "BOND":
      return bondPolicy.disclosure;
    case "ABS_TRANCHE":
      return absPolicy.disclosure;
    default:
      throw new Error(`Unknown asset type: ${assetType}`);
  }
}

function getMetadataValue(metadata: unknown, field: string): string {
  const obj = metadata as Record<string, unknown>;
  const val = obj[field];
  if (val === undefined || val === null) return "";
  if (typeof val === "bigint") return val.toString();
  return String(val);
}

function getBucketedValue(
  asset: AssetReadResult,
  field: string,
): string {
  // Return the bucketed value based on what the on-chain disclosure would produce
  const metadata = asset.metadata as unknown as Record<string, unknown>;

  if (asset.type === "INVOICE") {
    if (field === "faceValue") {
      const fv = Number(metadata.faceValue);
      if (fv < 5_000_000) return "0-5M";
      if (fv < 25_000_000) return "5M-25M";
      if (fv < 100_000_000) return "25M-100M";
      return "100M+";
    }
    if (field === "dueDate") {
      const days = Number(
        ((metadata.dueDate as bigint) - (metadata.issueDate as bigint)) / 86400n,
      );
      if (days <= 30) return "0-30 days";
      if (days <= 60) return "30-60 days";
      if (days <= 90) return "60-90 days";
      if (days <= 180) return "90-180 days";
      return "180+ days";
    }
    if (field === "debtorCreditRating") {
      const rating = String(metadata.debtorCreditRating);
      if (rating.startsWith("A") || rating.startsWith("BBB")) return "Tier A";
      if (rating.startsWith("BB")) return "Tier B";
      return "Tier C";
    }
  }

  if (asset.type === "BOND") {
    if (field === "couponRateBps") {
      const bps = Number(metadata.couponRateBps);
      if (bps < 300) return "0-3%";
      if (bps < 600) return "3-6%";
      if (bps < 1000) return "6-10%";
      return "10%+";
    }
    if (field === "maturityDate") {
      const years = Number(
        ((metadata.maturityDate as bigint) - (metadata.issueDate as bigint)) /
          (365n * 86400n),
      );
      if (years <= 2) return "0-2 years";
      if (years <= 5) return "2-5 years";
      if (years <= 10) return "5-10 years";
      return "10+ years";
    }
    if (field === "issuerCreditRating") {
      const rating = String(metadata.issuerCreditRating);
      if (
        rating.startsWith("A") ||
        rating.startsWith("BBB")
      )
        return "IG";
      if (rating === "NR") return "NR";
      return "HY";
    }
  }

  if (asset.type === "ABS_TRANCHE") {
    if (field === "expectedMaturity") {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const mat = metadata.expectedMaturity as bigint;
      const years = Number((mat - now) / (365n * 86400n));
      if (years <= 0) return "Matured";
      if (years <= 2) return "0-2 years";
      if (years <= 5) return "2-5 years";
      return "5+ years";
    }
    if (field === "totalPoolSize") {
      const size = Number(metadata.totalPoolSize);
      if (size < 50) return "<50 loans";
      if (size < 100) return "50-100 loans";
      if (size < 500) return "100-500 loans";
      return "500+ loans";
    }
    if (field === "totalPoolNotional") {
      const notional = Number(metadata.totalPoolNotional);
      if (notional < 10_000_000) return "<10M";
      if (notional < 50_000_000) return "10M-50M";
      if (notional < 100_000_000) return "50M-100M";
      return "100M+";
    }
  }

  return getMetadataValue(metadata, field);
}

export function generateDisclosure(
  asset: AssetReadResult,
): DisclosureRecommendation {
  const config = getDisclosureConfig(asset.type);
  const metadata = asset.metadata as unknown as Record<string, unknown>;

  const disclosedFields: string[] = config.disclosed.map((field) => field);

  const withheldFields = config.withheld.map((w) => ({
    field: w.field,
    reason: w.reason,
  }));

  const bucketedFields = config.bucketed.map((b) => ({
    field: b.field,
    originalValue: getMetadataValue(metadata, b.field),
    bucketedValue: getBucketedValue(asset, b.field),
    reason: b.reason,
  }));

  return { disclosedFields, withheldFields, bucketedFields };
}
