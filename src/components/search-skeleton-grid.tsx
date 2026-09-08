import { Skeleton } from "@/components/ui/skeleton";

export function SearchSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-md" />
      ))}
    </div>
  );
}
