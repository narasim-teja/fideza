/**
 * Portfolio constraint parsing, validation, and rating scale utilities.
 */
import type { PortfolioConstraints } from "../types";

// Credit rating scale — index 0 = best (AAA), index 16 = worst (CCC)
export const RATING_SCALE = [
  "AAA", "AA+", "AA", "AA-",
  "A+", "A", "A-",
  "BBB+", "BBB", "BBB-",
  "BB+", "BB", "BB-",
  "B+", "B", "B-",
  "CCC",
] as const;

/**
 * Convert a rating string to its numeric index (lower = better).
 * Throws if the rating is not recognized.
 */
export function ratingToIndex(rating: string): number {
  const idx = RATING_SCALE.indexOf(rating as any);
  if (idx === -1) {
    throw new Error(
      `Unknown rating "${rating}". Valid ratings: ${RATING_SCALE.join(", ")}`,
    );
  }
  return idx;
}

/**
 * Check if a rating falls within [maxRating, minRating] inclusive.
 * Note: maxRating has a LOWER index (better), minRating has a HIGHER index (worse).
 * Example: isRatingInRange("BBB", "BB-", "A+") checks BBB is between A+ and BB-.
 */
export function isRatingInRange(
  rating: string,
  minRating: string,
  maxRating: string,
): boolean {
  const idx = ratingToIndex(rating);
  const minIdx = ratingToIndex(minRating); // worst acceptable (higher index)
  const maxIdx = ratingToIndex(maxRating); // best acceptable (lower index)
  return idx >= maxIdx && idx <= minIdx;
}

/**
 * Parse a JSON string into PortfolioConstraints, applying defaults.
 */
export function parseConstraints(jsonStr: string): PortfolioConstraints {
  let raw: any;
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Invalid constraints JSON: ${jsonStr.slice(0, 100)}`);
  }

  return {
    minRating: raw.minRating ?? raw.ratingRange?.[0] ?? "BB-",
    maxRating: raw.maxRating ?? raw.ratingRange?.[1] ?? "AAA",
    targetYieldBps: raw.targetYieldBps ?? 400,
    maxSingleExposurePct: raw.maxSingleExposurePct ?? 15,
    minBonds: raw.minBonds ?? 10,
    maturityPreference: raw.maturityPreference ?? "mixed",
    currencyPreference: raw.currencyPreference ?? "any",
    riskTolerance: raw.riskTolerance ?? "moderate",
  };
}

/**
 * Validate constraints for mathematical feasibility.
 * Throws descriptive errors if constraints are invalid.
 */
export function validateConstraints(c: PortfolioConstraints): void {
  // Min bonds
  if (c.minBonds < 3) {
    throw new Error(`minBonds must be >= 3 (got ${c.minBonds})`);
  }

  // Max single exposure must be feasible
  // If each bond is capped at X%, we need at least ceil(100/X) bonds
  if (c.maxSingleExposurePct * c.minBonds < 100) {
    throw new Error(
      `maxSingleExposurePct (${c.maxSingleExposurePct}%) * minBonds (${c.minBonds}) = ${c.maxSingleExposurePct * c.minBonds}%, ` +
      `which is < 100%. Cannot fill portfolio. Increase maxSingleExposurePct or decrease minBonds.`,
    );
  }

  // Valid rating range
  const minIdx = ratingToIndex(c.minRating);
  const maxIdx = ratingToIndex(c.maxRating ?? "AAA");
  if (minIdx < maxIdx) {
    throw new Error(
      `Invalid rating range: minRating "${c.minRating}" (index ${minIdx}) is better than maxRating "${c.maxRating}" (index ${maxIdx}). ` +
      `minRating should be the WORST acceptable rating.`,
    );
  }

  // Yield sanity
  if (c.targetYieldBps < 0 || c.targetYieldBps > 2000) {
    throw new Error(`targetYieldBps must be 0-2000 (got ${c.targetYieldBps})`);
  }

  // Maturity preference
  const validMaturities = ["short", "medium", "long", "mixed"];
  if (c.maturityPreference && !validMaturities.includes(c.maturityPreference)) {
    throw new Error(
      `Invalid maturityPreference "${c.maturityPreference}". Valid: ${validMaturities.join(", ")}`,
    );
  }

  // Currency preference
  const validCurrencies = ["USD", "BRL", "any"];
  if (c.currencyPreference && !validCurrencies.includes(c.currencyPreference)) {
    throw new Error(
      `Invalid currencyPreference "${c.currencyPreference}". Valid: ${validCurrencies.join(", ")}`,
    );
  }
}
