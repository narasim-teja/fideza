/**
 * Reads available bonds from BondPropertyRegistry and filters by portfolio constraints.
 */
import { ethers } from "ethers";
import { config, abis } from "../config";
import type { PortfolioConstraints, RatedBondOnChain } from "../types";
import { isRatingInRange } from "./constraints";

// Map maturity preference keywords to on-chain maturity bucket strings
const MATURITY_MAP: Record<string, string[]> = {
  short: ["0-2 years"],
  medium: ["2-5 years"],
  long: ["5-10 years", "10+ years"],
  mixed: [], // accept all
};

/**
 * Read all available bonds from BondPropertyRegistry, map to TypeScript types,
 * and filter by user constraints.
 */
export async function scanAvailableBonds(
  provider: ethers.JsonRpcProvider,
  constraints: PortfolioConstraints,
): Promise<RatedBondOnChain[]> {
  const registry = new ethers.Contract(
    config.bondPropertyRegistryAddress,
    abis.bondPropertyRegistry,
    provider,
  );

  const rawBonds = await registry.getAvailableBonds();

  // Map Solidity structs to TypeScript
  const bonds: RatedBondOnChain[] = rawBonds.map((b: any) => ({
    assetId: b.assetId,
    bondTokenAddress: b.bondTokenAddress,
    assetType: b.assetType,
    rating: b.rating,
    couponRateBps: Number(b.couponRateBps),
    couponRange: b.couponRange,
    maturityBucket: b.maturityBucket,
    maturityTimestamp: b.maturityTimestamp,
    seniority: b.seniority,
    currency: b.currency,
    issuerCategory: b.issuerCategory,
    parValue: b.parValue,
    hasCollateral: b.hasCollateral,
    riskScore: Number(b.riskScore),
    complianceReportHash: b.complianceReportHash,
    availableForPortfolio: b.availableForPortfolio,
    availableSupply: b.availableSupply,
  }));

  console.log(`  Registry returned ${bonds.length} available bonds`);

  // Apply filters
  const minRating = constraints.minRating;
  const maxRating = constraints.maxRating ?? "AAA";
  const maturityPref = constraints.maturityPreference ?? "mixed";
  const currencyPref = constraints.currencyPreference ?? "any";
  const acceptedMaturities = MATURITY_MAP[maturityPref] ?? [];

  const filtered = bonds.filter((bond) => {
    // Rating range filter
    try {
      if (!isRatingInRange(bond.rating, minRating, maxRating)) return false;
    } catch {
      // Unknown rating — exclude
      return false;
    }

    // Maturity preference filter
    if (acceptedMaturities.length > 0 && !acceptedMaturities.includes(bond.maturityBucket)) {
      return false;
    }

    // Currency preference filter
    if (currencyPref !== "any" && bond.currency !== currencyPref) {
      return false;
    }

    // Must have supply
    if (bond.availableSupply <= 0n) return false;

    return true;
  });

  console.log(`  ${filtered.length} bonds pass constraint filters`);

  if (filtered.length < constraints.minBonds) {
    throw new Error(
      `Only ${filtered.length} bonds pass filters, but minBonds requires ${constraints.minBonds}. ` +
      `Try: wider rating range (current: ${maxRating} to ${minRating}), ` +
      `maturityPreference: "mixed", currencyPreference: "any"`,
    );
  }

  return filtered;
}
