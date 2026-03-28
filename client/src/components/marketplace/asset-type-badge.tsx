import { Badge } from "@/components/ui/badge";
import { ASSET_TYPE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  INVOICE: "Invoice",
  BOND: "Bond",
  ABS_TRANCHE: "ABS Tranche",
};

export function AssetTypeBadge({ type }: { type: string }) {
  const colors = ASSET_TYPE_COLORS[type] ?? ASSET_TYPE_COLORS.INVOICE;
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] uppercase tracking-wider", colors.bg, colors.text, colors.border)}
    >
      {LABELS[type] ?? type}
    </Badge>
  );
}
