import { eq } from "drizzle-orm";
import { parseResume } from "@/lib/ai/agents";
import { requireApiUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { fail, handle, ok } from "@/lib/http";
import { ensureProfileRow, MAX_RESUME_BYTES, pdfToText } from "@/lib/profile";
import { profileKeywords } from "@/lib/ranking";

export const maxDuration = 120;

export const POST = handle(async (req: Request) => {
  const { userId } = await requireApiUser();
  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "Send the resume as a file or text.");

  const file = form.get("file");
  const pasted = form.get("text");
  let text = typeof pasted === "string" ? pasted.trim() : "";
  let pdfBase64: string | null = null;
  let fileName: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_RESUME_BYTES) return fail(413, "That file is over 5 MB. Export a lighter PDF.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Check the magic bytes, not just the extension.
    if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return fail(415, "Please upload a PDF.");
    text = await pdfToText(bytes);
    pdfBase64 = Buffer.from(bytes).toString("base64");
    fileName = file.name.slice(0, 120);
  }
  if (!pdfBase64 && text.length < 80) return fail(400, "That's too short to be a resume. Upload a PDF or paste the full text.");

  const row = await ensureProfileRow(userId);
  const parsed = await parseResume({ userId, text, pdfBase64, fileName });
  // Sensible first guesses from the resume. Until onboarding is finished they track the latest
  // upload; afterwards the user's own choices win.
  const keep = (current: string[]) => row.onboarded && current.length > 0;
  const prefs = {
    ...row.prefs,
    workAuth: keep(row.prefs.workAuth) ? row.prefs.workAuth : parsed.value.country ? [parsed.value.country] : [],
    roles: keep(row.prefs.roles) ? row.prefs.roles : parsed.value.experience.slice(0, 2).map((e) => e.title).filter(Boolean),
  };
  const db = await getDb();
  await db
    .update(schema.profiles)
    .set({
      resumeText: text,
      resumeFile: pdfBase64,
      resumeFileName: fileName,
      parsed: parsed.value,
      prefs,
      keywords: profileKeywords(parsed.value, prefs),
      updatedAt: new Date(),
    })
    .where(eq(schema.profiles.userId, userId));
  return ok({ profile: parsed.value, prefs, parsedBy: parsed.by });
});
