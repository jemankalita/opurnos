import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProfileRow } from "@/lib/profile";
import { getRadar } from "@/lib/queries";
import { RadarFeed } from "./radar-feed";

export const metadata: Metadata = { title: "Radar" };

export default async function RadarPage() {
  const { userId } = await requireUser();
  const profile = await getProfileRow(userId);
  if (!profile?.onboarded) redirect("/start");
  const items = await getRadar(userId, { includeIneligible: false });
  // The offline parser writes "Your name" when it can't find one; never greet someone with that.
  const name = profile.parsed?.name ?? "";
  const firstName = /^your name$/i.test(name.trim()) ? "" : (name.split(" ")[0] ?? "");
  return (
    <RadarFeed
      firstName={firstName}
      lastMatchedAt={profile.lastMatchedAt?.toISOString() ?? null}
      items={items.map((i) => ({ ...i, deadline: i.deadline?.toISOString() ?? null, createdAt: i.createdAt.toISOString() }))}
    />
  );
}
