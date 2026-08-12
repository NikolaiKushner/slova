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

/** Checked early: `speaking` flips before `onstart` fires on some engines. */
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
export function speak(text: string): Promise<boolean> {
  if (!speechAvailable() || !text.trim()) return Promise.resolve(false);

  const synth = window.speechSynthesis;
  synth.resume();

  const queue = () =>
    new Promise<boolean>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG;
      // A shade below normal: a word heard once and typed from memory should
      // not also be a hearing test.
      utterance.rate = 0.9;

      const voice = pickVoice();
      if (voice) utterance.voice = voice;

      let settled = false;
      const settle = (started: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearInterval(poll);
        resolve(started);
      };

      const release = () => {
        inFlight.delete(utterance);
      };

      utterance.onstart = () => settle(true);
      utterance.onend = () => {
        settle(true);
        release();
      };
      utterance.onerror = (event) => {
        // Cancelling on purpose is not a failure worth reporting.
        settle(event.error === "canceled" || event.error === "interrupted");
        release();
      };

      // Second opinion: some engines set `speaking` without ever firing
      // `onstart`, and treating those as failures would hide working audio
      // behind an apology.
      const poll = setInterval(() => {
        if (synth.speaking) settle(true);
      }, START_POLL_MS);

      // Nothing at all — the shape of a refused autoplay, or of an engine
      // that has quietly stopped working.
      const timeout = setTimeout(() => settle(false), START_TIMEOUT_MS);

      inFlight.add(utterance);
      synth.speak(utterance);
    });

  if (!synth.speaking && !synth.pending) return queue();

  // Let the cancel land on its own turn before queueing the next one.
  synth.cancel();
  return new Promise((resolve) => setTimeout(() => queue().then(resolve), 0));
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
