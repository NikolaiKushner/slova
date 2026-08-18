import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { pickClientMessages } from "@/lib/i18n/client-messages";

const AUTH_CLIENT_NAMESPACES = [
  "auth",
  "chrome",
  "common",
  "errors",
  "locale",
  "routeStates",
] as const;

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={pickClientMessages(messages, AUTH_CLIENT_NAMESPACES)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
