import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { BrandWordmark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NotFound() {
  const t = await getTranslations("routeStates");

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <section className="bg-card border-border w-full max-w-lg rounded-2xl border px-6 py-10 text-center shadow-card sm:px-10">
        <BrandWordmark className="text-2xl" />
        <p className="text-eyebrow mt-8 text-overline">{t("notFoundEyebrow")}</p>
        <h1 className="text-h1 mt-2">{t("notFoundTitle")}</h1>
        <p className="text-muted-foreground mt-3 text-body">
          {t("notFoundDescription")}
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ size: "lg" }), "mt-8")}
        >
          {t("goHome")}
        </Link>
      </section>
    </main>
  );
}
