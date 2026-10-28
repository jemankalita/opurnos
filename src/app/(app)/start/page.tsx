import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ensureProfileRow } from "@/lib/profile";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Your profile" };

export default async function StartPage() {
  const { userId } = await requireUser();
  const row = await ensureProfileRow(userId);
  return <Onboarding initialProfile={row.parsed ?? null} initialPrefs={row.prefs} onboarded={row.onboarded} resumeName={row.resumeFileName} />;
}
