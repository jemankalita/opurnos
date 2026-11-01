import { rules, type CuratedProgram } from "./curated-programs";

// Paid open-source programs, Bitcoin funding paths and practice programs for Indian contributors.
// Each entry was checked against its official page on `checkedOn`; where the page renders in the
// browser (Summer of Bitcoin, OSPP, KWoC), the facts come from the program's own guide or blog and
// the description says so. Programs whose official page posts dates when a cycle opens are in
// watched-pages.ts instead (BOSS, Igalia, Redox, Season of KDE, GSSoC, Processing, NLnet, FOSS Hack).
// Not listed: Google Season of Docs (ended), X.Org EVoC (shut down), Road to Wiki and the
// Apache-ICFOSS pilot (no current official page found).

const OSS = ["Open source", "Remote"];

export const OSS_PROGRAMS: CuratedProgram[] = [
  // ---------- Paid mentorship programs ----------
  {
    externalId: "summer-of-bitcoin",
    url: "https://www.summerofbitcoin.org/",
    applyUrl: "https://www.summerofbitcoin.org/",
    ats: "curated",
    type: "internship",
    title: "Summer of Bitcoin",
    org: "Summer of Bitcoin",
    locations: ["Online"],
    remote: true,
    deadline: null, // 2026 applications closed 15 Feb 2026; the 2027 date isn't published yet
    comp: "PPP-adjusted stipend, up to about $6,600, paid in BTC",
    tags: [...OSS, "Bitcoin", "Paid", "University students", "Applications usually Jan to mid-Feb"],
    description:
      "A global, remote summer internship for university students to work on Bitcoin open-source projects with mentors. " +
      "In the 2026 cycle applications closed on 15 February, a challenge and bootcamp round ran 16 February to 20 March, proposals followed in March and April, and projects ran from about May to August. " +
      "The stipend is adjusted for purchasing power by your university's or residence country, up to about $6,600, and is paid in BTC (40% midway, 60% at the end). " +
      "Good preparation: the Chaincode BOSS Challenge, Chaincode's free seminars, and contributions to rust-bitcoin, BDK, LDK or Bitcoin Core review. " +
      "Only university students are eligible.",
    rules: rules({ studentsOnly: true, other: ["Only university students are eligible."] }),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "lfx-mentorship",
    url: "https://mentorship.lfx.linuxfoundation.org/",
    applyUrl: "https://mentorship.lfx.linuxfoundation.org/",
    ats: "curated",
    type: "internship",
    title: "LFX Mentorship (CNCF, Linux kernel, OpenSSF, Hyperledger and more)",
    org: "The Linux Foundation",
    locations: ["Online"],
    remote: true,
    deadline: null, // three terms a year; applications open about a month before each term
    comp: "PPP-based stipend by country of residence: $1,000 minimum, $6,600 maximum",
    tags: [...OSS, "Paid", "Cloud native", "Linux kernel", "Terms: Mar–May, Jun–Aug, Sep–Nov"],
    description:
      "LFX Mentorship pairs contributors with experienced project members across Linux Foundation projects such as CNCF/Kubernetes, the Linux kernel, OpenSSF, Hyperledger and LF Networking. " +
      "It runs three terms a year (spring Mar–May, summer Jun–Aug, fall Sep–Nov), and applications open about a month before each term. " +
      "Stipend amounts are calculated based on your location. We start with a base amount of 6,000 USD and then adjust it based on each country's PPP value. There is a minimum (1,000 USD) and maximum (6,600 USD) stipend amount. " +
      "Not every program is funded. You are 18 or older. You may have up to 3 applications at a time. You may only enter one Mentorship program in your career. " +
      "Do I need to be a student? No.",
    rules: rules({ minAge: 18, other: ["You may only enter one Mentorship program in your career."] }),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "c4gt-dmp",
    url: "https://www.codeforgovtech.in/",
    applyUrl: "https://www.codeforgovtech.in/",
    ats: "curated",
    type: "internship",
    title: "Code for Good Tech (C4GT) Dedicated Mentoring Program",
    org: "Raj Reddy Center for Technology and Society, IIIT Hyderabad",
    locations: ["India", "Online"],
    remote: true,
    deadline: null, // 2026 student applications opened in April
    comp: "Historically ₹1 lakh for 3 months (the current amount isn't published)",
    tags: [...OSS, "India", "Digital Public Goods", "Summer", "Applications usually April"],
    description:
      "A GSoC-style summer mentoring program on Digital Public Goods and tech-for-good projects. " +
      "C4GT program transitioned to the Raj Reddy Center for Technology and Society (RCTS) at IIIT Hyderabad in early 2026. " +
      "Student applications opened in April in the 2026 cycle. Pick an organisation such as openIMIS or the Sunbird projects, work on its listed issues, then apply.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "ethereum-protocol-fellowship",
    url: "https://epf.wiki/",
    applyUrl: "https://blog.ethereum.org/2026/04/30/epf-7",
    ats: "curated",
    type: "fellowship",
    title: "Ethereum Protocol Fellowship (EPF)",
    org: "Ethereum Foundation",
    locations: ["Online"],
    remote: true,
    deadline: null, // EPF7 applications closed 13 May 2026; the next cohort's date isn't published
    comp: "Monthly stipend for selected participants",
    tags: [...OSS, "Ethereum", "Protocol research", "Applications usually Apr–May"],
    description:
      "A five-month cohort (June to November) working on Ethereum clients and protocol research. " +
      "Applications for the seventh cohort (EPF7) were open until May 13, 2026. Select participants will be provided with a monthly stipend to focus on the program. " +
      "Standout unfunded participants have received retroactive stipends. Start with the EPF Protocol Studies material at epf.wiki.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "ospp",
    url: "https://summer-ospp.ac.cn/",
    applyUrl: "https://summer-ospp.ac.cn/",
    ats: "curated",
    type: "internship",
    title: "Open Source Promotion Plan (OSPP) Summer",
    org: "Institute of Software, Chinese Academy of Sciences (ISCAS)",
    locations: ["Online"],
    remote: true,
    deadline: null, // 2025 student applications ran 9 May to 9 June
    comp: "Paid; the amount depends on the project's difficulty",
    tags: [...OSS, "Paid", "Students", "Backup after GSoC", "Applications usually May–Jun"],
    description:
      "A GSoC-style summer program for enrolled students worldwide, run by ISCAS, with communities such as KDE, Rust, ONLYOFFICE and openEuler taking part. " +
      "In 2025 student applications ran 9 May to 9 June and coding ran July to September, which makes it a good backup if GSoC doesn't work out. " +
      "You must choose one of the listed projects; you can't propose your own. International students need a passport and proof of enrolment. " +
      "Applicants must be enrolled students aged 18 or over.",
    rules: rules({ studentsOnly: true, minAge: 18, other: ["Applicants must be enrolled students aged 18 or over."] }),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "rust-foundation-fellowship",
    url: "https://rustfoundation.org/",
    applyUrl: "https://rustfoundation.org/",
    ats: "curated",
    type: "fellowship",
    title: "Rust Foundation Fellowship",
    org: "Rust Foundation",
    locations: ["Online"],
    remote: true,
    deadline: null,
    comp: "Last round: $1,500 a month for 12 months, plus up to $4,000 for travel and equipment",
    tags: [...OSS, "Rust", "Currently closed"],
    description:
      "A 12-month fellowship for Rust contributors. The last round paid $1,500 a month plus up to $4,000 for travel and equipment. " +
      "It is currently closed; watch the Rust Foundation's site for the next round.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },

  // ---------- Bitcoin and open-source grants ----------
  {
    externalId: "btrust-developer-grants",
    url: "https://www.btrust.tech/",
    applyUrl: "https://www.btrust.tech/",
    ats: "curated",
    type: "grant",
    title: "Btrust Developer Grants (Starter Grant and Open Source Cohort)",
    org: "Btrust",
    locations: [],
    remote: true,
    deadline: null,
    comp: "Starter grant: full-time funding for six months",
    tags: ["Open source", "Bitcoin", "Grant", "Global Majority", "Quarterly grant rounds"],
    description:
      "Our mission is to support the Bitcoin open-source ecosystem in the Global Majority. Starting in Africa and expanding into regions including India and Latin America. " +
      "Starter grant: This grant supports software developers new to Bitcoin open-source contributions. It provides full-time funding for six months to help you focus on key projects and prepare a strong proposal for long-term support. " +
      "Experienced contributors can apply to the Open Source Cohort. Grants are announced quarterly; the usual route is the BOSS Challenge, then contributions, then a grant.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "opensats-grants",
    url: "https://opensats.org/apply",
    applyUrl: "https://opensats.org/apply",
    ats: "curated",
    type: "grant",
    title: "OpenSats grants for Bitcoin and nostr contributors",
    org: "OpenSats",
    locations: [],
    remote: true,
    deadline: null,
    comp: null,
    tags: ["Open source", "Bitcoin", "Grant", "Rolling"],
    description:
      "Grants for contributors to Bitcoin, nostr, and related free and open-source projects, such as Bitcoin Core contributions, security research, code review and design. " +
      "All our programs are open to applicants worldwide. Your project MUST HAVE a proper open-source license.",
    rules: rules({ other: ["Your project MUST HAVE a proper open-source license."] }),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "hrf-bitcoin-development-fund",
    url: "https://hrf.org/program/financial-freedom/bitcoin-development-fund/",
    applyUrl: "https://hrf.org/program/financial-freedom/bitcoin-development-fund/",
    ats: "curated",
    type: "grant",
    title: "HRF Bitcoin Development Fund",
    org: "Human Rights Foundation",
    locations: [],
    remote: true,
    deadline: null,
    comp: null,
    tags: ["Open source", "Bitcoin", "Grant", "Quarterly announcements"],
    description:
      "We support projects focused on enhancing the privacy, security, and decentralization of Bitcoin, as well as those focused on education, community-building, and promoting Bitcoin's use in repressive environments. " +
      "We publish a press release at the end of each quarter announcing new grantees.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "foss-united-grants",
    url: "https://fossunited.org/grants",
    applyUrl: "https://fossunited.org/grants",
    ats: "curated",
    type: "grant",
    title: "FOSS United project grants and fellowships",
    org: "FOSS United",
    locations: ["India"],
    remote: true,
    deadline: null,
    comp: "Recent project grants ₹5–8 lakh",
    tags: ["Open source", "India", "Grant", "Fellowship", "Rolling"],
    description:
      "The FOSS United grants program aims to provide financial support to FOSS creators, maintainers, projects and events all over India. To date, we have disbursed over INR 3 crores towards Indian FOSS projects and maintainers. " +
      "Fellowships: We provide grants to individuals contributing to FOSS projects and communities. These grants help developers, students, and community organizers dedicate time to FOSS work. " +
      "Apply once you have your own project or maintain one.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "numfocus-small-development-grants",
    url: "https://numfocus.org/programs/small-development-grants",
    applyUrl: "https://numfocus.org/programs/small-development-grants",
    ats: "curated",
    type: "grant",
    title: "NumFOCUS Small Development Grants",
    org: "NumFOCUS",
    locations: [],
    remote: true,
    deadline: null, // two rounds a year; the 2026 proposal deadlines were June 6 and Oct. 17
    comp: "Usually around USD 5,000 - 10,000 per proposal (Julia's figure)",
    tags: ["Open source", "Grant", "Scientific Python", "Julia", "Two rounds a year"],
    description:
      "The Small Development Grants program is a NumFOCUS microgrant program benefitting our Sponsored and Affiliated projects (NumPy, pandas, Julia, Jupyter and others). " +
      "Proposals go through the project you contribute to; the 2026 proposal submission deadlines were June 6 and Oct. 17. " +
      "Julia's program page says usually around USD 5,000 - 10,000 is available per proposal.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "summer-of-nix",
    url: "https://github.com/ngi-nix/summer-of-nix",
    applyUrl: "https://github.com/ngi-nix/summer-of-nix",
    ats: "curated",
    type: "internship",
    title: "Summer of Nix",
    org: "NixOS Foundation and NLnet (NGI)",
    locations: ["Online"],
    remote: true,
    deadline: null,
    comp: "Stipend in EUR, adjusted for purchasing power by country",
    tags: [...OSS, "Paid", "Nix", "Early career", "Northern-hemisphere summer"],
    description:
      "Summer of Nix is a coordinated effort to support selected free and open source software (FOSS) projects, by making them available on NixOS. " +
      "This northern-hemisphere-summer program is designed for students and early-career professionals. " +
      "Natural persons of legal age from anywhere in the world can apply. " +
      "For residents of other countries, stipends are adjusted according to purchasing power parity relative to the Netherlands.",
    rules: rules({ minAge: 18 }),
    checkedOn: "2026-11-02",
  },

  // ---------- Free practice programs ----------
  {
    externalId: "fossee-summer-fellowship",
    url: "https://fossee.in/fellowship",
    applyUrl: "https://fossee.in/fellowship",
    ats: "curated",
    type: "fellowship",
    title: "FOSSEE Summer Fellowship (IIT Bombay)",
    org: "FOSSEE, IIT Bombay",
    locations: ["Mumbai, India", "Online"],
    remote: true,
    deadline: null, // screening usually Feb–Apr
    comp: "No honorarium in 2026",
    tags: ["Open source", "India", "Students", "Screening task", "Unpaid"],
    description:
      "A summer fellowship at IIT Bombay's FOSSEE project (eSim, animation, graphics, Python and more), usually 15 May to 15 July. " +
      "Selection is through a screening task, usually February to April. There was no honorarium in 2026. Hostel accommodation is available if you are on campus.",
    rules: rules({ studentsOnly: true }),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "kwoc",
    url: "https://kwoc.kossiitkgp.org/",
    applyUrl: "https://kwoc.kossiitkgp.org/",
    ats: "curated",
    type: "competition",
    title: "Kharagpur Winter of Code (KWoC)",
    org: "KOSS, IIT Kharagpur",
    locations: ["Online"],
    remote: true,
    deadline: null, // usually a five-week program across December and January
    comp: null,
    tags: [...OSS, "India", "Beginner-friendly", "Usually Dec–Jan", "Unpaid"],
    description:
      "A five-week online winter program, usually across December and January, run by the Kharagpur Open Source Society at IIT Kharagpur. " +
      "A good first open-source program for beginners. No stipend; certificates and swag. Dates for the next season aren't announced yet.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "social-winter-of-code",
    url: "https://socialwinterofcode.devfolio.co/",
    applyUrl: "https://socialwinterofcode.devfolio.co/",
    ats: "curated",
    type: "competition",
    title: "Social Winter of Code / Social Summer of Code",
    org: "Social",
    locations: ["Online"],
    remote: true,
    deadline: null,
    comp: "Sponsor prizes ($550 in Season 5)",
    tags: [...OSS, "India", "Beginner-friendly", "Unpaid"],
    description:
      "Social Winter of Code is an open-source program envisioned by the Social. It aims to bring students into the world of open source development. " +
      "Season 5 ran Jan 1 - Mar 1, 2025; a Summer of Code season has run April to June. No newer season is confirmed yet.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },
  {
    externalId: "hacktoberfest",
    url: "https://hacktoberfest.com/",
    applyUrl: "https://hacktoberfest.com/",
    ats: "curated",
    type: "hackathon",
    title: "Hacktoberfest",
    org: "DigitalOcean and MLH",
    locations: ["Online"],
    remote: true,
    deadline: null,
    comp: "Swag",
    tags: [...OSS, "Every October", "Free"],
    description:
      "Hacktoberfest is a month-long celebration of open source throughout October. It's free, and it's for everyone. " +
      "Join one of the in-person Fests, take part online all month, or both. Pull requests no longer count toward rewards, but you can still earn t-shirts and stickers.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },

  // ---------- Hiring contests and student competitions ----------
  {
    externalId: "imagine-cup-2027",
    url: "https://imaginecup.microsoft.com/en-us",
    applyUrl: "https://imaginecup.microsoft.com/en-us",
    ats: "curated",
    type: "competition",
    title: "Microsoft Imagine Cup 2027",
    org: "Microsoft for Startups",
    locations: ["Online"],
    remote: true,
    deadline: null,
    comp: "Cash prize for winner",
    tags: ["Startup competition", "Student founders", "Applications open"],
    description:
      "Imagine Cup 2027 recognizes standout startups throughout the competition, from Category Winners and the Top 20 to the Top 3 Finalists and Imagine Cup Champion. " +
      "Student startup category: Turn an ambitious student-founded venture into a startup with real-world potential. Applications for Imagine Cup 2027 are open.",
    rules: rules({}),
    checkedOn: "2026-11-02",
  },
];
