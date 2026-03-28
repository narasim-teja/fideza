import { Skeleton } from "@/components/ui/skeleton";

export default function LendingLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80 mt-2" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
