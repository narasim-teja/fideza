/**
 * Portfolio weight optimization — LLM-assisted with deterministic greedy fallback.
 *
 * Pass 1: LLM proposes weights based on constraints + available bonds.
 * Pass 2: If LLM output fails validation → greedy equal-weight with cap redistribution.
 */
import type {
  PortfolioConstraints,
  RatedBondOnChain,
  PortfolioAllocation,
  OptimizedPortfolio,
} from "../types";
import { bigintReplacer } from "../types";
import { callLLM, parseJSON } from "../providers/llm";

interface LLMAllocation {
  assetId: string;
  weightBps: number;
  rationale?: string;
}

interface LLMResponse {
  allocations: LLMAllocation[];
  portfolioRationale?: string;
}

// ---------------------------------------------------------------------------
// LLM optimization (Pass 1)
// ---------------------------------------------------------------------------

function buildSystemPrompt(constraints: PortfolioConstraints): string {
  return `You are a portfolio construction AI for Fideza, a private credit protocol.
You receive a set of rated bonds and user constraints, and must output optimal weight allocations.

HARD RULES (violations = rejection):
1. Minimum ${constraints.minBonds} bonds in portfolio
2. No single bond exceeds ${constraints.maxSingleExposurePct}% weight (${constraints.maxSingleExposurePct * 100} bps)
3. All weights must sum to exactly 10000 (basis points = 100%)
4. At least 2 different asset types must be represented
5. Weighted average rating must fall within [${constraints.maxRating ?? "AAA"}, ${constraints.minRating}]

OPTIMIZATION OBJECTIVES (in priority order):
1. Weighted average coupon should approximate ${constraints.targetYieldBps} bps
2. Maximize diversification score (minimize concentration)
3. Prefer bonds with lower risk scores
4. Balance maturity across short/medium/long per user preference: "${constraints.maturityPreference ?? "mixed"}"

RISK PHILOSOPHY:
- Diversification is the primary defense against default
- No single issuer/sector should dominate
- Collateralized bonds should be preferred when risk scores are similar
- Higher-yield bonds (BB range) are acceptable but must be offset by IG bonds

Output ONLY valid JSON (no markdown fences, no extra text):
{
  "allocations": [
    { "assetId": "0x...", "weightBps": 1000, "rationale": "..." },
    ...
  ],
  "portfolioRationale": "..."
}`;
}

function buildUserPrompt(
  bonds: RatedBondOnChain[],
  constraints: PortfolioConstraints,
): string {
  const bondSummary = bonds.map((b) => ({
    assetId: b.assetId,
    assetType: b.assetType,
    rating: b.rating,
    couponRateBps: b.couponRateBps,
    maturityBucket: b.maturityBucket,
    currency: b.currency,
    issuerCategory: b.issuerCategory,
    hasCollateral: b.hasCollateral,
    riskScore: b.riskScore,
    seniority: b.seniority,
  }));

  return `AVAILABLE BONDS:
${JSON.stringify(bondSummary, null, 2)}

USER CONSTRAINTS:
${JSON.stringify(constraints, null, 2)}

Construct the optimal portfolio. Select at least ${constraints.minBonds} bonds. Weights must sum to exactly 10000 bps. No single bond may exceed ${constraints.maxSingleExposurePct * 100} bps.`;
}

/**
 * Validate LLM-proposed allocations against hard constraints.
 * Returns null if valid, or an error string if invalid.
 */
function validateLLMOutput(
  allocs: LLMAllocation[],
  bonds: RatedBondOnChain[],
  constraints: PortfolioConstraints,
): string | null {
  if (!allocs || !Array.isArray(allocs) || allocs.length === 0) {
    return "No allocations returned";
  }

  // Check minimum bonds
  const nonZero = allocs.filter((a) => a.weightBps > 0);
  if (nonZero.length < constraints.minBonds) {
    return `Only ${nonZero.length} bonds with non-zero weight, need ${constraints.minBonds}`;
  }

  // Check all assetIds exist
  const bondMap = new Map(bonds.map((b) => [b.assetId, b]));
  for (const a of allocs) {
    if (!bondMap.has(a.assetId)) {
      return `Unknown assetId: ${a.assetId}`;
    }
  }

  // Check weights sum
  const totalWeight = allocs.reduce((s, a) => s + a.weightBps, 0);
  if (totalWeight !== 10000) {
    return `Weights sum to ${totalWeight}, not 10000`;
  }

  // Check max single exposure
  const maxBps = constraints.maxSingleExposurePct * 100;
  for (const a of allocs) {
    if (a.weightBps > maxBps) {
      return `Bond ${a.assetId.slice(0, 10)}... has weight ${a.weightBps} bps, exceeds cap ${maxBps}`;
    }
  }

  // Check at least 2 asset types
  const types = new Set(
    nonZero.map((a) => bondMap.get(a.assetId)!.assetType),
  );
  if (types.size < 2) {
    return `Only ${types.size} asset type(s) represented, need at least 2`;
  }

  return null; // valid
}

async function llmOptimize(
  bonds: RatedBondOnChain[],
  constraints: PortfolioConstraints,
): Promise<OptimizedPortfolio | null> {
  try {
    const systemPrompt = buildSystemPrompt(constraints);
    const userPrompt = buildUserPrompt(bonds, constraints);

    console.log("  Pass 1: LLM optimization...");
    const raw = await callLLM(systemPrompt, userPrompt);
    const parsed = parseJSON<LLMResponse>(raw);

    const error = validateLLMOutput(parsed.allocations, bonds, constraints);
    if (error) {
      console.log(`  LLM output failed validation: ${error}`);
      return null;
    }

    // Build PortfolioAllocation objects
    const bondMap = new Map(bonds.map((b) => [b.assetId, b]));
    const allocations: PortfolioAllocation[] = parsed.allocations
      .filter((a) => a.weightBps > 0)
      .map((a) => {
        const bond = bondMap.get(a.assetId)!;
        const amount = (bond.availableSupply * BigInt(a.weightBps)) / 10000n;
        return {
          assetId: a.assetId,
          bondTokenAddress: bond.bondTokenAddress,
          weightBps: a.weightBps,
          amount,
          rating: bond.rating,
          couponRateBps: bond.couponRateBps,
          assetType: bond.assetType,
          maturityTimestamp: bond.maturityTimestamp,
          rationale: a.rationale,
        };
      });

    return buildPortfolioMetrics(allocations, bonds, "llm");
  } catch (e: any) {
    console.log(`  LLM optimization failed: ${e.message?.slice(0, 120)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Greedy fallback (Pass 2)
// ---------------------------------------------------------------------------

function greedyAllocate(
  bonds: RatedBondOnChain[],
  constraints: PortfolioConstraints,
): OptimizedPortfolio {
  console.log("  Pass 2: Greedy fallback...");

  // Sort by risk-adjusted yield: higher coupon/riskScore ratio = better
  const sorted = [...bonds].sort((a, b) => {
    const yieldA = a.riskScore > 0 ? a.couponRateBps / a.riskScore : a.couponRateBps;
    const yieldB = b.riskScore > 0 ? b.couponRateBps / b.riskScore : b.couponRateBps;
    return yieldB - yieldA;
  });

  // Select top N bonds
  const count = Math.max(constraints.minBonds, Math.min(sorted.length, 12));
  const selected = sorted.slice(0, count);

  // Equal-weight with cap redistribution
  const maxBps = constraints.maxSingleExposurePct * 100;
  const weights = new Array(selected.length).fill(0);
  let remaining = 10000;

  // Initial equal split
  const baseBps = Math.floor(10000 / selected.length);
  for (let i = 0; i < selected.length; i++) {
    weights[i] = Math.min(baseBps, maxBps);
    remaining -= weights[i];
  }

  // Redistribute remaining to uncapped bonds
  let iterations = 0;
  while (remaining > 0 && iterations < 20) {
    const uncapped = weights
      .map((w, i) => ({ w, i }))
      .filter((x) => x.w < maxBps);
    if (uncapped.length === 0) break;

    const perBond = Math.floor(remaining / uncapped.length);
    const extra = remaining % uncapped.length;

    let distributed = 0;
    for (let j = 0; j < uncapped.length; j++) {
      const add = Math.min(perBond + (j < extra ? 1 : 0), maxBps - uncapped[j].w);
      weights[uncapped[j].i] += add;
      distributed += add;
    }
    remaining -= distributed;
    iterations++;
  }

  // If still remaining (rounding), add 1 bps to first uncapped bonds
  let idx = 0;
  while (remaining > 0 && idx < weights.length) {
    if (weights[idx] < maxBps) {
      weights[idx]++;
      remaining--;
    }
    idx++;
  }

  // Build allocations
  const allocations: PortfolioAllocation[] = selected.map((bond, i) => {
    const amount = (bond.availableSupply * BigInt(weights[i])) / 10000n;
    return {
      assetId: bond.assetId,
      bondTokenAddress: bond.bondTokenAddress,
      weightBps: weights[i],
      amount,
      rating: bond.rating,
      couponRateBps: bond.couponRateBps,
      assetType: bond.assetType,
      maturityTimestamp: bond.maturityTimestamp,
      rationale: "Greedy allocation by risk-adjusted yield",
    };
  });

  return buildPortfolioMetrics(allocations, bonds, "greedy");
}

// ---------------------------------------------------------------------------
// Shared metric computation
// ---------------------------------------------------------------------------

function buildPortfolioMetrics(
  allocations: PortfolioAllocation[],
  _bonds: RatedBondOnChain[],
  method: "llm" | "greedy",
): OptimizedPortfolio {
  const bondMap = new Map(_bonds.map((b) => [b.assetId, b]));
  const totalWeightBps = allocations.reduce((s, a) => s + a.weightBps, 0);

  // Weighted average coupon
  const weightedCouponBps = Math.round(
    allocations.reduce((s, a) => s + a.weightBps * a.couponRateBps, 0) / totalWeightBps,
  );

  // Weighted average risk score
  const weightedRiskScore = Math.round(
    allocations.reduce((s, a) => {
      const bond = bondMap.get(a.assetId)!;
      return s + a.weightBps * bond.riskScore;
    }, 0) / totalWeightBps,
  );

  // Diversification score: 10 - floor(HHI * 10)
  // HHI = sum((w_i / 10000)^2)
  const hhi = allocations.reduce((s, a) => {
    const w = a.weightBps / 10000;
    return s + w * w;
  }, 0);
  const diversificationScore = Math.max(0, 10 - Math.floor(hhi * 10));

  return {
    allocations,
    totalWeightBps,
    weightedCouponBps,
    weightedRiskScore,
    diversificationScore,
    method,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Optimize portfolio allocation using LLM (Pass 1) with greedy fallback (Pass 2).
 */
export async function optimizePortfolio(
  bonds: RatedBondOnChain[],
  constraints: PortfolioConstraints,
): Promise<OptimizedPortfolio> {
  // Pass 1: LLM
  const llmResult = await llmOptimize(bonds, constraints);
  if (llmResult) {
    console.log("  LLM optimization succeeded");
    return llmResult;
  }

  // Pass 2: Greedy fallback
  const greedyResult = greedyAllocate(bonds, constraints);
  console.log("  Greedy fallback completed");
  return greedyResult;
}
