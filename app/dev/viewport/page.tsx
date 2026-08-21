"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useViewportInset } from "@/hooks/use-viewport-inset";

/**
 * What the browser says about the window, live (§9, development only).
 *
 * It exists because the iPad keyboard problem cannot be reasoned about from a
 * laptop: `visualViewport` is the only thing that reports the strip that is
 * actually visible, and its numbers on a real iPad — with the tab bar, with
 * the favourites bar, in portrait and in landscape, in Safari and after «на
 * экран Домой» — are what `--focus-*` in globals.css is tuned against.
 *
 * Open it on the device (`npm run dev -- -H 0.0.0.0`, then the machine's LAN
 * address), tap the field at the bottom, and read the two rows that matter:
 * «клавиатура» and «полоса».
 */

type Probe = {
  innerWidth: number;
  innerHeight: number;
  visualWidth: number;
  visualHeight: number;
  offsetTop: number;
  offsetLeft: number;
  scale: number;
  screenWidth: number;
  screenHeight: number;
  dpr: number;
  safeTop: string;
  safeBottom: string;
  standalone: boolean;
  finePointer: boolean;
  active: string;
};

function readProbe(safeArea: HTMLElement | null): Probe {
  const visual = window.visualViewport;
  const safe = safeArea ? getComputedStyle(safeArea) : null;
  const active = document.activeElement;

  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    visualWidth: Math.round(visual?.width ?? 0),
    visualHeight: Math.round(visual?.height ?? 0),
    offsetTop: Math.round(visual?.offsetTop ?? 0),
    offsetLeft: Math.round(visual?.offsetLeft ?? 0),
    scale: Number((visual?.scale ?? 1).toFixed(3)),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    dpr: window.devicePixelRatio,
    safeTop: safe?.paddingTop ?? "—",
    safeBottom: safe?.paddingBottom ?? "—",
    standalone:
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches,
    finePointer: window.matchMedia("(pointer: fine)").matches,
    active: active ? active.tagName.toLowerCase() : "—",
  };
}

export default function ViewportProbePage() {
  const inset = useViewportInset();
  const safeAreaRef = useRef<HTMLDivElement>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  /* The peak of the keyboard's animation, which the final resting value hides. */
  const [peak, setPeak] = useState(0);

  const sample = useCallback(() => {
    const next = readProbe(safeAreaRef.current);
    setProbe(next);
    // Tracked here rather than off `inset`, so the peak is written by the
    // event that caused it instead of by an effect chasing a render.
    setPeak((seen) =>
      Math.max(
        seen,
        Math.round(next.innerHeight - next.visualHeight - next.offsetTop),
      ),
    );
  }, []);

  useEffect(() => {
    sample();
    const visual = window.visualViewport;
    visual?.addEventListener("resize", sample);
    visual?.addEventListener("scroll", sample);
    window.addEventListener("resize", sample);
    window.addEventListener("orientationchange", sample);
    document.addEventListener("focusin", sample);
    document.addEventListener("focusout", sample);

    return () => {
      visual?.removeEventListener("resize", sample);
      visual?.removeEventListener("scroll", sample);
      window.removeEventListener("resize", sample);
      window.removeEventListener("orientationchange", sample);
      document.removeEventListener("focusin", sample);
      document.removeEventListener("focusout", sample);
    };
  }, [sample]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col gap-5 px-5 py-6">
      <header>
        <h1 className="text-h3">Видимая полоса окна</h1>
        <p className="text-muted-foreground mt-1 text-body-sm">
          Откройте на iPad, нажмите на поле внизу и снимите экран — в обеих
          ориентациях, с панелью закладок и без.
        </p>
      </header>

      {/* Measured, not guessed: `env()` is only readable through a real box. */}
      <div
        ref={safeAreaRef}
        aria-hidden
        className="pointer-events-none h-0"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      />

      <section className="border-border bg-card rounded-xl border p-4">
        <Row
          label="клавиатура"
          value={`${inset.keyboard ? "открыта" : "закрыта"} · ${inset.inset}px (пик ${peak}px)`}
          loud
        />
        <Row
          label="полоса"
          value={`${inset.height}px · режим ${inset.size}`}
          loud
        />
        <Row label="окно (layout)" value={size(probe?.innerWidth, probe?.innerHeight)} />
        <Row label="visualViewport" value={size(probe?.visualWidth, probe?.visualHeight)} />
        <Row label="offsetTop / offsetLeft" value={`${probe?.offsetTop ?? "—"} / ${probe?.offsetLeft ?? "—"}`} />
        <Row label="scale" value={String(probe?.scale ?? "—")} />
        <Row label="safe-area верх / низ" value={`${probe?.safeTop ?? "—"} / ${probe?.safeBottom ?? "—"}`} />
        <Row label="screen" value={size(probe?.screenWidth, probe?.screenHeight)} />
        <Row label="devicePixelRatio" value={String(probe?.dpr ?? "—")} />
        <Row label="standalone (PWA)" value={probe?.standalone ? "да" : "нет"} />
        <Row label="pointer: fine" value={probe?.finePointer ? "да" : "нет"} />
        <Row label="в фокусе" value={probe?.active ?? "—"} />
      </section>

      <section className="border-border bg-card rounded-xl border p-4">
        <p className="text-eyebrow text-overline">Что помещается</p>
        <p className="text-body-sm mt-2">
          Сцена тренировки при текущих токенах:{" "}
          <strong className="tabular-nums">{scene(inset.size)}px</strong> из{" "}
          <strong className="tabular-nums">{inset.height}px</strong>.
        </p>
      </section>

      <label className="flex flex-col gap-2">
        <span className="text-eyebrow text-overline">Поле для клавиатуры</span>
        <Input
          placeholder="нажмите сюда"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          className="h-[52px] text-center"
        />
      </label>

      <Button type="button" variant="outline" onClick={() => setPeak(0)}>
        Сбросить пик
      </Button>

      {/* Marks where the visible strip ends, so a screenshot shows the edge. */}
      <div
        aria-hidden
        className="bg-primary pointer-events-none fixed right-0 left-0 z-50 h-0.5"
        style={{ top: "calc(var(--vv-height) - 2px)" }}
      />
    </div>
  );
}

function Row({
  label,
  value,
  loud,
}: {
  label: string;
  value: string;
  loud?: boolean;
}) {
  return (
    <div className="border-border flex items-baseline justify-between gap-4 border-b py-1.5 last:border-b-0">
      <span className="text-muted-foreground text-caption">{label}</span>
      <span
        className={
          loud
            ? "font-display text-body tabular-nums"
            : "text-body-sm tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

function size(width?: number, height?: number) {
  return width === undefined || height === undefined
    ? "—"
    : `${width} × ${height}`;
}

/**
 * The height a drill asks for at each set of `--focus-*`: top bar + padding ×2
 * + task line + prompt + 20 + answer + 20 + footer. Kept in step with
 * globals.css by hand — it is a readout, not a source of truth.
 */
function scene(size: "tall" | "short" | "tiny") {
  if (size === "tiny") return 48 + 12 * 2 + 24 + 76 + 20 + 120 + 20 + 44;
  if (size === "short") return 52 + 16 * 2 + 28 + 104 + 20 + 168 + 20 + 48;
  return 64 + 32 + 72 + 36 + 150 + 20 + 232 + 20 + 52;
}
