import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";

export default function KitLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== "development") notFound();

  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
