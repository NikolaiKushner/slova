import type { AudioProfileName } from "@/lib/audio/profile";
import { versionedCourseAudioObjectKey } from "@/lib/audio/object-key";
import { speakText } from "@/lib/courses/speak-text";

/** Server-side object key for an immutable course recording. */
export function courseAudioObjectKey(
  text: string,
  profile: AudioProfileName,
): string {
  return versionedCourseAudioObjectKey(speakText(text), profile);
}
