import type { Metadata } from "next";
import Link from "next/link";

import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy — Slova",
  description: "What Slova stores, who sees it, and how to ask for it to be deleted.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <Page className="flex-1 px-6 pb-16">
        <PageHeader
          eyebrow="Legal"
          title="Privacy"
          description="What we keep in order to run the app, and nothing else."
        />

        <div className="space-y-10 text-base leading-relaxed text-foreground">
          <Section title="Who">
            <p className="text-muted-foreground">
              Slova is the vocabulary app at slova.study. There is no separate
              company behind the name. Questions:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="What we store">
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Your email, and a password hash if you set one. We never store the password itself.</li>
              <li>Your name and photo, if you sign in with Google.</li>
              <li>The words you add, your translations, sets, and study schedule.</li>
              <li>Where you are in a grammar course, if you take one.</li>
            </ul>
          </Section>

          <Section title="Who else sees it">
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Neon holds the database. Vercel hosts the app.</li>
              <li>Resend sends the confirmation and password-reset emails.</li>
              <li>Google, if you use Google to sign in.</li>
              <li>
                Anthropic, when a word you pasted is not already in the shared
                dictionary — so it can be translated. A translation you type
                stays private until a second source agrees with it.
              </li>
              <li>
                Vercel Analytics and Speed Insights count visits. They do not
                get your word lists.
              </li>
            </ul>
          </Section>

          <Section title="Cookies">
            <p className="text-muted-foreground">
              A session cookie keeps you signed in. That is the only cookie we
              set on purpose.
            </p>
          </Section>

          <Section title="How long">
            <p className="text-muted-foreground">
              We keep the account until you ask us to delete it. Write to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and we will remove your row and the words attached to it.
            </p>
          </Section>

          <Section title="Children">
            <p className="text-muted-foreground">
              Slova is not aimed at children under 16. If an account was created
              for someone younger, write and we will delete it.
            </p>
          </Section>
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms of use
          </Link>
        </p>
      </Page>
      <SiteFooter />
    </div>
  );
}
