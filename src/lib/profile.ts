import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { DEFAULT_PREFERENCES, type Preferences, type Profile } from "./schemas";
import { truncate } from "./text";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** Extracts text from a PDF buffer. Throws a user-facing message on failure. */
export async function pdfToText(buffer: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  try {
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    return text.replace(/\u0000/g, "").trim();
  } catch {
    throw new Error("We couldn't read that PDF. Try exporting it again, or paste the text instead.");
  }
}

/** Compact, model-friendly rendering of a profile (keeps prompts small and cacheable). */
export function profileForPrompt(p: Profile, prefs?: Preferences): string {
  const lines = [
    `Name: ${p.name}`,
    `Headline: ${p.headline}`,
    `Location: ${p.location ?? "unknown"} (country: ${p.country ?? "unknown"})`,
    ...p.education.map(
      (e) => `Education: ${e.degree} (${e.level}) at ${e.school}${e.gradYear ? `, graduating ${e.gradYear}` : ""}${e.gpa ? `, GPA ${e.gpa}` : ""}`,
    ),
    ...p.experience.map(
      (x) => `Experience: ${x.title} at ${x.org} (${x.start ?? "?"} – ${x.end ?? "?"})${x.bullets.length ? `: ${x.bullets.join(" / ")}` : ""}`,
    ),
    ...p.projects.map((pr) => `Project: ${pr.name} — ${pr.description} [${pr.tech.join(", ")}]`),
    `Skills: ${p.skills.join(", ")}`,
    p.achievements.length ? `Achievements: ${p.achievements.join(" / ")}` : "",
    `Interests: ${p.interests.join(", ")}`,
  ];
  if (prefs) {
    lines.push(
      `Wants: ${prefs.types.join(", ")}${prefs.roles.length ? `; roles: ${prefs.roles.join(", ")}` : ""}`,
      `Preferred locations: ${prefs.locations.join(", ") || "any"}${prefs.remoteOk ? " (remote ok)" : ""}`,
      `Work authorization: ${prefs.workAuth.join(", ") || "unspecified"}; needs visa sponsorship: ${prefs.needsSponsorship ? "yes" : "no"}`,
    );
  }
  return truncate(lines.filter(Boolean).join("\n"), 8000);
}

export async function getProfileRow(userId: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  return row ?? null;
}

export async function ensureProfileRow(userId: string) {
  const existing = await getProfileRow(userId);
  if (existing) return existing;
  const db = await getDb();
  const [row] = await db
    .insert(schema.profiles)
    .values({ userId, prefs: DEFAULT_PREFERENCES })
    .onConflictDoNothing()
    .returning();
  return row ?? (await getProfileRow(userId))!;
}
