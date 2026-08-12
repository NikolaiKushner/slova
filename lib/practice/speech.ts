/**
 * Saying a word out loud.
 *
 * The browser's own speech synthesiser, deliberately: it costs nothing, needs
 * no key and no storage, and it can pronounce *any* word — including the ones
 * a recorded dictionary has never heard of, which is most phrases and every
 * rare word. Recorded human audio sounds better where it exists; when there is
 * something to put in it, a URL on the shared lexeme will take precedence here
 * and nothing else will need to change.
 *
 * It is also the one part of the practice engine that can simply be missing.
 * A browser with no English voice installed cannot run the listening formats,
 * so this reports that honestly and the trainings that need it step aside.
 */

const LANG = "en-US";

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * The best English voice on this device. Local voices are preferred over
 * network ones: they start instantly, and a training that waits half a second
 * before every question stops feeling like a training.
 */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((voice) => voice.lang.startsWith("en"));
  if (english.length === 0) return null;

  return (
    english.find((voice) => voice.lang === LANG && voice.localService) ??
    english.find((voice) => voice.localService) ??
    english[0]
  );
}

export function speak(text: string): void {
  if (!speechAvailable() || !text.trim()) return;

  const synth = window.speechSynthesis;
  // Cancel first: pressing "play it again" while it is still talking should
  // start over rather than queue a second reading behind the first.
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG;
  // A shade below normal. Vocabulary is heard once and typed from memory, and
  // full speed turns that into a hearing test.
  utterance.rate = 0.9;

  const voice = pickVoice();
  if (voice) utterance.voice = voice;

  synth.speak(utterance);
}

/**
 * Voices load asynchronously in some browsers, and asking too early returns an
 * empty list. Resolves once there is something to say a word with, or false
 * when the device simply has no English voice.
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
    // Some browsers never fire the event when the list is already final and
    // empty, so the wait is bounded rather than open-ended.
    const timer = setTimeout(done, 1500);
    synth.addEventListener("voiceschanged", done);
  });
}
