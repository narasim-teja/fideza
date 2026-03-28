import { cn } from "@/lib/utils";

export function RiskBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-emerald-400 bg-emerald-500/10"
      : score >= 60
        ? "text-yellow-400 bg-yellow-500/10"
        : "text-red-400 bg-red-500/10";

  const tier = score >= 80 ? "A" : score >= 60 ? "B" : "C";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
        color
      )}
    >
      {score} <span className="text-[10px] opacity-70">({tier})</span>
    </span>
  );
}
