import { Skeleton } from "@/components/ui/skeleton";

export default function TournamentDetailsLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[420px] w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
