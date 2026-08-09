import type { LangCode } from "@/lib/languages";

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

type MyMemoryResponse = {
  responseData?: { translatedText?: string };
  responseStatus?: number;
  quotaFinished?: boolean;
};

/** Translate a short phrase via MyMemory (free, no API key). */
export async function translateText(
  text: string,
  from: LangCode,
  to: LangCode,
): Promise<string> {
  const q = text.trim();
  if (!q) throw new Error("Empty text");
  if (from === to) return q;
  if (Buffer.byteLength(q, "utf8") > 500) {
    throw new Error("Text too long for free translate (max ~500 bytes)");
  }

  const url = new URL(MYMEMORY_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("langpair", `${from}|${to}`);

  const email = process.env.MYMEMORY_EMAIL;
  if (email) url.searchParams.set("de", email);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Translate failed (${res.status})`);
  }

  const data = (await res.json()) as MyMemoryResponse;
  if (data.quotaFinished) {
    throw new Error("Daily translate quota reached. Try again tomorrow.");
  }

  const translated = data.responseData?.translatedText?.trim();
  if (!translated || data.responseStatus !== 200) {
    throw new Error("No translation returned");
  }

  if (translated.toLowerCase() === q.toLowerCase() && from !== to) {
    throw new Error("Could not translate this word");
  }

  return translated;
}
