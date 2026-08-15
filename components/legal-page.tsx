import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/**
 * The frame Privacy and Terms share.
 *
 * The reading column is anchored to the **left edge of the header grid**, not
 * centred in the window: a centred column under a full-width header lines up
 * with nothing, and the logo above it reads as belonging to another page. It
 * is also narrow on purpose — around 68 characters. These are the two pages on
 * the site meant to be read from top to bottom, and the landing's measure is
 * too wide for that.
 */
export function LegalPage({
  eyebrow,
  title,
  description,
  updated,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  children: React.ReactNode;
  /** The link to the other document. */
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-8 pb-20 lg:pt-12">
        <div className="max-w-[68ch]">
          <header className="mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
              {eyebrow}
            </p>
            <h1 className="mt-5 font-display text-4xl tracking-[-0.012em] text-foreground">
              {title}
            </h1>
            <p className="mt-4 text-[16.5px] leading-[1.62] text-muted-foreground">
              {description}
            </p>
            <p className="mt-5 text-sm text-brand-soft">{updated}</p>
          </header>

          <div className="space-y-12 text-[16.5px] leading-[1.7]">{children}</div>

          <p className="mt-16 border-t border-border pt-8 text-sm">{footer}</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
