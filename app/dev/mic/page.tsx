"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { judge, type Verdict } from "@/lib/practice/answer";

/**
 * Throwaway probe for docs/plans/speaking.md §6 step 1. Four questions, on
 * hardware: does recognition work in Chrome, in iOS Safari as a tab, in iOS
 * Safari installed to the home screen, and does a second attempt in the same
 * page need a fresh gesture.
 *
 * It grades through `judge`, the same function the typed formats use, so the
 * hit rate here is the number the plan's §4 criterion is about — not a
 * friendlier one invented for the probe.
 */

type RecognitionAlternative = { transcript: string; confidence: number };

type RecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      isFinal: boolean;
      length: number;
      item(index: number): RecognitionAlternative;
    };
  };
};

type RecognitionErrorLike = { error: string; message?: string };

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
};

type RecognitionConstructor = new () => RecognitionLike;

/**
 * The engine is dropped the moment the closure holding it is collected, and
 * the symptom is silence with no events — the same failure
 * `lib/practice/speech.ts` documents for utterances. Module-level reference.
 */
let live: RecognitionLike | null = null;

function constructorOf(): { ctor: RecognitionConstructor | null; prefixed: boolean } {
  if (typeof window === "undefined") return { ctor: null, prefixed: false };
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  if (w.SpeechRecognition) return { ctor: w.SpeechRecognition, prefixed: false };
  if (w.webkitSpeechRecognition) {
    return { ctor: w.webkitSpeechRecognition, prefixed: true };
  }
  return { ctor: null, prefixed: false };
}

const START_TIMEOUT_MS = 4000;
const SILENCE_TIMEOUT_MS = 8000;

type Attempt = {
  n: number;
  target: string;
  alternatives: RecognitionAlternative[];
  verdict: Verdict | null;
  /** Verdict against the recogniser's runner-up guesses, not only its first. */
  verdictAny: Verdict | null;
  started: boolean;
  interim: boolean;
  error: string | null;
  startedInMs: number | null;
  totalMs: number;
};

type Environment = {
  api: "standard" | "webkit" | "absent";
  standalone: boolean;
  secure: boolean;
  language: string;
  agent: string;
};

/** Cached so the snapshot keeps object identity — a fresh object each call loops. */
let cachedEnvironment: Environment | null = null;

function environmentSnapshot(): Environment | null {
  const { ctor, prefixed } = constructorOf();
  cachedEnvironment ??= {
    api: ctor ? (prefixed ? "webkit" : "standard") : "absent",
    standalone:
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches,
    secure: window.isSecureContext,
    language: navigator.language,
    agent: navigator.userAgent,
  };
  return cachedEnvironment;
}

const noServerEnvironment = () => null;
const neverChanges = () => () => {};

export default function MicProbePage() {
  const environment = useSyncExternalStore(
    neverChanges,
    environmentSnapshot,
    noServerEnvironment,
  );
  const [target, setTarget] = useState("water");
  const [status, setStatus] = useState("готов");
  const [listening, setListening] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const counter = useRef(0);

  const listen = useCallback(() => {
    const { ctor } = constructorOf();
    const word = target.trim();
    if (!ctor || !word) return;

    counter.current += 1;
    const n = counter.current;
    const began = performance.now();
    let startedAt: number | null = null;
    let sawInterim = false;
    let settled = false;

    // A previous engine still holding the microphone makes the next start()
    // fail silently on some builds; let it go first.
    live?.abort();

    const recognition = new ctor();
    live = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    const finish = (alternatives: RecognitionAlternative[], error: string | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(startTimer);
      window.clearTimeout(silenceTimer);
      setListening(false);
      live = null;

      const best = alternatives[0]?.transcript ?? "";
      const anyVerdict = alternatives.reduce<Verdict | null>((carry, option) => {
        const verdict = judge(option.transcript, word);
        if (carry === "correct" || verdict === "correct") return "correct";
        if (carry === "almost" || verdict === "almost") return "almost";
        return verdict;
      }, null);

      setAttempts((rows) => [
        {
          n,
          target: word,
          alternatives,
          verdict: best ? judge(best, word) : null,
          verdictAny: alternatives.length ? anyVerdict : null,
          started: startedAt !== null,
          interim: sawInterim,
          error,
          startedInMs: startedAt === null ? null : Math.round(startedAt - began),
          totalMs: Math.round(performance.now() - began),
        },
        ...rows,
      ]);
      setStatus(error ? `ошибка: ${error}` : best ? `услышано: ${best}` : "ничего не услышано");
    };

    const startTimer = window.setTimeout(() => {
      if (startedAt === null) {
        recognition.abort();
        finish([], "не стартовал (нужен новый жест?)");
      }
    }, START_TIMEOUT_MS);

    const silenceTimer = window.setTimeout(() => {
      recognition.abort();
      finish([], "тишина");
    }, SILENCE_TIMEOUT_MS);

    recognition.onstart = () => {
      startedAt = performance.now();
      setStatus("слушаю…");
    };

    recognition.onerror = (event) => finish([], event.error || "неизвестная ошибка");

    recognition.onresult = (event) => {
      const result = event.results.item(event.results.length - 1);
      if (!result.isFinal) {
        sawInterim = true;
        return;
      }
      const alternatives: RecognitionAlternative[] = [];
      for (let i = 0; i < result.length; i++) {
        const option = result.item(i);
        alternatives.push({
          transcript: option.transcript,
          confidence: option.confidence,
        });
      }
      finish(alternatives, null);
    };

    recognition.onend = () => finish([], settled ? null : "закончился без результата");

    setListening(true);
    setStatus("запускаю…");
    try {
      recognition.start();
    } catch (error) {
      finish([], error instanceof Error ? error.message : "start() бросил исключение");
    }
  }, [target]);

  const scored = attempts.filter((row) => row.verdict !== null);
  const hits = scored.filter((row) => row.verdict === "correct").length;
  const hitsAny = attempts.filter((row) => row.verdictAny === "correct").length;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-4">
      <header className="flex flex-col gap-2">
        <p className="text-eyebrow text-overline">dev · распознавание речи</p>
        <h1 className="font-display text-title">Проба микрофона</h1>
        <p className="text-body-sm text-muted-foreground">
          Впишите английское слово, нажмите «Говорить» и произнесите его. Двадцать
          слов подряд дают процент, который просит §4 плана. Проверять нужно в
          Chrome, в Safari на iOS вкладкой и в Safari, установленном на домашний
          экран — последнее и есть главный вопрос.
        </p>
      </header>

      <section className="border-border bg-card rounded-xl border p-4">
        <Row label="API" value={apiLabel(environment?.api)} loud />
        <Row
          label="standalone (с домашнего экрана)"
          value={environment ? (environment.standalone ? "да" : "нет") : "—"}
          loud
        />
        <Row
          label="secure context"
          value={environment ? (environment.secure ? "да" : "нет — API не будет") : "—"}
        />
        <Row label="язык браузера" value={environment?.language ?? "—"} />
      </section>

      <label className="flex flex-col gap-2">
        <span className="text-eyebrow text-overline">Целевое слово</span>
        <Input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-[52px] text-center"
        />
      </label>

      <Button
        type="button"
        onClick={listen}
        disabled={listening || environment?.api === "absent" || !target.trim()}
        className="h-[52px]"
      >
        {listening ? "Слушаю…" : "Говорить"}
      </Button>

      <p className="text-body-sm text-center" aria-live="polite">
        {status}
      </p>

      {attempts.length > 0 && (
        <section className="border-border bg-card rounded-xl border p-4">
          <Row
            label="попыток"
            value={`${attempts.length}, из них с ответом ${scored.length}`}
          />
          <Row
            label="попадание по первой догадке"
            value={rate(hits, attempts.length)}
            loud
          />
          <Row
            label="попадание с учётом альтернатив"
            value={rate(hitsAny, attempts.length)}
            loud
          />
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => {
              counter.current = 0;
              setAttempts([]);
              setStatus("готов");
            }}
          >
            Очистить
          </Button>
        </section>
      )}

      <ol className="flex flex-col gap-2">
        {attempts.map((row) => (
          <li
            key={row.n}
            className="border-border bg-card text-body-sm rounded-xl border p-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display tabular-nums">
                #{row.n} · {row.target}
              </span>
              <span className="text-caption text-muted-foreground tabular-nums">
                {row.started ? `старт ${row.startedInMs}ms · ` : "не стартовал · "}
                {row.totalMs}ms
              </span>
            </div>
            <div className="mt-1">
              {row.error ? (
                <span className="text-destructive">{row.error}</span>
              ) : (
                <span>
                  {verdictLabel(row.verdict)}
                  {row.verdict !== row.verdictAny &&
                    ` · среди альтернатив: ${verdictLabel(row.verdictAny)}`}
                </span>
              )}
            </div>
            {row.alternatives.length > 0 && (
              <ul className="text-caption text-muted-foreground mt-1">
                {row.alternatives.map((option, index) => (
                  <li key={index} className="tabular-nums">
                    {option.transcript}
                    {Number.isFinite(option.confidence) &&
                      ` — ${option.confidence.toFixed(2)}`}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-caption text-muted-foreground mt-1">
              промежуточные результаты: {row.interim ? "были" : "не приходили"}
            </p>
          </li>
        ))}
      </ol>

      {environment && (
        <p className="text-caption text-muted-foreground break-all">
          {environment.agent}
        </p>
      )}
    </div>
  );
}

function apiLabel(api: Environment["api"] | undefined) {
  if (api === undefined) return "—";
  if (api === "absent") return "нет — раздел здесь невозможен";
  return api === "webkit" ? "webkitSpeechRecognition" : "SpeechRecognition";
}

function verdictLabel(verdict: Verdict | null) {
  if (verdict === "correct") return "верно";
  if (verdict === "almost") return "почти";
  if (verdict === "wrong") return "мимо";
  return "нет ответа";
}

function rate(hits: number, total: number) {
  if (total === 0) return "—";
  return `${hits} из ${total} · ${Math.round((hits / total) * 100)}%`;
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
          loud ? "font-display text-body tabular-nums" : "text-body-sm tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
