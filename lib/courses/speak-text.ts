/**
 * Turns the deliberately small Markdown dialect used by course copy into
 * text suitable for speech. Unsupported Markdown is left untouched so this
 * function cannot silently reinterpret content the UI does not support.
 */
export function speakText(text: string): string {
  return text
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/==([^=\n]+)==/g, "$1")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

