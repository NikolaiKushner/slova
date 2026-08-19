import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/components/providers";
import { pickClientMessages } from "@/lib/i18n/client-messages";

const APP_CLIENT_NAMESPACES = [
  "chrome",
  "comingSoon",
  "common",
  "courses",
  "dictionary",
  "locale",
  "mutations",
  "nav",
  "overview",
  "pagination",
  "practice",
  "progress",
  "routeStates",
  "stories",
  "study",
  "trainings",
] as const;

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, messages] = await Promise.all([getSession(), getMessages()]);
  if (!session?.user?.id) redirect("/login");

  return (
    <NextIntlClientProvider
      messages={pickClientMessages(messages, APP_CLIENT_NAMESPACES)}
    >
      <AppProviders session={session}>
        <AppShell>{children}</AppShell>
      </AppProviders>
    </NextIntlClientProvider>
  );
}
