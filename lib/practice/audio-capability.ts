import type { PracticeWord } from "@/lib/practice/question";

/**
 * Whether every audio prompt in a session has a way to be heard.
 *
 * Browser speech can pronounce any word. Without it, recordings are
 * sufficient only when every word in the session has a non-blank URL.
 */
export function audioAvailable(
  words: readonly Pick<PracticeWord, "audioUrl">[],
  browserVoiceReady: boolean,
  runtimeEnabled: boolean,
): boolean {
  return (
    browserVoiceReady ||
    runtimeEnabled ||
    words.every((word) => Boolean(word.audioUrl?.trim()))
  );
}
