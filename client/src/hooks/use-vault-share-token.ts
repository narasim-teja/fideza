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

  // 1. Check localStorage cache
  const cache = getCache();
  const cached = cache[portfolioId.toLowerCase()];
  if (cached) return cached as Address;

  // 2. Fall back to static known tokens
  if (VAULT_SHARE_TOKENS.length > 0) {
    return VAULT_SHARE_TOKENS[0].address;
  }

  return undefined;
}
