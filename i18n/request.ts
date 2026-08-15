import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { negotiateLocale } from "@/lib/i18n/locale";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";

const catalogs = { en, ru } as const;

export default getRequestConfig(async () => {
  const store = await cookies();
  const header = (await headers()).get("accept-language");
  const locale = negotiateLocale(store.get("locale")?.value, header);

  return {
    locale,
    messages: catalogs[locale],
    // Fixed, so a formatted date is the same on the server and in the browser.
    // Without it next-intl warns on every date it formats.
    timeZone: "UTC",
  };
});
