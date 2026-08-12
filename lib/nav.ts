/**
 * The four sections of the app and the pages inside them, in sidebar order.
 *
 * This lives apart from the sidebar component on purpose. Route matching used
 * to be a chain of pathname-and-hash special cases inside `app-sidebar.tsx`,
 * which nothing could test and which quietly got the nested cases wrong. Here
 * it is a pure function over a path.
 *
 * Icons are deliberately absent: they are a rendering concern, and keeping
 * `lucide-react` out of this file keeps the nav testable in a plain node env.
 */

export type NavItem = {
  title: string;
  href: string;
  /**
   * Paths this item should also light up for, when they sit outside its own
   * `href`. The study player lives at `/study` but belongs to
   * Practice → Vocabulary, and legacy routes redirect through here.
   */
  matches?: readonly string[];
};

export type NavSection = {
  title: string;
  items: readonly NavItem[];
};

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: "Tasks",
    items: [
      { title: "Learning map", href: "/tasks" },
      { title: "Today", href: "/tasks/today", matches: ["/home", "/study"] },
      { title: "My progress", href: "/tasks/progress" },
    ],
  },
  {
    title: "Practice",
    items: [
      { title: "Trainings", href: "/practice", matches: ["/practice/vocabulary"] },
      { title: "Grammar", href: "/practice/grammar" },
      { title: "Reading", href: "/practice/reading" },
    ],
  },
  {
    title: "Courses",
    items: [
      { title: "Grammar", href: "/courses/grammar" },
      { title: "Topics", href: "/courses/topics" },
      { title: "My courses", href: "/courses/my" },
    ],
  },
  {
    title: "Dictionary",
    items: [
      {
        title: "My words",
        href: "/dictionary",
        matches: ["/import"],
      },
      { title: "My sets", href: "/dictionary/sets" },
      { title: "Ready-made sets", href: "/dictionary/catalog" },
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
