import { Skeleton } from "@/components/ui/skeleton";

export function AppRouteLoading() {
  return (
    <div className="container-wide w-full" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <header className="mb-10 space-y-3 pt-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-5 w-full max-w-lg" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function NarrowRouteLoading() {
  return (
    <div
      className="container-marketing flex min-h-dvh w-full items-center justify-center px-5 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading page</span>
      <div className="bg-card border-border w-full max-w-md space-y-5 rounded-2xl border px-6 py-9 shadow-card">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <div className="space-y-4 pt-3">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function PublicRouteLoading() {
  return (
    <div className="min-h-dvh px-5 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <div className="container-marketing mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="mx-auto max-w-3xl space-y-5 py-16 text-center">
          <Skeleton className="mx-auto h-4 w-28" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="mx-auto h-6 w-4/5" />
          <Skeleton className="mx-auto h-12 w-36 rounded-md" />
        </div>
      </div>
    </div>
  );
}
