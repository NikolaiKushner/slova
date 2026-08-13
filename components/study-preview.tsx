/**
 * Decorative study card used on the public pages — landing and sign-in —
 * so both show the same object rather than two slightly different fakes.
 */
export function StudyPreview() {
  return (
    <div
      className="study-card relative mx-auto w-full max-w-sm -rotate-3 rounded-2xl border border-border bg-card px-8 py-10 shadow-sm"
      aria-hidden
    >
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-soft">
        Word
      </p>
      <p className="mt-4 font-display text-5xl tracking-tight text-foreground">
        hello
      </p>
      <div className="mt-10 border-t border-border pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-soft">
          Translation
        </p>
        <p className="mt-2 text-xl text-muted-foreground">привет</p>
      </div>
      <div className="pointer-events-none absolute -right-3 -top-3 size-16 rounded-full bg-accent/80 blur-2xl" />
    </div>
  );
}
