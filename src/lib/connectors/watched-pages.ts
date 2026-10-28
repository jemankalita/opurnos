import type { OpportunityType } from "../schemas";

// Seasonal programs and fresher drives whose official pages post dates only when a cycle opens,
// with no feed or structured data. Each was fetched on 2026-10-28: robots.txt allows it and its
// date lines are in the server-rendered HTML. `about` is limited to what those pages state.
// Not watchable: TCS and Infosys careers (Akamai blocks bots), Cognizant and HCLTech TechBee
// (bot challenge or 403), NCRA-TIFR VSRP (no date lines; it's in the curated list instead),
// CAT (HTTP 500), UPSC (403), AAI careers (robots.txt disallows), NTPC/BEL/DRDO careers (unreachable).

export type WatchedPage = {
  id: string;
  url: string;
  title: string;
  org: string;
  type: OpportunityType;
  locations: string[];
  tags: string[];
  about: string;
  /** On busy pages (a PSU's notice board), only these lines count, so unrelated notices don't flag a change. */
  focus?: RegExp;
};

export const WATCHED_PAGES: WatchedPage[] = [
  {
    id: "tifr-math-vsrp",
    url: "https://mathweb.tifr.res.in/vsrp.html",
    title: "Visiting Students' Research Programme in Mathematics",
    org: "TIFR School of Mathematics, Mumbai",
    type: "research",
    locations: ["Mumbai, India"],
    tags: ["Summer research", "Mathematics"],
    about: "A summer research programme in mathematics at TIFR Mumbai. The 2026 programme ran May 18 to June 18, 2026; applications were open February 6 to March 6, 2026.",
  },
  {
    id: "surge-iitk",
    url: "https://surge.iitk.ac.in/",
    title: "SURGE Summer Research Internship",
    org: "IIT Kanpur",
    type: "research",
    locations: ["Kanpur, India"],
    tags: ["Summer research", "Undergraduate"],
    about: "IIT Kanpur's summer research internship for undergraduates. SURGE-2026 ran May 11 to July 10, 2026, and online registration was open February 2 to 22, 2026.",
  },
  {
    id: "sn-bose-scholars",
    url: "https://iusstf.org/s-n-bose-scholars-program",
    title: "S.N. Bose Scholars Program",
    org: "IUSSTF",
    type: "research",
    locations: ["United States"],
    tags: ["Summer research", "Study abroad"],
    about:
      "Summer research internships at US universities for Indian students, run by the Indo-US Science and Technology Forum. " +
      "Open to students of Atmospheric and Earth Sciences; Chemical Sciences; Engineering Sciences; Mathematical and Computational Sciences; and Physical Sciences.",
  },
  {
    id: "inlaks-scholarships",
    url: "https://www.inlaksfoundation.org/scholarships/",
    title: "Inlaks Shivdasani Foundation Scholarships",
    org: "Inlaks Shivdasani Foundation",
    type: "scholarship",
    locations: [],
    tags: ["Study abroad", "Postgraduate"],
    about:
      "Scholarships for Indians to study at top universities abroad. Applicants must hold admission to the institution and course at the time of applying, " +
      "and must have resided, been employed or studied in India for at least two years after their undergraduate degree.",
  },
  {
    id: "jn-tata-endowment",
    url: "https://www.jntataendowment.org/",
    title: "J N Tata Endowment Loan Scholarship",
    org: "J N Tata Endowment",
    type: "scholarship",
    locations: [],
    tags: ["Study abroad", "Postgraduate"],
    about:
      "Loan scholarships for Indians who have completed their undergraduate studies at a recognised Indian university and are going abroad for higher studies. " +
      "For the Fall 2026 – Spring 2027 program, forms were available from 5 January to 29 March 2026.",
  },
  {
    id: "kc-mahindra-scholarships",
    url: "https://www.kcmet.org/",
    title: "K.C. Mahindra Scholarships for Post-Graduate Studies Abroad",
    org: "K.C. Mahindra Education Trust",
    type: "scholarship",
    locations: [],
    tags: ["Study abroad", "Postgraduate"],
    about: "Scholarships from the K.C. Mahindra Education Trust for Indian graduates going abroad for postgraduate study.",
  },
  {
    id: "chevening",
    url: "https://www.chevening.org/scholarships/",
    title: "Chevening Scholarships",
    org: "UK Government (FCDO)",
    type: "scholarship",
    locations: ["United Kingdom"],
    tags: ["Study abroad", "Master's"],
    about: "UK government scholarships for a one-year master's degree in the UK, for people with leadership potential and work experience.",
  },
  {
    id: "smart-india-hackathon",
    url: "https://sih.gov.in/",
    title: "Smart India Hackathon",
    org: "Ministry of Education's Innovation Cell",
    type: "hackathon",
    locations: ["India"],
    tags: ["National hackathon", "Teams via your institute"],
    about: "India's national hackathon. Institutes run internal rounds and their SPOC nominates teams; for 2026, team nomination and idea submission closed on 9 October 2026.",
  },
  {
    id: "tcs-ion-nqt",
    url: "https://www.tcsion.com/hub/national-qualifier-test/",
    title: "TCS iON National Qualifier Test (NQT)",
    org: "TCS iON",
    type: "job",
    locations: ["India"],
    tags: ["Fresher hiring", "Off-campus", "Aptitude test"],
    about:
      "TCS's off-campus hiring test for freshers. You can apply for jobs in various corporates that accept TCS iON NQT scores. " +
      "The official page lists students passing between 2022 and 2028 as eligible.",
  },

  // ---- Government programs and PSU hiring (pages fetched 2026-10-29) ----
  {
    id: "pm-internship-scheme",
    url: "https://pminternship.mca.gov.in/login/",
    title: "PM Internship Scheme",
    org: "Ministry of Corporate Affairs",
    type: "internship",
    locations: ["India"],
    tags: ["Government", "Stipend"],
    about:
      "The Prime Minister's Internship Scheme (PMIS) is part of the Prime Minister's package of five schemes and initiatives for employment, skilling and other opportunities for India's youth. " +
      "Apply only on the official portal; it is the one place applications are accepted.",
    // The page is mostly event news; only round and application lines matter.
    focus: /\bround\s*(\d|i{1,3}\b|iv\b)|\b(apply|applications?|registration|register|last date|deadline|opens?|closes?)\b/i,
  },
  {
    id: "nats-apprenticeship",
    url: "https://nats.education.gov.in/",
    title: "NATS Apprenticeship (graduates and diploma holders)",
    org: "Ministry of Education (NATS 2.0)",
    type: "internship",
    locations: ["India"],
    tags: ["Government", "Apprenticeship", "Stipend"],
    about:
      "Paid apprenticeships with employers across India under the National Apprenticeship Training Scheme. " +
      "Candidates are eligible only after completing e-KYC verification on the NATS 2.0 portal, and the Government's share of the stipend is paid through DBT.",
  },
  {
    id: "powergrid-gate",
    url: "https://www.powergrid.in/job-opportunities",
    title: "POWERGRID Engineer Trainee recruitment",
    org: "POWERGRID",
    type: "job",
    locations: ["India"],
    tags: ["PSU", "Through GATE", "Government"],
    about: "POWERGRID's recruitment notices. It is recruiting Engineer Trainees-2027 through GATE 2027.",
    focus: /GATE|गेट|Engineer Trainee|apprentice/i,
  },
  {
    id: "npcil-gate",
    url: "https://www.npcilcareers.co.in/MainSite/default.aspx",
    title: "NPCIL Executive Trainee recruitment",
    org: "Nuclear Power Corporation of India (NPCIL)",
    type: "job",
    locations: ["India"],
    tags: ["PSU", "Through GATE", "Government"],
    about: "NPCIL's recruitment page (in Hindi). It lists the recruitment of Executive Trainees (2027) through GATE, and apprentice openings at its plant sites.",
    focus: /GATE|गेट|कार्यकारी प्रशिक्षु|प्रशिक्षु|apprentice/i,
  },
  {
    id: "isro-careers",
    url: "https://www.isro.gov.in/Careers.html",
    title: "ISRO Scientist / Engineer recruitment",
    org: "ISRO",
    type: "job",
    locations: ["India"],
    tags: ["Government", "Space"],
    about: "ISRO's careers page, where it posts recruitment for scientists, engineers, technicians and administrative staff.",
    focus: /scientist|engineer|apprentice|online applications/i,
  },

  // ---- Exams ----
  {
    id: "gate-2027",
    url: "https://gate2027.iitm.ac.in/",
    title: "GATE 2027",
    org: "IIT Madras",
    type: "exam",
    locations: ["India"],
    tags: ["Exam", "Engineering", "PSU hiring"],
    about:
      "The Graduate Aptitude Test in Engineering 2027, organised by IIT Madras. Scores lead to postgraduate admissions and fellowships, and PSUs such as POWERGRID and NPCIL recruit engineers through them. " +
      "Registration through DigiLocker is mandatory for Indian nationals.",
  },
];
