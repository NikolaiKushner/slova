"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { BrandWordmark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("routeStates");

  useEffect(() => {
    console.error("route_render_failed", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-16">
      <section className="bg-card border-border w-full max-w-lg rounded-2xl border px-6 py-10 text-center shadow-card sm:px-10">
        <BrandWordmark className="text-2xl" />
        <p className="text-eyebrow mt-8 text-overline">{t("errorEyebrow")}</p>
        <h1 className="text-h1 mt-2">{t("errorTitle")}</h1>
        <p className="text-muted-foreground mt-3 text-body">
          {t("errorDescription")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={retry}>{t("tryAgain")}</Button>
          <Button variant="outline" render={<Link href="/" />}>
            {t("goHome")}
          </Button>
        </div>
        {error.digest ? (
          <p className="text-disabled-foreground mt-6 text-caption">
            {t("errorCode", { code: error.digest })}
          </p>
        ) : null}
      </section>
    </div>
  );
}
