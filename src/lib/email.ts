import { getDb, schema } from "./db";
import { env } from "./env";
import { deadlineLabel, TYPE_LABEL, VERDICT_LABEL } from "./utils";

export type SentEmail = { id: string; provider: "resend" | "local" };

/** Sends with Resend when configured; always records a copy in the outbox (viewable at /dev/outbox in dev). */
export async function sendEmail(msg: { to: string; subject: string; html: string }): Promise<SentEmail> {
  const db = await getDb();
  let provider: "resend" | "local" = "local";
  let providerId: string | null = null;
  if (env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      headers: { "List-Unsubscribe": `<${env.APP_URL}/settings>` },
    });
    if (error) throw new Error(`Email failed: ${error.message}`);
    provider = "resend";
    providerId = data?.id ?? null;
  }
  const [row] = await db.insert(schema.outbox).values({ ...msg, provider, providerId }).returning();
  return { id: row.id, provider };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Email-safe palette (inline styles, tables) mirroring the app's night-radar tokens.
const C = { bg: "#0A0B0F", card: "#12141A", border: "#23262F", text: "#ECEAE4", muted: "#8B8D98", accent: "#FFB547" };
const VERDICT_COLOR: Record<string, string> = { eligible: "#5BD69B", likely: "#7AB8FF", stretch: "#C79BFF", ineligible: "#6B6D76" };

function layout(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="dark light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,Segoe UI,Inter,Helvetica,Arial,sans-serif;color:${C.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="padding:0 4px 24px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${C.accent};margin-right:8px;vertical-align:middle"></span><span style="font-size:15px;font-weight:600;letter-spacing:.02em;vertical-align:middle">Opurnos</span></td></tr>
${body}
<tr><td style="padding:28px 4px 0;font-size:12px;line-height:18px;color:${C.muted}">You're getting this because you asked Opurnos to watch for opportunities. <a href="${env.APP_URL}/settings" style="color:${C.muted}">Change frequency or unsubscribe</a>.</td></tr>
</table></td></tr></table></body></html>`;
}

export function magicLinkEmail(url: string) {
  return {
    subject: "Your Opurnos sign-in link",
    html: layout(
      "Sign in",
      `<tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:32px">
<h1 style="margin:0 0 12px;font-size:24px;font-weight:600">Sign in to Opurnos</h1>
<p style="margin:0 0 24px;color:${C.muted};font-size:15px;line-height:22px">This link works once and expires in 15 minutes.</p>
<a href="${esc(url)}" style="display:inline-block;background:${C.accent};color:#16171B;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">Sign in</a>
<p style="margin:24px 0 0;color:${C.muted};font-size:12px">If you didn't ask for this, you can ignore it.</p></td></tr>`,
    ),
  };
}

export type DigestItem = {
  title: string;
  org: string;
  type: string;
  verdict: string;
  score: number;
  why: string;
  deadline: Date | null;
  comp: string | null;
  applyUrl: string;
  detailUrl: string;
};

export function digestEmail(name: string, items: DigestItem[]) {
  const first = name.split(" ")[0] || "there";
  const cards = items
    .map(
      (i) => `<tr><td style="padding:0 0 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.border};border-radius:14px"><tr><td style="padding:20px">
<div style="font-size:12px;color:${C.muted};margin-bottom:6px;letter-spacing:.04em;text-transform:uppercase">${esc(TYPE_LABEL[i.type] ?? i.type)} · ${esc(i.org)}</div>
<a href="${esc(i.detailUrl)}" style="font-size:18px;line-height:24px;font-weight:600;color:${C.text};text-decoration:none">${esc(i.title)}</a>
<div style="margin:10px 0 12px"><span style="display:inline-block;font-size:12px;padding:3px 8px;border-radius:999px;border:1px solid ${VERDICT_COLOR[i.verdict]};color:${VERDICT_COLOR[i.verdict]}">${esc(VERDICT_LABEL[i.verdict] ?? i.verdict)}</span>
<span style="font-size:12px;color:${C.muted};margin-left:8px;font-family:ui-monospace,Menlo,monospace">${esc(deadlineLabel(i.deadline))} · match ${i.score}</span>${i.comp ? `<span style="font-size:12px;color:${C.muted};margin-left:8px">· ${esc(i.comp)}</span>` : ""}</div>
<p style="margin:0 0 16px;font-size:14px;line-height:21px;color:${C.muted}">${esc(i.why)}</p>
<a href="${esc(i.applyUrl)}" style="display:inline-block;background:${C.accent};color:#16171B;text-decoration:none;font-weight:600;font-size:14px;padding:10px 16px;border-radius:10px">Apply now →</a>
<a href="${esc(i.detailUrl)}" style="display:inline-block;color:${C.text};text-decoration:none;font-size:14px;padding:10px 12px">Details</a>
</td></tr></table></td></tr>`,
    )
    .join("");
  return {
    subject: `${items.length} new ${items.length === 1 ? "opportunity" : "opportunities"} on your radar`,
    html: layout(
      "Your radar",
      `<tr><td style="padding:0 4px 20px"><h1 style="margin:0 0 8px;font-size:26px;line-height:32px;font-weight:600">Hi ${esc(first)}, fresh picks for you.</h1>
<p style="margin:0;color:${C.muted};font-size:15px;line-height:22px">Here's what opened up that you qualify for. Each one was checked against your profile, with the evidence shown in the app.</p></td></tr>${cards}`,
    ),
  };
}
