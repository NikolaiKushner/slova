import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ImportForm } from "@/components/import-form";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16">
      <AppHeader email={session.user.email} />
      <div className="mb-8 space-y-2">
        <Link href="/home" className="text-sm text-muted-foreground hover:text-foreground">
          ← Home
        </Link>
        <h1 className="font-display text-4xl tracking-tight">Paste a list</h1>
        <p className="text-muted-foreground">
          Copy words from a tutor doc, spreadsheet, or notes. We’ll turn them into
          cards you can study right away.
        </p>
      </div>
      <ImportForm />
    </main>
  );
}
