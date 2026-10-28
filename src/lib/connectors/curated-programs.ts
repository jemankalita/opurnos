import { EMPTY_RULES, type EligibilityRules } from "../schemas";
import type { RawOpportunity } from "./types";

// Recurring fellowships and grants with no machine-readable feed. Amounts, deadlines and every
// eligibility rule were copied from the program's official page on `checkedOn`. Re-check each entry
// before its next cycle, and leave `deadline` null unless the official page states the date.

type CuratedProgram = RawOpportunity & { checkedOn: string };

const rules = (r: Partial<EligibilityRules>): EligibilityRules => ({ ...structuredClone(EMPTY_RULES), ...r });

export const CURATED_PROGRAMS: CuratedProgram[] = [
  {
    externalId: "thiel-fellowship",
    url: "https://thielfellowship.org/",
    applyUrl: "https://thielfellowship.my.site.com/apply/s/",
    ats: "curated",
    type: "fellowship",
    title: "Thiel Fellowship",
    org: "Thiel Foundation",
    locations: [],
    remote: true,
    deadline: null,
    comp: "$250,000",
    tags: ["Founders", "Rolling", "Young builders"],
    description:
      "The Thiel Fellowship gives $250,000 to young people who want to build new things instead of sitting in a classroom. " +
      "Anyone aged 22 or younger (and without a university degree) is eligible to apply. We accept applications year round.",
    rules: rules({ maxAge: 22, other: ["Anyone aged 22 or younger (and without a university degree) is eligible to apply."] }),
    checkedOn: "2026-10-28",
  },
  {
    externalId: "emergent-ventures",
    url: "https://www.mercatus.org/emergent-ventures",
    applyUrl: "https://www.mercatus.org/emergent-ventures",
    ats: "curated",
    type: "grant",
    title: "Emergent Ventures",
    org: "Mercatus Center",
    locations: [],
    remote: true,
    deadline: null,
    comp: null,
    tags: ["Grant", "Rolling", "Any field"],
    description:
      "Emergent Ventures is a low-overhead fellowship and grant program supporting thinkers and doers worldwide who pursue highly scalable, " +
      '"zero to one" ideas to meaningfully improve society. Applicants must be at least 13 years old.',
    rules: rules({ minAge: 13 }),
    checkedOn: "2026-10-28",
  },
  {
    externalId: "z-fellows",
    url: "https://www.zfellows.com/",
    applyUrl: "https://www.zfellows.com/",
    ats: "curated",
    type: "fellowship",
    title: "Z Fellows",
    org: "Z Fellows",
    locations: [],
    remote: true,
    deadline: null,
    comp: "$10,000",
    tags: ["Founders", "Rolling", "1 week"],
    description:
      "Z Fellows are technical builders of all ages working on side projects and startups. 1 week. $10,000. " +
      "There's no age restriction to apply! You can apply solo or with your co-founders. " +
      "Applications are reviewed on a rolling basis and there is no deadline to submit an application.",
    rules: rules({}),
    checkedOn: "2026-10-28",
  },
  {
    externalId: "pd-soros-2027",
    url: "https://pdsoros.org/apply",
    applyUrl: "https://pdsoros.org/apply",
    ats: "curated",
    type: "fellowship",
    title: "Paul & Daisy Soros Fellowships for New Americans",
    org: "Paul & Daisy Soros Fellowships",
    locations: ["United States"],
    remote: false,
    deadline: new Date("2026-10-29T18:00:00Z"), // "October 29, 2026 at 2 pm ET"
    comp: null,
    tags: ["Graduate school", "Immigrants"],
    description:
      "Application deadline: October 29, 2026 at 2 pm ET. Our eligibility requirements include your status as an immigrant or a child of immigrants. " +
      "PD Soros supports all types of full-time graduate and professional degrees at accredited institutions in the United States.",
    rules: rules({ other: ["Our eligibility requirements include your status as an immigrant or a child of immigrants"] }),
    checkedOn: "2026-10-28",
  },
  {
    externalId: "hertz-fellowship",
    url: "https://www.hertzfoundation.org/the-fellowship/who-can-apply/",
    applyUrl: "https://www.hertzfoundation.org/the-fellowship/who-can-apply/",
    ats: "curated",
    type: "fellowship",
    title: "Hertz Fellowship",
    org: "Fannie and John Hertz Foundation",
    locations: ["United States"],
    remote: false,
    deadline: null, // the official page does not state the 2027-cycle deadline yet
    comp: "Up to $250,000",
    tags: ["PhD", "Applied science", "Engineering"],
    description:
      "The Hertz Fellowship awards up to five years of funding, valued at up to $250,000, for the nation's most promising doctoral students in the applied sciences, engineering and mathematics. " +
      "Applicants must be citizens or permanent residents of the United States, and be enrolled as a first- or second-year PhD student in fall 2027 (when funding would begin). " +
      "Check the foundation's site for this cycle's deadline.",
    rules: rules({ countries: ["US"], degreeLevels: ["phd"] }),
    checkedOn: "2026-10-28",
  },
  {
    externalId: "yc-w2027",
    url: "https://www.ycombinator.com/apply",
    applyUrl: "https://www.ycombinator.com/apply",
    ats: "curated",
    type: "grant",
    title: "Y Combinator, Winter 2027 batch",
    org: "Y Combinator",
    locations: ["San Francisco"],
    remote: false,
    deadline: new Date("2026-11-03T04:00:00Z"), // "November 2 at 8pm PT" (PST)
    comp: "Investment",
    tags: ["Founders", "Accelerator", "Startup"],
    description:
      "Y Combinator is accepting applications for the Winter 2027 Batch funding cycle. The deadline to apply on-time is November 2 at 8pm PT. " +
      "We invest in companies as soon as they are accepted; we do not wait for the batch to start. " +
      "You can also apply to future batches (Spring, Summer, and Fall) now through Early Decision.",
    rules: rules({}),
    checkedOn: "2026-10-28",
  },
  {
    externalId: "a16z-speedrun-sr008",
    url: "https://a16z.com/applications-for-a16z-speedrun-sr008-are-now-open/",
    applyUrl: "https://speedrun.a16z.com/apply",
    ats: "curated",
    type: "grant",
    title: "a16z speedrun SR008",
    org: "Andreessen Horowitz",
    locations: ["San Francisco"],
    remote: false,
    deadline: new Date("2026-11-02T07:59:00Z"), // "Nov 1, 2026, at 11:59 PM PT" (PST)
    comp: "Up to $1M",
    tags: ["Founders", "Accelerator", "Startup"],
    description:
      "Applications are open October 12 – November 1, 2026; applications close Nov 1, 2026, at 11:59 PM PT. " +
      "The SR008 residency runs February 1 – April 18, 2027, in San Francisco. " +
      "We invest up to $1M: $500K for 10% upfront via a SAFE, plus up to an additional $500K into your next round within 18 months.",
    rules: rules({}),
    checkedOn: "2026-10-28",
  },
  {
    externalId: "science-ambassador-2027",
    url: "https://www.scienceambassadorscholarship.org/",
    applyUrl: "https://www.scienceambassadorscholarship.org/",
    ats: "curated",
    type: "scholarship",
    title: "Science Ambassador Scholarship",
    org: "Cards Against Humanity",
    locations: [],
    remote: true,
    deadline: new Date("2026-12-15T05:59:00Z"), // "Monday, December 14th, 2026 at 11:59PM US Central Time"
    comp: "$20,000",
    tags: ["STEM", "Undergraduate", "Women and non-binary"],
    description:
      "An annual scholarship for undergraduate women and non-binary students in science, technology, engineering, and math. " +
      "Five winners will each receive a one-time $20,000 stipend to put towards undergraduate STEM tuition in the 2027 academic year. " +
      "You must be a high school senior or an undergraduate college student to apply. All fields within science, technology, engineering, and math are eligible. " +
      "Submit your video by Monday, December 14th, 2026 at 11:59PM US Central Time.",
    rules: rules({
      degreeLevels: ["high_school", "bachelors"],
      studentsOnly: true,
      other: ["annual scholarship for undergraduate women and non-binary students in science, technology, engineering, and math"],
    }),
    checkedOn: "2026-10-28",
  },
  {
    externalId: "goldwater-2027",
    url: "https://goldwaterscholarship.gov/",
    applyUrl: "https://goldwaterscholarship.gov/",
    ats: "curated",
    type: "scholarship",
    title: "Barry Goldwater Scholarship",
    org: "Barry Goldwater Scholarship Foundation",
    locations: ["United States"],
    remote: false,
    deadline: new Date("2027-01-29T23:00:00Z"), // "Last Friday in January · 5:00 p.m. Central Time" → Jan 29, 2027
    comp: null,
    tags: ["Undergraduate", "Research", "STEM"],
    description:
      "Scholarships to college sophomores and juniors who intend to pursue research careers in the natural sciences, mathematics and engineering. " +
      "Every Goldwater applicant is nominated through their campus. Nomination deadline: last Friday in January, 5:00 p.m. Central Time. " +
      "Campus deadlines are earlier, so check with your school's Goldwater representative.",
    rules: rules({ degreeLevels: ["bachelors"], studentsOnly: true, other: ["Every Goldwater applicant is nominated through their campus."] }),
    checkedOn: "2026-10-28",
  },
  {
    externalId: "mlh-fellowship",
    url: "https://fellowship.mlh.com/",
    applyUrl: "https://fellowship.mlh.com/",
    ats: "curated",
    type: "fellowship",
    title: "MLH Fellowship",
    org: "Major League Hacking",
    locations: ["Online"],
    remote: true,
    deadline: null,
    comp: "Educational stipend",
    tags: ["Open source", "Remote", "12 weeks"],
    description:
      "A fully remote, 12-week internship alternative where participants earn a stipend and learn to collaborate on real open source projects with peers and engineers from top companies. " +
      "Tracks for aspiring software engineers and SREs. Apply today to be considered for our upcoming start dates.",
    rules: rules({}),
    checkedOn: "2026-10-28",
  },
  // India: summer research programs. Most Indian programs only post dates once a cycle opens,
  // and aggregator sites disagree, so only officially stated deadlines are filled in.
  {
    externalId: "academies-srfp-2027",
    url: "https://webjapps.ias.ac.in/fellowship2027/",
    applyUrl: "https://webjapps.ias.ac.in/fellowship2027/",
    ats: "curated",
    type: "research",
    title: "Science Academies Summer Research Fellowship 2027",
    org: "IASc, INSA and NASI",
    locations: ["India"],
    remote: false,
    deadline: new Date("2026-11-30T18:29:00Z"), // "The last date for receipt of applications online is 30 November 2026." → 23:59 IST
    comp: null,
    tags: ["Summer research", "Undergraduate", "Postgraduate", "India"],
    description:
      "The three national Science Academies offer several two-month Summer Fellowships to enable students/teachers (studying/teaching in India) " +
      "to work with scientists associated with the three Academies during 2027. " +
      "Applications are invited from motivated students and teachers from all universities and colleges affiliated to UGC/AICTE/MCI/Accredited Institutions/Private Universities for these Fellowships. " +
      "Student applicants should provide the email id of one of their teachers familiar with their work. " +
      "The selected students/teachers will be provided with entitled round trip train fare and a monthly fellowship to meet their living expenses at the place of work. " +
      "The last date for receipt of applications online is 30 November 2026.",
    rules: rules({
      countries: ["IN"],
      other: [
        "students/teachers (studying/teaching in India)",
        "Student applicants should provide the email id of one of their teachers familiar with their work.",
      ],
    }),
    checkedOn: "2026-10-28",
  },
  {
    externalId: "ncra-tifr-vsrp",
    url: "https://www.ncra.tifr.res.in/students/external-students/vsrp",
    applyUrl: "https://www.ncra.tifr.res.in/students/external-students/vsrp",
    ats: "curated",
    type: "research",
    title: "Visiting Students' Research Programme (VSRP)",
    org: "NCRA-TIFR, Pune",
    locations: ["Pune, India"],
    remote: false,
    deadline: null, // "opened in mid-January every year, with a deadline around mid-February"; no 2027 date yet
    comp: null,
    tags: ["Summer research", "Astronomy", "Physics", "Opens mid-January"],
    description:
      "Only students who are entering the final year of B.Sc./M.Sc. degrees (in Physics/Astronomy/Applied Mathematics/Electronics) or B.Tech./B.E. degrees, " +
      "or students in the final year of the B.Sc. degree, or students completing the third or fourth years of an Integrated M.Sc. degree in Physics/Mathematics are eligible to apply for the VSRP. " +
      "VSRP students are paid a stipend by NCRA-TIFR and are, subject to availability, provided accommodation in the NCRA-TIFR hostel. " +
      "Outstanding students will be offered a research scholarship towards a Ph.D. at NCRA-TIFR. " +
      "Applications for the VSRP are opened in mid-January every year, with a deadline around mid-February.",
    rules: rules({
      degreeLevels: ["bachelors", "masters"],
      studentsOnly: true,
      other: ["Only students who are entering the final year of B.Sc./M.Sc. degrees (in Physics/Astronomy/Applied Mathematics/Electronics) or B.Tech./B.E. degrees"],
    }),
    checkedOn: "2026-10-28",
  },
];
