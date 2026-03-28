import { formatUnits } from "viem";

export function formatWei(value: bigint, decimals = 18, displayDecimals = 2): string {
  const formatted = formatUnits(value, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return "0";
  if (num < 0.01) return "<0.01";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}

export function formatUSDr(value: bigint): string {
  return `${formatWei(value)} USDr`;
}

export function truncateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBytes32(hash: string): string {
  if (hash.length < 14) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-4)}`;
}

export function parseDisclosure(json: string): Record<string, unknown> | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function formatTimestamp(ts: number | bigint): string {
  const seconds = typeof ts === "bigint" ? Number(ts) : ts;
  if (seconds === 0) return "N/A";
  return new Date(seconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isMatured(ts: number | bigint): boolean {
  const seconds = typeof ts === "bigint" ? Number(ts) : ts;
  if (seconds === 0) return false;
  return Date.now() > seconds * 1000;
}

export function timeToMaturity(ts: number | bigint): string {
  const seconds = typeof ts === "bigint" ? Number(ts) : ts;
  if (seconds === 0) return "No maturity";
  const now = Date.now();
  const maturity = seconds * 1000;
  if (now > maturity) return "Matured";
  const diff = maturity - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 365) return `${Math.floor(days / 365)}y ${days % 365}d`;
  if (days > 0) return `${days}d remaining`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h remaining`;
}
