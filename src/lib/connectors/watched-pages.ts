import type { OpportunityType } from "../schemas";

// Seasonal programs and fresher drives whose official pages post dates only when a cycle opens,
// with no feed or structured data. Each was fetched on 2026-10-28: robots.txt allows it and its
// date lines are in the server-rendered HTML. `about` is limited to what those pages state.
// Not watchable: TCS and Infosys careers (Akamai blocks bots), Cognizant and HCLTech TechBee
// (bot challenge or 403), NCRA-TIFR VSRP (no date lines; it's in the curated list instead).

export type WatchedPage = {
  id: string;
  url: string;
  title: string;
  org: string;
  type: OpportunityType;
  locations: string[];
  tags: string[];
  about: string;
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
];
