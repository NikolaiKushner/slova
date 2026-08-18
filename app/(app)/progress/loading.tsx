import { Skeleton } from "@/components/ui/skeleton";

export default function ProgressLoading() {
  return (
    <div className="container-dashboard w-full" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <header className="mb-5 space-y-3 pt-2 md:mb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-5 w-full max-w-lg" />
      </header>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[132px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
