import { Inter, Literata } from "next/font/google";

/**
 * Two families, both variable, both with real Cyrillic. See
 * `docs/design-system.md` §2.
 *
 * Neither declares `weight`: naming weights would pin next/font to static
 * instances and cost us the variable axes. The typographic utilities in
 * `globals.css` set `font-weight: 500` and `font-variation-settings: "opsz"`,
 * and both only mean something on a variable face.
 */
export const literata = Literata({
  subsets: ["latin", "cyrillic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-display",
});

/**
 * Inter also carries an `opsz` axis, which we deliberately do not request:
 * nothing in the type scale varies it, so asking for it would only widen the
 * download.
 */
export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-sans",
});
