import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export function AppHeader({ email }: { email?: string | null }) {
  return (
    <header className="flex items-center justify-between gap-4 py-6">
      <Link href="/home" className="font-display text-2xl tracking-tight text-foreground">
        Slova
      </Link>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {email ? <span className="hidden sm:inline">{email}</span> : null}
        <SignOutButton />
      </div>
    </header>
  );
}
