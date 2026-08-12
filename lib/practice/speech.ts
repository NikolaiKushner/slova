/**
 * Saying a word out loud.
 *
 * The browser's own speech synthesiser: free, no key, no storage, and it can
 * pronounce any word — including the phrases no recorded dictionary has. When
 * there is recorded audio worth using, a URL on the shared lexeme will take
 * precedence here and nothing else will need to change.
 *
 * The rest of this file is defensive for reasons that are not obvious, and all
 * of them were reached the hard way:
 *
 * - **A browser will not talk unprompted.** Speech started from a page load
 *   rather than from a click is blocked, silently, with no exception thrown.
 *   On iOS it is blocked *every* time, not just the first. So `speak` reports
 *   whether it actually started, and the caller has to have an answer for no.
 * - **`cancel()` immediately followed by `speak()` can wedge the queue** in
 *   Chrome: the new utterance never fires and nothing plays again until the
 *   page is reloaded. Cancelling only when something is actually speaking, and
 *   letting the cancel land before queueing, avoids it.
 * - **The queue can be left paused** by a background tab or a lost focus.
 *   `resume()` is a no-op when it is not, so it is always worth calling.
 * - **Voices load asynchronously**, and speaking before they arrive gets
 *   silence on some browsers rather than a default voice.
 */

const LANG = "en-US";

/** How long to wait for the utterance to actually begin before giving up. */
const START_TIMEOUT_MS = 1200;

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((voice) => voice.lang.startsWith("en"));
  if (english.length === 0) return null;

  // Local voices start instantly; a network voice adds a pause before every
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
        clearTimeout(timer);
        resolve(started);
      };

      utterance.onstart = () => settle(true);
      utterance.onerror = (event) => {
        // Cancelling on purpose is not a failure to report.
        settle(event.error === "canceled" || event.error === "interrupted");
      };
      // Nothing fired at all — the usual shape of a blocked autoplay.
      const timer = setTimeout(() => settle(false), START_TIMEOUT_MS);

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
