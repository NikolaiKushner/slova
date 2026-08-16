import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading states shaped like what is about to arrive.
 *
 * §16 asks for a skeleton in the form of the content rather than a spinner,
 * and the reason is the one in §1.4: a placeholder of the wrong size is a
 * layout that jumps the moment the data lands. The old one was a small bar and
 * a box floating in the middle of an empty column — it told you something was
 * happening and lied about where.
 *
 * These mirror the real screens closely enough that the swap is quiet: same
 * container, same rhythm, same heights.
 */

/** The brainstorm start screen: heading, the word list, the rungs, the start row. */
export function BrainstormStartSkeleton() {
  return (
    <div
      className="container-focus flex w-full flex-col gap-8 py-4"
      aria-busy
      aria-live="polite"
    >
      <header className="flex flex-col items-center gap-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-[40ch]" />
        <Skeleton className="h-4 w-3/4 max-w-[32ch]" />
      </header>

      <div className="bg-card border-border divide-border-subtle divide-y overflow-hidden rounded-xl border">
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="flex items-center gap-3.5 px-5 py-3">
            <Skeleton className="h-6 w-[120px]" />
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 6 }, (_, chip) => (
          <Skeleton key={chip} className="h-7 w-32 rounded-full" />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3.5">
        <Skeleton className="h-11 w-[268px] rounded-md" />
        <Skeleton className="h-12 w-44 rounded-md" />
      </div>
    </div>
  );
}

/** A single-format drill: the bar, the prompt, four options, the verdict line. */
export function DrillSkeleton() {
  return (
    <div aria-busy aria-live="polite">
      <div className="border-border flex items-center gap-4 border-b pb-3">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-1.5 flex-1 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="mx-auto max-w-[520px] space-y-8 py-10">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-56" />
        </div>

        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, option) => (
            <Skeleton key={option} className="h-12 w-full rounded-lg" />
          ))}
        </div>

        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
