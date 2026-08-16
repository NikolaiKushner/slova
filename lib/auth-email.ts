/**
 * Transactional email. Colours are the design-system tokens, inlined
 * because mail clients have no Tailwind. Do not invent new hex here.
 */

import { MAIL_FROM } from "@/lib/site";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/locale";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";

export const DEFAULT_EMAIL_FROM = `Slova <${MAIL_FROM}>`;

const MIST = "#EEF2F4";
const INK = "#15202B";
const TEAL = "#115E59";
const MUTED = "#5B6B78";
const CARD = "#ffffff";

const catalogs = { en, ru } as const;

function emailCopy(locale: AppLocale) {
  return catalogs[locale].email;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function brandedEmailHtml({
  body,
  button,
  url,
  ignore,
}: {
  body: string;
  button: string;
  url: string;
  ignore: string;
}): string {
  const href = escapeHtml(url);
  return `
<body style="margin:0;background:${MIST};">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:${MIST};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:480px;background:${CARD};border-radius:12px;padding:36px 32px;">
          <tr>
            <td style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:${INK};padding-bottom:8px;">
              Slova
            </td>
          </tr>
          <tr>
            <td style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:${INK};padding-bottom:24px;">
              ${escapeHtml(body)}
            </td>
          </tr>
          <tr>
            <td>
              <a href="${href}" target="_blank"
                style="display:inline-block;background:${TEAL};color:${CARD};font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;border-radius:8px;padding:12px 20px;">
                ${escapeHtml(button)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:${MUTED};padding-top:28px;">
              ${escapeHtml(ignore)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
`.trim();
}

export function brandedEmailText({
  body,
  url,
  ignore,
}: {
  body: string;
  url: string;
  ignore: string;
}): string {
  return `${body}\n\n${url}\n\n${ignore}\n`;
}

export function confirmEmailCopy(url: string, locale: AppLocale = DEFAULT_LOCALE) {
  const copy = emailCopy(locale);
  return {
    subject: copy.confirmSubject,
    html: brandedEmailHtml({
      body: copy.confirmBody,
      button: copy.confirmButton,
      url,
      ignore: copy.ignoreHtml,
    }),
    text: brandedEmailText({ body: copy.confirmBody, url, ignore: copy.ignoreText }),
  };
}

export function resetEmailCopy(url: string, locale: AppLocale = DEFAULT_LOCALE) {
  const copy = emailCopy(locale);
  return {
    subject: copy.resetSubject,
    html: brandedEmailHtml({
      body: copy.resetBody,
      button: copy.resetButton,
      url,
      ignore: copy.ignoreHtml,
    }),
    text: brandedEmailText({ body: copy.resetBody, url, ignore: copy.ignoreText }),
  };
}

export async function sendAppEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) throw new Error("AUTH_RESEND_KEY is not set");

  const from = process.env.AUTH_EMAIL_FROM ?? DEFAULT_EMAIL_FROM;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    throw new Error("Resend error: " + JSON.stringify(await res.json()));
  }
}
