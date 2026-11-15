import { ExternalLink } from "lucide-react";
import type { TrackerState } from "@/lib/portal/schedule";
import type { TrackerEntry } from "@/lib/portal/tracker-view";
import type { Category } from "@/lib/portal/types";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;
// A page change older than this is no longer news.
const RECENT_CHANGE_DAYS = 14;
// Details checked longer ago than this get a "may be out of date" note.
const STALE_DETAILS_DAYS = 90;
const SHOWN_CHANGE_LINES = 3;

const STATE_STYLE: Record<TrackerState, string> = {
  open: "bg-sage/60 text-eligible",
  opening: "bg-peri/50 text-likely",
  "likely-open": "bg-sky/40 text-likely",
  rolling: "bg-sand text-text",
  expected: "border border-border-strong text-muted",
  unknown: "border border-dashed border-border-strong text-faint",
  paused: "bg-sand text-ineligible line-through decoration-1",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  internship: "Internship",
  insight: "Insight program",
  scholarship: "Scholarship",
  research: "Research",
  fellowship: "Fellowship",
  community: "Community",
  competition: "Competition",
};

const COLLEGE_LABEL = { yes: "Open to Indian colleges", no: "Not open to Indian colleges", unclear: "Indian colleges: not stated" } as const;

const daysSince = (iso: string, today: string) => Math.floor((Date.parse(today) - Date.parse(iso.slice(0, 10))) / DAY_MS);

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-[14px]">
      <dt className="w-24 shrink-0 text-faint">{label}</dt>
      <dd className="text-muted">{children}</dd>
    </div>
  );
}

function PageChange({ watch, today }: { watch: NonNullable<TrackerEntry["watch"]>; today: string }) {
  if (!watch.changedAt || daysSince(watch.changedAt, today) > RECENT_CHANGE_DAYS) return null;
  return (
    <div className="mt-3 rounded-sm bg-clay/30 px-3 py-2 text-[13px]">
      <p className="font-medium">Official page changed on {formatDay(watch.changedAt)}. Check it for new dates.</p>
      {watch.added.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-muted">
          {watch.added.slice(0, SHOWN_CHANGE_LINES).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProgramCard({ entry, today }: { entry: TrackerEntry; today: string }) {
  const { program, timing, watch } = entry;
  const isDetailsOld = daysSince(program.checkedOn, today) > STALE_DETAILS_DAYS;
  return (
    <article className="flex flex-col rounded-md border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex h-6 items-center rounded-sm px-2 text-xs font-medium", STATE_STYLE[timing.state])}>{timing.label}</span>
        {timing.daysLeft !== null && timing.daysLeft >= 0 && (
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-signal">
            {timing.daysLeft === 0 ? "Today" : `${timing.daysLeft} day${timing.daysLeft === 1 ? "" : "s"} ${timing.state === "opening" ? "to go" : "left"}`}
          </span>
        )}
        <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] text-faint">{CATEGORY_LABEL[program.category]}</span>
      </div>

      <h3 className="mt-3 text-[18px] font-semibold leading-snug">{program.name}</h3>
      <p className="text-[14px] text-muted">
        {program.org} · {program.location}
      </p>
      <p className="mt-3 text-[15px]">{program.summary}</p>

      <dl className="mt-3 space-y-1">
        {program.restriction && <Detail label="Who">{program.restriction}</Detail>}
        {program.pay && <Detail label="Pay">{program.pay}</Detail>}
        {program.lastCycle && <Detail label="Last cycle">{program.lastCycle}</Detail>}
        <Detail label="From India">{COLLEGE_LABEL[program.indianColleges]}</Detail>
      </dl>

      {watch && <PageChange watch={watch} today={today} />}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-[12px] text-faint">
        <a href={program.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-text underline-offset-4 hover:underline">
          Official page <ExternalLink className="size-3.5" aria-hidden />
        </a>
        <span>
          Confidence: {program.confidence} · checked {formatDay(program.checkedOn)}
          {isDetailsOld && " · may be out of date"}
        </span>
        {watch?.lastError && <span title={watch.lastError}>Page check failing</span>}
      </div>
    </article>
  );
}
