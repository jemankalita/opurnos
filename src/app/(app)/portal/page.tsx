import type { Metadata } from "next";
import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { isStale, loadLiveListings, loadWatchStatus, refreshWatches, watchedPrograms, type LiveListing } from "@/lib/portal/live";
import { PROGRAMS } from "@/lib/portal/programs";
import { istDay, programTiming } from "@/lib/portal/schedule";
import type { TrackerEntry, WatchStatus } from "@/lib/portal/tracker-view";
import { Tracker } from "./tracker";

export const metadata: Metadata = { title: "Start early" };

// One background refresh at a time per server instance, however many people load the page.
let refreshing: Promise<unknown> | null = null;

function refreshInBackground() {
  if (refreshing) return;
  refreshing = refreshWatches(PROGRAMS)
    .catch((err) => console.error("[portal] page-watch refresh failed", err))
    .finally(() => {
      refreshing = null;
    });
  after(() => refreshing);
}

async function loadLive(): Promise<{ statuses: Map<string, WatchStatus>; listings: LiveListing[]; isLiveDown: boolean }> {
  try {
    const [statuses, listings] = await Promise.all([loadWatchStatus(PROGRAMS), loadLiveListings()]);
    return { statuses, listings, isLiveDown: false };
  } catch (err) {
    // The tracker itself is static data, so it still renders when the database is unreachable.
    console.error("[portal] could not load live data", err);
    return { statuses: new Map(), listings: [], isLiveDown: true };
  }
}

export default async function PortalPage() {
  await requireUser();
  const now = new Date();
  const { statuses, listings, isLiveDown } = await loadLive();
  if (!isLiveDown && isStale([...statuses.values()], watchedPrograms(PROGRAMS).length, now)) refreshInBackground();

  const entries: TrackerEntry[] = PROGRAMS.map((program) => ({
    program,
    timing: programTiming(program, now),
    watch: statuses.get(program.id) ?? null,
  }));

  return <Tracker entries={entries} live={listings} today={istDay(now)} isLiveDown={isLiveDown} />;
}
