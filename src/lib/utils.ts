import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAY = 86_400_000;

/** "in 3 days", "today", "closed" — deadline copy used across cards and emails. */
export function deadlineLabel(deadline: Date | string | null | undefined, now = new Date()): string {
  if (!deadline) return "Rolling";
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return "Closed";
  const days = Math.floor(diff / DAY);
  if (days === 0) return "Closes today";
  if (days === 1) return "1 day left";
  if (days < 60) return `${days} days left`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysUntil(deadline: Date | string | null | undefined, now = new Date()): number | null {
  if (!deadline) return null;
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  return Math.floor((d.getTime() - now.getTime()) / DAY);
}

export const TYPE_LABEL: Record<string, string> = {
  job: "Job",
  internship: "Internship",
  hackathon: "Hackathon",
  fellowship: "Fellowship",
  scholarship: "Scholarship",
  research: "Research",
  conference: "Conference",
  grant: "Grant",
  competition: "Competition",
};

export const VERDICT_LABEL: Record<string, string> = {
  eligible: "Eligible",
  likely: "Likely eligible",
  stretch: "Stretch",
  ineligible: "Not eligible",
};
