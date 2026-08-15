/**
 * Public addresses. hello@ is the From on mail the app sends (Resend).
 * contact@ is the inbox people write to — add it in Cloudflare Email Routing
 * (or a catch-all) so it lands in the same Gmail as hello@.
 */
export const MAIL_FROM = "hello@slova.study";
export const CONTACT_EMAIL = "contact@slova.study";
export const SITE_ORIGIN = "https://slova.study";

/**
 * Unique English words in the seeded shared dictionary (translations + audio).
 * The landing page quotes this; keep it in step with README and the seed file.
 */
export const SHARED_LEXICON_SIZE = 8172;
