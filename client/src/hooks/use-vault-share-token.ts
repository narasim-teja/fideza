import type { Address, Hex } from "viem";
import { VAULT_SHARE_TOKENS } from "@/lib/contracts";

const STORAGE_KEY = "fideza-portfolio-share-tokens";

/** Read cached portfolioId → shareTokenAddress map from localStorage. */
function getCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Save a portfolioId → shareTokenAddress mapping to localStorage. */
export function cacheShareToken(portfolioId: string, shareTokenAddress: string) {
  if (typeof window === "undefined") return;
  const cache = getCache();
  cache[portfolioId.toLowerCase()] = shareTokenAddress;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

/** Resolve vault share token address for a given portfolioId. */
export function useVaultShareToken(portfolioId: Hex | undefined): Address | undefined {
  if (!portfolioId) return undefined;

  const key = portfolioId.toLowerCase();

  // 1. Check localStorage cache (populated during UI portfolio creation)
  const cache = getCache();
  const cached = cache[key];
  if (cached) return cached as Address;

  // 2. Check known portfolioId → mirror address map
  if (VAULT_SHARE_TOKENS[key]) {
    return VAULT_SHARE_TOKENS[key];
  }

  // 3. Fall back to default mirror address
  return VAULT_SHARE_TOKENS["default"];
}
