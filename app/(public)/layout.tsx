import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { pickClientMessages } from "@/lib/i18n/client-messages";

const PUBLIC_CLIENT_NAMESPACES = [
  "chrome",
  "locale",
  "nav",
  "product",
] as const;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={pickClientMessages(messages, PUBLIC_CLIENT_NAMESPACES)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
