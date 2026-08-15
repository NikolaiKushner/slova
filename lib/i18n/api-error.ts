import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";

import type en from "@/messages/en.json";

type ApiKey = keyof typeof en.api;

export async function jsonError(key: ApiKey, status: number) {
  const t = await getTranslations("api");
  return NextResponse.json({ error: t(key) }, { status });
}
