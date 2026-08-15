import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Share card. Dark is the default — the same forest as a filled CTA, so it
 * holds in a feed of pale previews. Light exists to match the page wash.
 * Hex is from the OG HTML spec / DESIGN.md; ImageResponse is not on the
 * page cascade.
 */
export type OgVariant = "dark" | "light";

const THEME = {
  dark: {
    bg: "#093b32",
    wordmark: "#ffffff",
    hello: "#ffffff",
    privet: "#8fd0ba",
    tag: "#a9c4bc",
    url: "#6f9c91",
    arrow: "#4f8577",
    ghost: "#3f7568",
    rule: "rgba(255, 255, 255, 0.12)",
  },
  light: {
    bg: "#e9edec",
    wordmark: "#0b5346",
    hello: "#14201d",
    privet: "#0b5346",
    tag: "#4a5a55",
    url: "#7d8f89",
    arrow: "#a9bcb5",
    ghost: "#b3c3bd",
    rule: "#d0dad6",
  },
} as const;

const GHOST_PAIRS = [
  ["thanks", "спасибо"],
  ["because", "потому что"],
  ["although", "хотя"],
  ["enough", "достаточно"],
  ["maybe", "может быть"],
  ["already", "уже"],
  ["instead", "вместо"],
] as const;

/** Fade the column like the HTML mask (transparent at the edges). */
const GHOST_OPACITY = [0.32, 0.55, 0.78, 0.9, 0.78, 0.55, 0.32];

const FONT_TEXT = [
  "Slova",
  "hello привет",
  "thanks because although enough maybe already instead",
  "спасибо потому что хотя достаточно может быть уже вместо",
  "Вставьте список слов. Выучите грамматику.",
  "Больше 8 000 слов уже с переводом и озвучкой",
  "slova.study ·",
].join(" ");

const SAFARI_TTF =
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1";

async function loadFace(family: string, weight: number) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:wght@${weight}&text=${encodeURIComponent(FONT_TEXT)}`,
    { headers: { "User-Agent": SAFARI_TTF } },
  ).then((res) => res.text());
  const file = css.match(
    /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
  )?.[1];
  if (!file) throw new Error(`No TTF for ${family} ${weight}`);
  return fetch(file).then((res) => res.arrayBuffer());
}

type OgFont = NonNullable<
  NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]
>[number];

async function loadFonts(): Promise<OgFont[]> {
  const [serif500, serif600, sans] = await Promise.all([
    loadFace("Newsreader", 500),
    loadFace("Newsreader", 600),
    loadFace("Inter", 400),
  ]);
  return [
    { name: "Newsreader", data: serif500, style: "normal", weight: 500 },
    { name: "Newsreader", data: serif600, style: "normal", weight: 600 },
    { name: "Inter", data: sans, style: "normal", weight: 400 },
  ];
}

function Arrow({ color }: { color: string }) {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M4 12h15m0 0-5-5m5 5-5 5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function renderOgImage(variant: OgVariant = "dark") {
  const theme = THEME[variant];
  const fonts = await loadFonts().catch(() => undefined);
  const serif = fonts ? "Newsreader" : "Georgia, serif";
  const sans = fonts ? "Inter" : "system-ui, sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: theme.bg,
          padding: "64px 72px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 330,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: 19,
            paddingRight: 72,
            fontFamily: sans,
            fontSize: 19,
            letterSpacing: "0.01em",
            color: theme.ghost,
          }}
        >
          {GHOST_PAIRS.map(([en, ru], index) => (
            <div
              key={en}
              style={{
                display: "flex",
                opacity: GHOST_OPACITY[index],
              }}
            >
              {en} ·{" "}
              <span style={{ opacity: 0.55, marginLeft: 4 }}>{ru}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.45,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0px, transparent 1px, transparent 3px)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontFamily: serif,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: theme.wordmark,
          }}
        >
          Slova
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 38,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: serif,
                fontSize: 112,
                fontWeight: 500,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                color: theme.hello,
              }}
            >
              hello
            </div>
            <Arrow color={theme.arrow} />
            <div
              style={{
                display: "flex",
                fontFamily: serif,
                fontSize: 112,
                fontWeight: 500,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                color: theme.privet,
              }}
            >
              привет
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: 180,
              height: 1,
              background: theme.rule,
              marginTop: 34,
              marginBottom: 30,
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: sans,
              fontSize: 22,
              lineHeight: 1.45,
              color: theme.tag,
              maxWidth: 480,
            }}
          >
            <div style={{ display: "flex" }}>Вставьте список слов.</div>
            <div style={{ display: "flex" }}>Выучите грамматику.</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: sans,
              fontSize: 18,
              lineHeight: 1.45,
              color: theme.tag,
              maxWidth: 520,
            }}
          >
            Больше 8 000 слов уже с переводом и озвучкой
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: sans,
              fontSize: 19,
              letterSpacing: "0.02em",
              color: theme.url,
              paddingBottom: 3,
            }}
          >
            slova.study
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts,
    },
  );
}
