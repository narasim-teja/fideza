"use client";

import type { Hex } from "viem";
import { useReceipt, useSplit } from "./use-contracts";
import { parseDisclosure } from "@/lib/format";

export function useReceiptData(assetId: Hex) {
  const receipt = useReceipt(assetId);
  const split = useSplit(assetId);
  const disclosure = receipt.data
    ? parseDisclosure(receipt.data.disclosureJSON)
    : null;

  return {
    receipt,
    split,
    disclosure,
    isLoading: receipt.isLoading || split.isLoading,
  };
}
