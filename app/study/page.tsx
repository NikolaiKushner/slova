import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { StudySession } from "@/components/study-session";

export default async function StudyAllPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16">
      <AppHeader email={session.user.email} />
      <Link href="/home" className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Home
      </Link>
      <h1 className="mb-8 font-display text-3xl tracking-tight">Study</h1>
      <StudySession />
    </main>
  );
}
