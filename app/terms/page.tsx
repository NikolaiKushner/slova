import type { Metadata } from "next";
import Link from "next/link";

import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms — Slova",
  description: "How you may use Slova, and what the app does not promise.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <Page className="flex-1 px-6 pb-16">
        <PageHeader
          eyebrow="Legal"
          title="Terms"
          description="A small app. A short agreement."
        />

        <div className="space-y-10 text-base leading-relaxed">
          <Section title="The app">
            <p className="text-muted-foreground">
              Slova helps you learn English words with Russian translations.
              You paste a list or take a grammar course, then come back when
              words are due. Use it for yourself. Do not use it to break the
              law or to abuse the translation budget.
            </p>
          </Section>

          <Section title="Your words">
            <p className="text-muted-foreground">
              Lists you add belong to you. We may keep a translation in a shared
              dictionary so the next person does not pay for the same word —
              only after a second independent source agrees with it, so a typo
              does not spread. The frequency list used to seed that dictionary
              has its own licence; see the notice on the site if that matters
              to you.
            </p>
          </Section>

          <Section title="Accounts">
            <p className="text-muted-foreground">
              You are responsible for the email and password you use to sign
              in. We can close an account that is harming the service. You can
              ask us to close yours:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="No warranty">
            <p className="text-muted-foreground">
              The app is provided as it is. Translations can be wrong. Study
              schedules are a guess. We are not liable for what you do with
              either.
            </p>
          </Section>
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
        </p>
      </Page>
      <SiteFooter />
    </div>
  );
}
