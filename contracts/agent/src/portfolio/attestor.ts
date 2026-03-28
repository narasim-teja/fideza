/**
 * Portfolio attestation — compute aggregate metrics and ECDSA sign.
 * Follows the same signing pattern as submitAttestation.ts.
 */
import { ethers } from "ethers";
import type { OptimizedPortfolio, PortfolioAttestation, RatedBondOnChain } from "../types";
import { ratingToIndex, RATING_SCALE } from "./constraints";

/**
 * Compute aggregate portfolio metrics and produce a signed attestation.
 */
export async function attestPortfolio(
  portfolio: OptimizedPortfolio,
  portfolioId: string,
  bonds: RatedBondOnChain[],
  wallet: ethers.Wallet,
): Promise<PortfolioAttestation> {
  const bondMap = new Map(bonds.map((b) => [b.assetId, b]));

  // Total value = sum of all allocation amounts
  const totalValue = portfolio.allocations.reduce(
    (sum, a) => sum + a.amount,
    0n,
  );

  // Rating range (min/max of holdings)
  const ratingRange = computeRatingRange(portfolio.allocations);

  // Weighted coupon (already computed in optimizer)
  const weightedCouponBps = portfolio.weightedCouponBps;

  // Average maturity in months from now
  const avgMaturityMonths = computeAvgMaturityMonths(portfolio.allocations);

  // Diversification score (already computed in optimizer)
  const diversificationScore = portfolio.diversificationScore;

  // Number of bonds
  const numBonds = portfolio.allocations.length;

  // Max single exposure percentage
  const maxSingleExposurePct = Math.max(
    ...portfolio.allocations.map((a) => a.weightBps),
  ) / 100;

  // Methodology hash
  const methodologyHash = ethers.keccak256(
    ethers.toUtf8Bytes(
      `fideza-portfolio-v1-${portfolio.method}-optimizer`,
    ),
  );

  // Sign attestation — same ECDSA pattern as submitAttestation.ts
  const messageHash = ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "uint256", "uint256", "uint8", "uint8", "bytes32"],
      [
        portfolioId,
        totalValue,
        weightedCouponBps,
        numBonds,
        diversificationScore,
        methodologyHash,
      ],
    ),
  );

  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  const attestation: PortfolioAttestation = {
    portfolioId,
    totalValue,
    ratingRange,
    weightedCouponBps,
    avgMaturityMonths,
    diversificationScore,
    numBonds,
    maxSingleExposurePct,
    methodologyHash,
    signature,
  };

  // Log attestation details
  console.log(`  Total value: ${totalValue}`);
  console.log(`  Rating range: ${ratingRange}`);
  console.log(`  Weighted coupon: ${weightedCouponBps} bps`);
  console.log(`  Avg maturity: ${avgMaturityMonths} months`);
  console.log(`  Diversification score: ${diversificationScore}/10`);
  console.log(`  Num bonds: ${numBonds}`);
  console.log(`  Max single exposure: ${maxSingleExposurePct}%`);
  console.log(`  Methodology: ${methodologyHash}`);
  console.log(`  Signature: ${signature.slice(0, 20)}...`);

  return attestation;
}

/**
 * Compute the rating range string (e.g., "BB+ to A") from allocations.
 */
function computeRatingRange(
  allocations: { rating: string }[],
): string {
  let bestIdx = Infinity;
  let worstIdx = -1;

  for (const a of allocations) {
    try {
      const idx = ratingToIndex(a.rating);
      if (idx < bestIdx) bestIdx = idx;
      if (idx > worstIdx) worstIdx = idx;
    } catch {
      // Skip unknown ratings
    }
  }

  if (bestIdx === Infinity || worstIdx === -1) return "N/A";

  const best = RATING_SCALE[bestIdx];
  const worst = RATING_SCALE[worstIdx];
  return best === worst ? best : `${worst} to ${best}`;
}

/**
 * Compute weighted average maturity in months from now.
 */
function computeAvgMaturityMonths(
  allocations: { weightBps: number; maturityTimestamp: bigint }[],
): number {
  const now = BigInt(Math.floor(Date.now() / 1000));
  let weightedMonths = 0;
  let totalWeight = 0;

  for (const a of allocations) {
    const secondsToMaturity = Number(a.maturityTimestamp - now);
    const months = Math.max(0, Math.round(secondsToMaturity / (30 * 24 * 3600)));
    weightedMonths += a.weightBps * months;
    totalWeight += a.weightBps;
  }

  return totalWeight > 0 ? Math.round(weightedMonths / totalWeight) : 0;
}
