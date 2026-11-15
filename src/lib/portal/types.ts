/** Which section a program belongs in. `any-year` also welcomes first-years, so it lists under 1st and 2nd year. */
export type YearFit = "1st-only" | "1st-2nd" | "2nd-only" | "any-year";

export type Category = "internship" | "insight" | "scholarship" | "research" | "fellowship" | "community" | "competition";

/** `paused` means evidence says it stopped; `unclear` means nothing confirms this cycle either way. */
export type Availability = "running" | "paused" | "unclear";

export type Region = "india" | "abroad" | "online";

export type Confidence = "high" | "medium" | "low";

export type Program = {
  id: string;
  name: string;
  org: string;
  category: Category;
  years: YearFit;
  region: Region;
  location: string;
  /** Can a student enrolled at an Indian college apply? */
  indianColleges: "yes" | "no" | "unclear";
  availability: Availability;
  summary: string;
  /** Who else is excluded, for example "Women only" or "Family income under ₹2.5 lakh". */
  restriction?: string;
  pay?: string;
  /** Dates stated by the program for the current cycle, as YYYY-MM-DD. Never a guess. */
  published?: { opens?: string; closes?: string };
  /** The months applications usually run, 1 to 12, projected from past cycles. */
  expected?: { from: number; to: number };
  rolling?: boolean;
  /** What actually happened last time, with the year, so a projection can be judged. */
  lastCycle?: string;
  url: string;
  sources: string[];
  confidence: Confidence;
  /** The day these details were last checked against a source, as YYYY-MM-DD. */
  checkedOn: string;
  /** Set when the official page can be fetched and watched for changes. */
  watch?: boolean;
};
