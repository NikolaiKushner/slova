import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-teal-800/10 blur-3xl animate-[rise-in_800ms_ease-out]" />
        <div className="absolute -right-16 top-0 h-80 w-80 rounded-full bg-slate-900/5 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-16 pt-10">
        <p className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
          Slova
        </p>

        <div className="mt-auto space-y-6 pt-24 sm:pt-32">
          <h1 className="max-w-xl font-display text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Paste a word list.
            <br />
            Start learning.
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Drop a tutor sheet or CSV into Slova. Study in minutes. Come back when
            words are due again.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/register"
              className="inline-flex h-10 items-center rounded-lg bg-teal-800 px-5 text-sm font-medium text-white transition hover:bg-teal-900"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-white/70 px-5 text-sm font-medium transition hover:bg-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
