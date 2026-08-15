/**
 * Saying a word out loud.
 *
 * The browser's own speech synthesiser: free, no key, no storage, and it can
 * pronounce any word — including the phrases no recorded dictionary has. When
 * there is recorded audio worth using, a URL on the shared lexeme will take
 * precedence here and nothing else will need to change.
 *
 * Everything below is defensive, and each guard is here because the Web Speech
 * API fails silently in a different way:
 *
 * - **A dropped utterance stops speaking.** The browser does not hold a strong
 *   reference to an utterance it is speaking, so one that only exists inside a
 *   closure can be collected mid-sentence — or before it starts. The symptom
 *   is silence with no error and no events at all, which is the hardest kind
 *   of bug to see. A module-level reference is the documented fix.
 * - **A browser will not speak unprompted.** Speech from a page load rather
 *   than a click is refused, silently; on iOS every utterance needs a gesture,
 *   not just the first. So `speak` reports whether it truly began and the
 *   caller has to have an answer for no.
 * - **`cancel()` immediately followed by `speak()` can wedge Chrome's queue**,
 *   after which nothing plays until the page reloads. Cancel only when
 *   something is actually speaking, and let it land first.
 * - **The queue can be left paused** by a background tab. `resume()` is a
 *   no-op otherwise, so it is always worth calling.
 * - **Voices load asynchronously**, and some engines are silent if asked
 *   before the list arrives.
 */

const LANG = "en-US";

/**
 * How long to wait for speech to actually begin. Generous, because a voice
 * that is fetched rather than installed can take a second to get going, and
 * calling that a failure would blame the browser for being slow.
 */
const START_TIMEOUT_MS = 3000;

/**
 * How often to look at `speaking` — for the report, not for the verdict. A
 * wedged engine sets it and never speaks, so it says the utterance was
 * accepted, not that anything was heard.
 */
const START_POLL_MS = 300;

/**
 * Utterances the browser is still working on.
 *
 * Their only job is to be referenced from here. Without a live reference the
 * browser may collect one mid-sentence and fall silent, so this set is the
 * anchor — it is written to before speaking and cleared when the utterance is
 * done. It looks like a variable nobody reads, and deleting it on those
 * grounds is how the silence comes back.
 */
const inFlight = new Set<SpeechSynthesisUtterance>();

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((voice) => voice.lang.startsWith("en"));
  if (english.length === 0) return null;

  // Installed voices start instantly; a fetched one adds a pause before every
  // question, which stops it feeling like a drill.
  return (
    english.find((voice) => voice.lang === LANG && voice.localService) ??
    english.find((voice) => voice.localService) ??
    english[0]
  );
}

/**
 * Say it. Resolves true once it has actually begun, false when the browser
 * refused, errored, or simply never started.
 */
/**
 * Cleared once per page, before the first word is spoken.
 *
 * A previous page can leave the engine mid-utterance, and Chrome can leave it
 * wedged — `speaking` stuck true forever, nothing playing, no events. Every
 * later call then sees "something is speaking" and cancels it, which is how
 * one bad state poisons an entire session. One cancel at the start, well away
 * from any `speak`, clears that inheritance.
 */
let queueCleared = false;

/** Set while we are deliberately interrupting, so the victim is not alarmed. */
let interrupting = false;

/**
 * Plays a recording, when the word has one.
 *
 * Tried before the synthesiser because it is the same voice for everyone and
 * on every device, which is what a pronunciation should be. It can still be
 * refused — the autoplay rules apply to audio elements too — and then the
 * caller falls through to speech, which is refused less often because it is
 * not "media".
 */
async function playRecording(
  url: string,
  options: SpeakOptions,
): Promise<boolean> {
  try {
    const audio = new Audio(url);
    audio.preload = "auto";
    // A recording slowed below about 0.6 turns to mud; the synthesiser copes
    // better, so "slowly" on a recorded word is 0.7 rather than the 0.6 a
    // voice gets.
    if (options.rate && options.rate < 1) audio.playbackRate = 0.7;
    if (options.onEnd) {
      const done = options.onEnd;
      audio.addEventListener("ended", done, { once: true });
      audio.addEventListener("error", done, { once: true });
    }
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export type SpeakOptions = {
  /**
   * Below 1 is the "slowly" button. Not a separate function, because the only
   * difference between hearing a word and hearing it again slowly is this
   * number, and a second code path would drift from the first.
   */
  rate?: number;
  /** Fired when the word has finished — or failed. Always fired exactly once. */
  onEnd?: () => void;
};

export async function speak(
  text: string,
  audioUrl?: string | null,
  options: SpeakOptions = {},
): Promise<boolean> {
  // Every path below can end the word — the recording ends, the utterance
  // ends, it errors, or it never starts at all. The caller only wants to be
  // told once, so the guard lives here rather than in four places.
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    options.onEnd?.();
  };
  const settings: SpeakOptions = { ...options, onEnd: finish };

  if (audioUrl && typeof window !== "undefined") {
    if (await playRecording(audioUrl, settings)) return true;
    // Fall through: a refused recording is still a word that needs saying.
  }

  if (!speechAvailable() || !text.trim()) {
    report("unavailable", text);
    finish();
    return false;
  }

  const synth = window.speechSynthesis;
  synth.resume();

  if (!queueCleared) {
    queueCleared = true;
    synth.cancel();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // The list is filled asynchronously and is routinely empty on the first
  // click of a fresh page. Speaking into that emptiness is silent on several
  // engines, so wait for it rather than guessing.
  if (synth.getVoices().length === 0) await whenVoiceReady();

  let wedged = false;

  const queue = () =>
    new Promise<boolean>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG;
      // A shade below normal: a word heard once and typed from memory should
      // not also be a hearing test.
      utterance.rate = settings.rate ?? 0.9;

      const voice = pickVoice();
      if (voice) utterance.voice = voice;

      let settled = false;
      let accepted = false;

      const settle = (started: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearInterval(poll);
        resolve(started);
      };

      const release = () => {
        inFlight.delete(utterance);
        finish();
      };

      utterance.onstart = () => settle(true);
      utterance.onend = () => {
        settle(true);
        release();
      };
      utterance.onerror = (event) => {
        // Being cancelled counts as success only when we did the cancelling —
        // a word cut short to play the next one is not a failure. Cancelled by
        // anything else means nothing was heard, and saying otherwise is how
        // a silent exercise ends up with no fallback offered.
        const ours =
          interrupting &&
          (event.error === "canceled" || event.error === "interrupted");
        settle(ours);
        release();
      };

      // Watched, not trusted. Chrome can accept an utterance, set `speaking`,
      // and then never speak or fire a single event.
      const poll = setInterval(() => {
        if (synth.speaking) accepted = true;
      }, START_POLL_MS);

      const timeout = setTimeout(() => {
        // Accepted but never started is a wedged engine; never accepted at
        // all is a refusal. Both are silence; the report tells them apart.
        wedged = accepted;
        settle(false);
      }, START_TIMEOUT_MS);

      inFlight.add(utterance);
      synth.speak(utterance);
    });

  let started: boolean;

  if (!synth.speaking && !synth.pending) {
    started = await queue();
  } else {
    interrupting = true;
    synth.cancel();
    started = await new Promise<boolean>((resolve) => {
      setTimeout(() => {
        interrupting = false;
        queue().then(resolve);
      }, 0);
    });
  }

  if (!started) {
    report(wedged ? "was accepted but never played" : "did not start", text);
    // Nothing is coming, so the caller's "speaking" state has to be released
    // here or it stays on forever with the rings turning over silence.
    finish();
  }
  return started;
}

/**
 * Says out loud, in development, why nothing was said out loud.
 *
 * Silence with no error is the whole difficulty with this API: from the
 * outside, a refused autoplay, a missing voice and a wedged engine all look
 * identical, and the console stays empty in every case. This makes them
 * distinguishable without anyone having to paste a snippet into a console.
 */
function report(reason: string, text: string): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(`[slova] speech ${reason}: "${text}"`, speechDiagnostics());
}

/**
 * Resolves once there is a voice able to say an English word, or false when
 * the device has none. Bounded, because some browsers never fire the event
 * when the list is already final and empty.
 */
export function whenVoiceReady(): Promise<boolean> {
  if (!speechAvailable()) return Promise.resolve(false);

  const synth = window.speechSynthesis;
  if (pickVoice()) return Promise.resolve(true);

  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      clearTimeout(timer);
      resolve(pickVoice() !== null);
    };
    const timer = setTimeout(done, 1500);
    synth.addEventListener("voiceschanged", done);
  });
}

/**
 * What the browser will admit to. Not used by the app — this is here for the
 * one question that cannot be answered from the outside: when a device is
 * silent, is it refusing, broken, or simply voiceless?
 */
export function speechDiagnostics(): Record<string, unknown> {
  if (!speechAvailable()) return { available: false };

  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  return {
    available: true,
    speaking: synth.speaking,
    pending: synth.pending,
    paused: synth.paused,
    voices: voices.length,
    english: voices.filter((v) => v.lang.startsWith("en")).length,
    chosen: pickVoice()?.name ?? null,
    local: pickVoice()?.localService ?? null,
  };
}
