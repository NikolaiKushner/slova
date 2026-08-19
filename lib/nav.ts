/**
 * The sections of the app and the pages inside them, in sidebar order.
 *
 * This lives apart from the sidebar component on purpose. Route matching used
 * to be a chain of pathname-and-hash special cases inside the sidebar,
 * which nothing could test and which quietly got the nested cases wrong. Here
 * it is a pure function over a path.
 *
 * Icons are deliberately absent: they are a rendering concern, and keeping
 * `lucide-react` out of this file keeps the nav testable in a plain node env.
 */

export type NavItem = {
  titleKey:
    | "trainings"
    | "grammar"
    | "stories"
    | "myProgress"
    | "myWords"
    | "mySets";
  href: string;
  /**
   * Paths this item should also light up for, when they sit outside its own
   * `href`. The study player lives at `/study` but belongs to Trainings, and
   * legacy routes redirect through here.
   */
  matches?: readonly string[];
};

export type NavSection = {
  titleKey: "study" | "dictionary";
  items: readonly NavItem[];
};

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    titleKey: "study",
    items: [
      {
        titleKey: "trainings",
        href: "/practice",
        matches: ["/practice/vocabulary", "/study"],
      },
      { titleKey: "grammar", href: "/courses/grammar" },
      { titleKey: "stories", href: "/stories" },
      {
        titleKey: "myProgress",
        href: "/progress",
        matches: ["/tasks/progress"],
      },
    ],
  },
  {
    titleKey: "dictionary",
    items: [
      {
        titleKey: "myWords",
        href: "/dictionary",
        matches: ["/import"],
      },
      { titleKey: "mySets", href: "/dictionary/sets" },
    ],
  },
] as const;

/** Trailing slashes come from links and from the address bar; drop them. */
function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "") || "/";
  }
  return pathname;
}

/** A claim matches a path only on a segment boundary: /dictionary ≠ /dictionaries. */
function claimMatches(pathname: string, claim: string): boolean {
  return pathname === claim || pathname.startsWith(`${claim}/`);
}

/**
 * The href of the one nav item that owns this path, or null outside the nav.
 *
 * Longest claim wins, which is the whole point: `/dictionary/sets/abc` is
 * matched by both `/dictionary` (My words) and `/dictionary/sets` (My sets),
 * and only the second one should light up.
 */
export function activeNavHref(pathname: string): string | null {
  const path = normalize(pathname);

  let bestHref: string | null = null;
  let bestLength = -1;

  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      for (const claim of [item.href, ...(item.matches ?? [])]) {
        if (claimMatches(path, claim) && claim.length > bestLength) {
          bestHref = item.href;
          bestLength = claim.length;
        }
      }
    }
  }

  return bestHref;
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return activeNavHref(pathname) === href;
}
