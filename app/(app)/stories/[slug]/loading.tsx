import { Skeleton } from "@/components/ui/skeleton";

export default function StoryReaderLoading() {
  return (
    <div className="container-prose w-full" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mt-6 h-9 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <div className="mt-8 space-y-3.5">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-11/12" />
        <Skeleton className="h-20 w-4/5" />
        <Skeleton className="h-20 w-2/3" />
      </div>
    </div>
  );
}
