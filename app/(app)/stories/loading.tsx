import { Skeleton } from "@/components/ui/skeleton";

export default function StoriesLoading() {
  return (
    <div className="container-list w-full" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <header className="mb-10 space-y-3 pt-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-5 w-full max-w-md" />
      </header>
      <div className="space-y-10">
        <Skeleton className="h-[164px] rounded-xl" />
        <div className="space-y-0 overflow-hidden rounded-xl border border-border">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-[72px] rounded-none border-b border-border last:border-b-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
