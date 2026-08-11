import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

function PreviewCard() {
  return (
    <div
      className="study-card relative mx-auto w-full max-w-sm -rotate-3 rounded-2xl border border-border bg-white px-8 py-10 shadow-sm"
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

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/tasks/today");

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-brand-soft/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/40 blur-3xl" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div className="flex flex-col">
          <p className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
            Slova
          </p>

          <div className="mt-14 space-y-6 sm:mt-20">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
              Vocabulary
            </p>
            <h1 className="max-w-xl font-display text-4xl leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Paste a word list.
              <br />
              Start learning.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Drop a tutor sheet or CSV into Slova. Study in minutes. Come back
              when words are due again.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="lg"
                className="bg-teal-800 px-5 text-white hover:bg-teal-900"
                render={<Link href="/login" />}
              >
                Get started
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/70 px-5"
                render={<Link href="/login" />}
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden items-center justify-center lg:flex">
          <PreviewCard />
        </div>
      </div>
    </main>
  );
}
