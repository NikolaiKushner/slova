import Link from "next/link";
import { useTranslations } from "next-intl";

import { BrandWordmark } from "@/components/brand-mark";
import {
  PracticeScreen,
  ProductFrame,
} from "@/components/product-frame";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteFooter } from "@/components/site-chrome";

function AuthHeroTitles() {
  const t = useTranslations("auth");
  return (
    <>
      {t("heroTitle1")}
      <br />
      {t("heroTitle2")}
    </>
  );
}

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-card py-8 shadow-sm">
      <CardHeader className="gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
          {eyebrow}
        </p>
        <CardTitle className="font-display text-3xl font-normal tracking-tight">
          {title}
        </CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

/**
 * The doorway: brand and a still on the left, the form on the right.
 *
 * Sign in and Create an account both use it. They are the same decision seen
 * twice — a person who lands on the wrong one should not feel they crossed
 * into another product — so only the lead sentence differs.
 */
export function AuthSplit({
  lead,
  children,
}: {
  lead: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-6 py-12 lg:py-20">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="hidden lg:block">
            <Link href="/" className="inline-flex transition hover:opacity-80">
              <BrandWordmark className="text-4xl" />
            </Link>
            <p className="mt-10 font-display text-4xl leading-[1.1] tracking-tight text-foreground">
              <AuthHeroTitles />
            </p>
            <p className="mt-4 max-w-sm text-muted-foreground">{lead}</p>
            <div className="mt-12">
              <ProductFrame compact>
                <PracticeScreen />
              </ProductFrame>
            </div>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex transition hover:opacity-80 lg:hidden"
            >
              <BrandWordmark className="text-3xl" />
            </Link>
            <div className="mt-8 lg:mt-0">{children}</div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

/**
 * One column, centred. For the errands — reset a password, confirm an address
 * — where there is nothing to sell and the page is a single instruction.
 * Sign in and Create an account use `AuthSplit` instead.
 */
export function AuthNarrow({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12 lg:py-20">
        <Link
          href="/"
          className="inline-flex self-start transition hover:opacity-80"
        >
          <BrandWordmark className="text-3xl" />
        </Link>
        <div className="mt-8">{children}</div>
      </div>
      <SiteFooter />
    </main>
  );
}
