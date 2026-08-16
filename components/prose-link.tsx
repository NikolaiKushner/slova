import Link from "next/link";

import { CONTACT_EMAIL } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * A link inside a sentence — legal prose, the "you agree to the Terms" line.
 *
 * Brand teal with a thin underline. Ink a shade darker than the text around it
 * is not a link, it is a bold word, and readers do not click bold words.
 */
export function ProseLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = cn(
    "text-primary underline decoration-primary/30 underline-offset-4 transition hover:decoration-primary",
    className,
  );
  return href.startsWith("mailto:") ? (
    <a href={href} className={classes}>
      {children}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

/** `contact@slova.study`, as a link, wherever the prose names it. */
export function MailLink() {
  return <ProseLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</ProseLink>;
}
