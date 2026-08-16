import { createHash } from "node:crypto";

import {
  AUDIO_PROFILE_VERSION,
  type AudioProfileName,
} from "@/lib/audio/profile";

function audioDigest(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function audioGenerationClaimKey(text: string): string {
  return `tts-generation:${AUDIO_PROFILE_VERSION}:normal:${audioDigest(text)}`;
}

/** Server-only key for on-demand audio; user text never appears in the path. */
export function runtimeAudioObjectKey(
  text: string,
  profile: AudioProfileName = "normal",
): string {
  return `audio/runtime/${AUDIO_PROFILE_VERSION}/${profile}/${audioDigest(text)}.mp3`;
}

/** Server-only key for an immutable, profile-versioned course recording. */
export function versionedCourseAudioObjectKey(
  text: string,
  profile: AudioProfileName,
): string {
  return `audio/courses/${AUDIO_PROFILE_VERSION}/${profile}/${audioDigest(text)}.mp3`;
}
