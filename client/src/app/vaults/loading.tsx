import { Skeleton } from "@/components/ui/skeleton";

export default function VaultsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>
      <Skeleton className="h-10 w-80" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
