import { NextIntlClientProvider } from "next-intl";

export default function KitLayout({ children }: { children: React.ReactNode }) {
  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
