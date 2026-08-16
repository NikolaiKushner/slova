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

/**
 * A single-format drill: the bar, the prompt, four options, the verdict line.
 *
 * It cancels the page padding exactly as FocusShell does, because the bar it
 * stands in for runs edge to edge and is 64px tall. Inset by a page margin
 * instead, the placeholder bar sat lower and narrower than the real one and
 * the whole screen shifted when the words arrived.
 */
export function DrillSkeleton() {
  return (
    <div
      className="-mx-(--page-px) -mt-(--page-pt) -mb-(--page-pb) flex min-h-0 flex-1 flex-col"
      aria-busy
      aria-live="polite"
    >
      <div className="border-border flex min-h-16 shrink-0 items-center gap-6 border-b px-4 md:px-8">
        <Skeleton className="h-5 w-24 sm:min-w-[150px]" />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <Skeleton className="h-[5px] w-full max-w-[420px] rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-28 sm:min-w-[150px]" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pt-8 pb-18 md:px-8">
        <div className="container-focus w-full">
          {/* Heights track the real lines: overline 14, caption 19. */}
          <div className="mb-5 flex flex-col items-center gap-1.5">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-[19px] w-24" />
          </div>

          <div className="flex min-h-[150px] flex-col items-center justify-center">
            <Skeleton className="h-11 w-56" />
          </div>

          <div className="mt-5 flex min-h-[232px] flex-col justify-center gap-2">
            {Array.from({ length: 4 }, (_, option) => (
              <Skeleton key={option} className="h-[52px] w-full rounded-lg" />
            ))}
          </div>

          <div className="mt-5 flex min-h-[52px] items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-12 w-28 rounded-md" />
          </div>

          {/* The key hints line, which the real screen always draws. */}
          <div className="mt-4 flex justify-center">
            <Skeleton className="h-[21px] w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
