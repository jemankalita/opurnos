import { ABROAD_PROGRAMS } from "./programs-abroad";
import { INDIA_PROGRAMS } from "./programs-india";
import type { Program } from "./types";

/** Every program in the tracker. Dates change only by hand, after checking the official page. */
export const PROGRAMS: Program[] = [...INDIA_PROGRAMS, ...ABROAD_PROGRAMS];
