# Hackathon build log

Meta Global AI Developer Hackathon · Indie track · submission due Wed Nov 4, 2026, 9:00 PM ET.
All code in this repository was written during the hackathon.

## Oct 27, 2026: day 1

**Research and plan** (see `PLAN.md`)
- Checked the Meta Model API: OpenAI-compatible at `api.meta.ai/v1`, Muse Spark 1.3 (PDF input, strict JSON schema, `web_search` grounding with `url_citation`), Muse Wonder 1.0 (computer use). No embeddings endpoint.
- Surveyed competitors: simplytk, Jobright, SimplifyJobs, QuantScraper, newsletters. The gap is cross-type discovery, eligibility *with evidence*, and applying with verified materials.
- Positioning: applicant-side and opportunity-first (hackathons, fellowships, research), so it is not the banned "AI Job Application Screener".

**Built**
- Next.js 16 app, Tailwind v4 design system ("Night radar, editorial calm"), dark and light themes.
- Data layer: Drizzle schema plus migrations. Embedded PGlite locally, postgres-js in production.
- 22 live connectors (Greenhouse ×9, Ashby ×4, Lever, SimplifyJobs ×2, Devpost, Hack Club, Unstop ×4), with change tracking and deactivation of stale listings.
- Agents: profile parser, rule extractor, web scout (only cited leads kept), eligibility judge, tailor, truthfulness verifier, and the Muse Wonder apply loop. Each one has a deterministic demo-mode fallback.
- Matching pipeline: triage → hard rules → judge → transparent weighted score.
- Screens: landing (live radar), onboarding, radar feed (keyboard), opportunity detail, Apply Studio, pipeline kanban, settings, dev outbox.
- Magic-link auth, signed single-use 72 h apply links, daily or weekly digest email.
- Apply: Playwright-driven browser, fill → pause → user approval → submit. A code-level guard blocks agent submit clicks, and anything unsupported falls back to a hand-off. Standalone worker plus Dockerfile.
- 120 tests: unit, embedded-Postgres integration, mock Meta API server, and real headless Chrome filling a local form. Lines coverage of `src/lib` is about 83%.

**Fixed during browser QA**
- The resume parser was rewritten to be section-aware. School and degree are now split, roles get their dates and bullets, and the headline comes from the summary.
- Stale role guesses from an earlier upload persisted into preferences. Fixed: guesses now follow the latest upload until onboarding finishes.
- The verifier read sentence-ending full stops as part of numbers ("2025."), which caused false "not in your resume" flags.
- Generic role words ("intern", "development") and split phrases ("learning" from "machine learning") were inflating fit scores. Phrases are now folded into single tokens and role filler is dropped.
- Hydration mismatches: radar blip rounding, plus locale and timezone timestamps (new `LocalTime` component).
- The Apply Studio approve button was unreachable on short screens because the sticky column had no height cap.
- The apply agent reported success after clicking submit even when nothing happened. Success now requires a confirmation message or a URL change.
- The resume temp file was deleted before the approved submit could upload it.
- Placeholder `<select>` options were counted as answered.

## Oct 28, 2026: day 2

- Two new hackathon sources: **MLH** (the season page's embedded event JSON, 63 upcoming events) and **Devfolio** (its public search API, 19 open or upcoming, with team size and women-only rules). Both are allowed by robots.txt. Now 24 connectors.
- Nine more sources, for 33 in all: **ETHGlobal** (hackathons and conferences), **Google Summer of Code** and **Outreachy** (seasonal: one listing while the round is open), **HN Who is hiring** (early-career posts only), **Remote OK** (technical, non-senior roles, linked back to Remote OK as its API terms require), Vercel, Perplexity and Notion job boards, and a **curated list** of six fellowships and grants (Thiel, Emergent Ventures, Z Fellows, PD Soros, Hertz, MLH Fellowship), with amounts and eligibility quoted from each official page. Jane Street was left out because its board disguises its job titles with lookalike Unicode letters.
- Researched further sources from a student's point of view and added 35 more, for 68 in all:
  - 15 Greenhouse and 8 Ashby boards that list 2027 internships or new-grad roles (Waymo, Coinbase, Point72, Neuralink, Cohere, Sierra and others), found by probing about 90 company boards.
  - A **Workday** connector (the public JSON behind myworkdayjobs.com) for NVIDIA, Adobe, Intel, Salesforce, Snap, Cisco, Boeing, Capital One and Mastercard, plus **Amazon**'s jobs search. Their searches are fuzzy, so only early-career titles are kept.
  - A second community list, vanshb03/Summer2027-Internships, with about 1,000 internships not on Simplify's list. Matching dedupes the overlap.
  - **HackerEarth** challenges.
  - Curated programs with deadlines in the next three months, each checked on its official page: YC Winter 2027 (Nov 2), a16z speedrun SR008 (Nov 1), the Science Ambassador Scholarship (Dec 14) and Goldwater (Jan 29).
  - Not added: Microsoft careers (no public endpoint), PayPal and Workday's own board (nothing early-career), and AI-safety fellowships whose cycles have closed.
- **Watch any website** (Settings): paste a URL, preview what it finds, then watch it. There's no LLM; the extractor reads schema.org JSON-LD (JobPosting, Event, EducationalOccupationalProgram), detects linked Greenhouse/Lever/Ashby boards, and falls back to RSS/Atom. Tested live on the Notion and Linear careers pages (found their job boards), lu.ma/sf (20 events) and the OpportunityDesk feed.
  - Safety: user URLs go through `safeFetch`, which allows only http(s) on default ports, refuses any host resolving to a private, loopback, link-local or metadata address, re-checks every redirect hop, caps the response at 3 MB, and honours robots.txt. Each user can watch up to 10 sites, with a 5-second throttle. Known gap: DNS rebinding between our lookup and fetch's.
  - Schema: `sources.url` and `sources.added_by` (cascades on account deletion; their listings are deactivated first). Migration `0001`.
- Source health in Settings: besides hard errors, it flags sources that returned nothing (how a scraper layout change usually shows up) and sources not checked for over 30 hours. Errors are shown inline instead of in a hover tooltip.
- India focus (most users are Indian students and early-career professionals), 17 more sources for 85:
  - **Unstop jobs**: about 840 open roles, mostly for freshers and professionals with 0–3 years' experience. Shows monthly pay when listed (247 of the first 291), work mode, and the city with country, so a user whose location is India gets the location boost. Unstop internships now get their stipend and city the same way.
  - 13 boards from companies hiring in India, found by probing about 150: Sarvam AI, Atlan, Groww, HighRadius, InMobi, Druva, CRED, Mindtickle and Zeta (mostly or all India-based roles), plus Zscaler, Okta, GitLab and Elastic, which have large India teams.
  - Three RSS feeds read by the website scraper: Scholarships in India, Freshersworld (fresher jobs; its titles carry an unfilled `#!job_role!#` template slot, now stripped) and Opportunities Corners.
  - Not added: Internshala, Naukri, foundit, Instahyre, Buddy4Study, the AICTE internship portal and the National Scholarship Portal. They either block bots or render listings in the browser, and none publishes a feed or schema.org data.
- Researched what an Indian student would look for, then added 7 sources for 92:
  - **Codeforces** (official API) and **CodeChef** contests, as competitions with the start time as the deadline, since contest ratings feed into placements and online assessments. LeetCode was left out because its robots.txt disallows `/graphql`.
  - A **SmartRecruiters** connector (the public Posting API, filtered to India) for Swiggy (207 roles), Bosch (500), ServiceNow (79), Freshworks (32) and Experian (33).
  - Curated Indian research programs, quoted from the official pages: the **Science Academies Summer Research Fellowship 2027** (IASc/INSA/NASI, closes 30 Nov 2026) and **NCRA-TIFR VSRP** (no date yet; it opens mid-January).
  - Researched but not added. Most Indian programs post dates only when a cycle opens, and aggregator sites disagree with each other. Chevening (closed 6 Oct), Reliance Foundation (closed 5 Oct) and Generation Google APAC (closed 31 Aug) have closed. JNCASR SRFP, TIFR, Inlaks, Summer of Bitcoin, Young India Fellowship, INSPIRE-SHE and DAAD WISE have no official 2027 date. Google STEP has no 2027 posting. Microsoft careers (403), LFX Mentorship (down for an upgrade) and Kaggle (needs a key) were unavailable.
- Built three things Indian students need:
  - **Academic eligibility.** Rules gained `minCgpa`, `minPercent`, `marksThroughout` (Class 10, 12 and degree), `maxBacklogs` and `branches`. A no-LLM parser reads Indian drive wording ("2026 & 2027 batch", "60% throughout in 10th, 12th and graduation", "no active backlogs", "B.E/B.Tech (CSE, IT, ECE)", "circuit branches"). The rule checker compares those with the profile. CGPA and percentage are converted only when the CBSE (×9.5) and AICTE ((CGPA − 0.75) × 10) formulas agree; otherwise the result is "unknown". Onboarding has a new Academics block (degree marks, branch, Class 12 and 10 marks, active backlogs). The offline resume parser reads Indian marks and Class 10/12 lines, and a bug that turned "Electronics" into "Computer Science" is fixed. Prompts are bumped to V2, and rules stored before these fields existed read as "no restriction".
  - **Opens-soon watch** (`page_watches`, migration `0002`). Nine official pages are checked daily: TIFR Maths VSRP, IIT Kanpur SURGE, S.N. Bose Scholars, Inlaks, JN Tata Endowment, KC Mahindra, Chevening, Smart India Hackathon and TCS iON NQT. Only lines about dates and applications are hashed; "last updated" stamps, copyright lines and menus are ignored. All nine hashed identically across two fetches. On a change, the listing shows what's new and gets a "Page updated" tag, and everyone it matched (new or saved) gets it back in their digest, with the new line as the reason. A page that comes back empty keeps its baseline and reports an error, instead of firing a false change.
  - **Off-campus drives.** Accenture India fresher roles (111 "New Associate" roles) come through its Workday board, filtered by country. Workday boards now support custom searches, title tests and country facets. TCS NQT is on the page watch. TCS and Infosys careers (Akamai blocks bots), Cognizant (bot challenge), HCLTech TechBee (403) and Wipro's job feed (its robots.txt disallows it) aren't reachable; they need the web scout.

- Second research pass (fake internships, government schemes, fresher hiring surveys), then built everything from it except a Telegram bot:
  - **Scam check.** Jobs and internships that ask applicants for money (registration, training or joining fees, refundable deposits, "pay ₹…", UPI handles) get an "Asks for money" tag at ingest, are judged ineligible without a model call, stay out of the digest, and show a warning with the quoted sentence and the 1930 helpline. Negations ("no registration fee", "charges: nil") are skipped. Across all 12,315 active listings and 90 live Unstop jobs it flagged none, so no false positives on real data.
  - **Experience vs "fresher".** Rules gained `minExperienceYears` and `experiencePreferred`. Only full-time work counts toward the student's years. A "fresher" title that asks for years is called out by name, "preferred" experience reads as unknown, and fresher-friendly roles get a +0.1 fit boost for students. Fixed one false positive found on real data ("2 years of university education").
  - **GATE.** Rules gained `gateRequired` and `gateYear` ("through GATE 2027"), and the profile has `gateScore` and `gateYear` (onboarding fields, plus the resume prompt, now V3). A score from another year is unmet.
  - **Government and exam pages** on the opens-soon watch: PM Internship Scheme, NATS 2.0, POWERGRID and NPCIL (Engineer/Executive Trainees through GATE 2027), ISRO careers and GATE 2027 (new `exam` type). Busy notice boards take a `focus` pattern, so unrelated notices don't flag a change. All six hashed identically across two fetches. Not reachable: CAT (500), UPSC (403), AAI (robots.txt), NTPC, BEL and DRDO.
  - **Calendar.** A private iCalendar feed (signed one-year token, RFC 5545 folding and escaping, a one-day reminder) of saved and in-progress deadlines, with Google and Apple/Outlook buttons in Settings, and "Add to calendar" on each opportunity.
  - **Pay comparison.** Rupee pay is normalised to a monthly figure (ranges, LPA, per year, "25k"; unlabelled amounts over ₹1.5 lakh count as annual) and placed among open listings of the same type. All 70 of 70 live Unstop salaries parsed.
  - **Referral helper.** Alumni and company search links, plus a drafted connection note (≤300 characters) and follow-up message. The `referral` agent has a no-LLM fallback that uses only profile facts.
  - **Hindi digest.** A language preference translates the email's own copy; listings stay as written.
  - 286 tests pass, the typecheck and lint are clean, and `next build` passes.

## Next
- Live run with a `MODEL_API_KEY` and tuning of the prompts against real listings.
- Deploy (Vercel + Neon + Railway worker + Resend domain).
- Record the 3-minute demo video.
