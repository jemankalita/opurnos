# Research-internship, government and scholarship programs for 1st and 2nd year undergraduates in India (and abroad, open to Indians)

Research date: 2026-11-06. Conventions used in every record:

- `years` uses the requested values. One extra value is added where honest: **3rd+ (outside target)**, for programs a 1st or 2nd year student cannot use.
- `status` uses the requested values. "expected" means the 2026-27 window is over or not yet open and a next cycle is likely.
- `next window` is always a PROJECTION from past dates, never an announced date, unless marked "announced".
- `null` means no reliable source was found.
- `bot` is from a direct HTTP probe run on 2026-11-06 (curl with a plain UA and with a browser UA, plus WebFetch). "SSR" means the rule or date text is in the raw HTML. "JS" means the raw HTML is a stub.
- Source tier: official pages were preferred. Aggregators (Buddy4Study, Careers360, Internshala, Biotecnika, talentd, indiascholarships.in) are marked as such, and low-grade ones are treated as leads only.

## Objective: verified per-program record

### Takeaway
70 records follow. Official text was reached for about half. Records resting on aggregators carry medium or low confidence. The largest verified surprises: INSPIRE-SHE has had no call since the 2024 batch, Tata Trusts' Medical and Healthcare Scholarship no longer takes submissions, PM Internship is closed to current full-time 1st and 2nd years, and Mitacs now excludes IIT students and non-engineers from India.

### Cited Findings

#### A. DST INSPIRE family

**1. INSPIRE Scholarship for Higher Education (SHE)**
- org: DST, Govt of India | category: scholarship | region: India
- years: 1st only (entry point; see quote in the first-year section)
- restriction: natural and basic sciences only (BSc, BS, Int. MSc/MS); top 1% of Class XII board or JEE/NEET rank within the top 10,000; age 17-22; engineering and most medicine excluded — [Careers360](https://school.careers360.com/articles/inspire-scholarship)
- status 2026-27: **paused or discontinued** (DST: paused for redesign, "not scrapped"). No 2025 or 2026 call issued. No timeline — [Careers360, 16 Jul 2026](https://news.careers360.com/dst-clarifies-inspire-she-scholarship-not-scrapped-scheme-redesign-delay-2025-notification); [ThePrint, 13 Aug 2026](https://theprint.in/feature/inspire-she-scholarship-scheme-redesign-discontinued-clarifies-govt/3014118/)
- last known open/close: null. Last batch awarded was 2024 — [Careers360](https://news.careers360.com/dst-inspire-she-scholarship-scrap-no-list-budget-bsc-bs-ms-only-basic-science-scheme-iiser-pune-iacs-kolkata-iisc-bangalore-kvpy). The portal still lists only 2024-batch housekeeping (e.g. a passbook upload due 15.11.2026) — [INSPIRE portal](https://online-inspire.gov.in/)
- next window: null (no basis for a projection)
- amount: Rs 80,000/yr = Rs 60,000 scholarship + Rs 20,000 mentorship grant — [Careers360](https://school.careers360.com/articles/inspire-scholarship); Rs 20,000 grant confirmed in [DST post-offer guidelines](https://online-inspire.gov.in/Content/SHEPostofferImplementationGuidelines2024.pdf)
- official: https://online-inspire.gov.in/ | bot: SSR, but WebFetch failed with a certificate-chain error; plain curl worked | confidence: high on status, medium on eligibility detail

**2. INSPIRE Internship (science camps)**
- org: DST | category: community | years: **not undergraduate** (Class XI only) | region: India
- restriction: top 1% of Class X board, studying science in Class XI; 5-day residential camp — [DST guidelines listing](https://online-inspire.gov.in/Content/GuideLine/Guidelinesinternship24112023.pdf)
- status 2026-27: unclear | last known dates: null | next window: null | amount: organiser-funded, up to Rs 6,500 per student reported by a low-grade listing
- official: https://online-inspire.gov.in/ | bot: SSR | confidence: medium. Include only to stop false matches: it is NOT a college internship.

**3. INSPIRE-SHE Mentorship Grant**
- org: DST | category: research | years: existing SHE scholars only, so effectively closed to new entrants | region: India, abroad allowed
- status: paused or discontinued for new entrants (depends on item 1) | amount: Rs 20,000 per annum — [DST guidelines](https://online-inspire.gov.in/Content/SHEPostofferImplementationGuidelines2024.pdf)
- dates: null | bot: PDF fetchable | confidence: high

#### B. Science academies, IISc, TIFR, JNCASR, HBCSE

**4. IASc-INSA-NASI Summer Research Fellowship (SRFP)**
- org: Indian Academy of Sciences, INSA, NASI | category: fellowship | region: India
- years: **2nd only for BSc; 2nd and 3rd for BE/BTech/BCA. No 1st year.** Full list in the minimum-year section — [official instructions](https://webjapps.ias.ac.in/fellowship2027/application_instructions.jsp)
- restriction: 65%+ average in core subjects from Class X onward; a teacher's email is required — [official instructions](https://webjapps.ias.ac.in/fellowship2027/application_instructions.jsp)
- status 2026-27: **open now** (2027 cycle, closes 30 Nov 2026) — [official 2027 page](https://webjapps.ias.ac.in/fellowship2027/)
- last known close: 30 Nov 2026 (2027 cycle); 31 Jan 2026 (2026 cycle) — [official 2026 page](https://webjapps.ias.ac.in/fellowship2026/); 30 Nov 2024, as an extended date (2025 cycle) — [official 2025 page](https://webjapps.ias.ac.in/fellowship2025/). Open dates: null; the 2026 notice was dated 20 Nov 2025.
- next window: PROJECTION Oct-Nov 2027 opening, close between 30 Nov 2027 and 31 Jan 2028
- amount: monthly fellowship plus round-trip train fare; figure not stated officially (null). Duration two months.
- official: https://webjapps.ias.ac.in/fellowship2027/ | bot: SSR on webjapps; ias.ac.in returns 403 to plain UA and 200 to browser UA | confidence: high

**5. IISc summer routes**
- org: IISc | category: research | region: India
- years: unclear. No central undergraduate program for external students was found. The usual route is item 4.
- Chemistry fellowship: 2nd year BSc (3-yr) or 2nd-4th year Int. MSc, Chemistry students — [IISc page, via search snippet](https://ipc.iisc.ac.in/summer_fellowships.php). Page returned 502 when fetched, so this was not read in full.
- Lab-level calls exist, e.g. Quantum Nanoelectronics, deadline 28 Feb 2026 — [Karmasandhan](https://www.karmasandhan.com/iisc-bangalore-summer-undergraduate-research-internship-2026/)
- status: expected (lab-level, irregular) | next window: PROJECTION Jan-Mar 2027 for lab calls | amount: null
- bot: ipc.iisc.ac.in returned 502 | confidence: low

**6. TIFR School of Mathematics VSRP**
- org: TIFR Mumbai | category: research | years: any year on paper | region: India
- restriction: mathematics. "Exceptionally good and motivated students from BSc/BTech are also accepted", Masters preferred — [official](https://mathweb.tifr.res.in/vsrp.html)
- status: expected | last known: opened 6 Feb 2026, closed 6 Mar 2026; ran 18 May-18 Jun 2026 — [official](https://mathweb.tifr.res.in/vsrp.html)
- next window: PROJECTION Feb-Mar 2027 | amount: null
- bot: SSR | confidence: high on dates, medium on real access for 1st and 2nd years

**7. NCRA-TIFR VSRP (Pune)**
- org: NCRA-TIFR | category: research | years: 3rd+ (outside target)
- restriction: 2026 edition was limited to students finishing an MSc, Int. MSc, 4-yr BSc or BE/BTech in 2027 — [official FAQ, via search snippet](https://vsrp.ncra.tifr.res.in/VSRP2026/faqs)
- status: expected | last known: ran 11 May-10 Jul 2026; deadline null (an aggregator's 31 Oct 2026 is not confirmed) | next window: null | amount: null
- bot: the 2026 URL returned 404 on probe | confidence: medium

**8. JNCASR Summer Research Fellowship (SRFP)**
- org: JNCASR Bengaluru | category: fellowship | years: unclear (year rule not read from an official page) | region: India
- restriction: BSc, BTech, BS, MSc and similar; 65% in Class X and XII; Indian citizen — [Buddy4Study](https://www.buddy4study.com/scholarship/jncasr-summer-research-fellowship-programme-2026)
- status: expected | last known close: 31 Jan 2026 — [JNCASR, via search snippet](https://www.jncasr.ac.in/fandeprogrammes). Third-party dates of 15 May and 30 Jun 2026 contradict the official page and should be ignored.
- next window: PROJECTION Dec 2026-Jan 2027 | amount: Rs 10,000/month plus travel; Rs 500 fee reported — [Buddy4Study](https://www.buddy4study.com/scholarship/jncasr-summer-research-fellowship-programme-2026)
- bot: unreliable (WebFetch timeout, curl 502 on probe) | confidence: medium

**9. JNCASR POCE (Project Oriented Chemical Education)**
- org: JNCASR | category: research | years: **1st only** | region: India
- restriction: chemistry; 3-yr or 4-yr BSc only; 5-yr BS-MS (e.g. IISER) excluded — [thefellowships.in](https://thefellowships.in/?p=712) (secondary)
- status: expected | last known: opened 6 Jan 2026 (secondary), closed 28 Feb 2026 — [JNCASR, via search snippet](https://www.jncasr.ac.in/fandeprogrammes)
- next window: PROJECTION Jan-Feb 2027 | amount: Rs 10,000/month for 6-8 weeks each summer plus sleeper train fare (secondary)
- bot: unreliable | confidence: medium-high

**10. JNCASR POBE (Project Oriented Biological Education)**
- org: JNCASR | category: research | years: 1st only (reported jointly with POCE, not separately confirmed) | restriction: biology, BSc
- status: expected | last known: same joint listing, 6 Jan-28 Feb 2026 — [thefellowships.in](https://thefellowships.in/?p=712) | next window: PROJECTION Jan-Feb 2027 | amount: as POCE
- confidence: medium-low

**11. JNCASR North-East Summer Research Fellowship**
- org: JNCASR | category: fellowship | years: unclear | region: North-East India
- status: expected | last known close: 20 Jun 2026 — [JNCASR, via search snippet](https://www.jncasr.ac.in/fandeprogrammes) | next window: PROJECTION May-Jun 2027 | amount: null | confidence: low

**12. HBCSE NIUS Physics**
- org: HBCSE-TIFR | category: research (camp plus guided project) | years: **1st only**
- restriction: BSc/BS with Physics, BTech in Physics fields, BS-MS/Int. MSc, or engineering dual degree; 60% in Class X and XII — [official](https://nius.hbcse.tifr.res.in/?p=5094)
- status: expected | last known close: 8 Mar 2026, 23:59 IST (revised from 5 Mar); referee reports 10 Mar; camp 15-29 Jun 2026 — [official](https://nius.hbcse.tifr.res.in/?p=5094)
- next window: PROJECTION Feb-Mar 2027 | amount: travel reimbursed, stay and meals provided
- official: https://nius.hbcse.tifr.res.in/ | bot: SSR (WordPress) | confidence: high

**13. HBCSE NIUS Astronomy**
- org: HBCSE-TIFR | category: research | years: **1st only**
- restriction: BSc with Physics, BTech Physics fields, BS-MS, or any engineering branch; 60% in Class X and XII; strong interest in a physics major — [official](https://nius.hbcse.tifr.res.in/?p=5098)
- status: expected | last known close: 8 Mar 2026; camp 17-28 Jul 2026 — [official](https://nius.hbcse.tifr.res.in/?p=5098)
- next window: PROJECTION Feb-Mar 2027 | amount: travel reimbursed, stay and meals provided | bot: SSR | confidence: high

**14. HBCSE NIUS Biology**
- org: HBCSE-TIFR | category: research | years: **1st only** | restriction: any Biology stream (BSc, Int. MSc); 60% in Class X and XII — [official](https://nius.hbcse.tifr.res.in/announcements/nius-biology-2026/)
- status: expected | last known: posted 20 Aug 2026, closed 3 Oct 2026, list 30 Oct 2026, camp 1-10 Dec 2026 — [official](https://nius.hbcse.tifr.res.in/announcements/nius-biology-2026/)
- next window: PROJECTION Aug-Oct 2027 | amount: not stated on the 2026 page | bot: SSR | confidence: high

**15. HBCSE NIUS Chemistry**
- org: HBCSE-TIFR | category: research | years: **2nd only** | restriction: 70% or equivalent in first-year UG — [official, via search snippet](https://nius.hbcse.tifr.res.in/announcements/nius-chemistry-2026/)
- status: expected | last known close: 30 Sep 2026 (list 23 Oct; camp 21-30 Dec 2026); 17 Oct 2025 for the prior cycle — [official 2025](https://nius.hbcse.tifr.res.in/?p=5059)
- next window: PROJECTION Aug-Oct 2027 | amount: null
- bot: this URL returned 404 to direct fetch despite being indexed | confidence: medium-high

#### C. IIT programs

**16. SURGE, IIT Kanpur**
- org: IIT Kanpur | category: research | region: India, Nepal, Bhutan
- years: **2nd only for external BSc/BA ("Pursuing III/IV Sem"); external BTech is 3rd year ("Pursuing V/VI Sem"). IITK's own BTech: 2nd or 3rd year** — [official](https://surge.iitk.ac.in/node/5)
- restriction: CPI 6.0 for external students, 5.5 for IITK — [official](https://surge.iitk.ac.in/node/5)
- status: expected | last known: 2 Feb-22 Feb 2026; ran 11 May-10 Jul 2026; administrative fee applied — [official](https://surge.iitk.ac.in/)
- next window: PROJECTION Feb 2027 | amount: up to Rs 16,000 reported by an aggregator; official funding page not parsed | bot: SSR | confidence: high

**17. SRIP, IIT Gandhinagar**
- org: IIT Gandhinagar | category: research | years: unclear, no year bar found ("currently pursuing a Bachelor's or Master's degree") — [Karmasandhan](https://www.karmasandhan.com/iit-gandhinagar-srip-2026/)
- status: expected | last known: 16 Feb-5 Mar 2026; ran 7 May-16 Jul 2026 (secondary, consistent across sources)
- next window: PROJECTION Feb-Mar 2027 | amount: Rs 2,000/week up to 8 weeks; Rs 50,000 award for top interns
- official: https://srip.iitgn.ac.in/ | bot: **blocked** (403 to plain UA, 1.2 KB JS stub to browser UA) | confidence: medium

**18. IIT Madras Summer Fellowship Programme (SFP)**
- org: IIT Madras | category: fellowship | years: 3rd+ (outside target); third year engineering, or 3rd-4th year integrated/dual; IIT students excluded — [Careers360](https://news.careers360.com/iit-madras-introduces-summer-fellowship-2026-offers-rs-15-thousand-stipend-2-months-internship-apply-march-3-dates)
- status: expected | last known: 2 Feb-2 Mar 2026; ran 18 May-17 Jul 2026 | next window: PROJECTION Feb-Mar 2027 | amount: Rs 15,000/month
- official: https://ssp.iitm.ac.in/ | bot: 403 to plain UA, 200 to browser UA | confidence: medium-high

**19. IIT Delhi Summer Research Fellowship (SRFP)**
- org: IIT Delhi | category: fellowship | years: 3rd+ (outside target) in practice
- restriction: "has completed at atleast 2 years of study towards an engineering degree and is amongst top ten positions in her/his respective programme"; IIT students excluded — [official 2025 notification](https://home.iitd.ac.in/public/storage/uploads/SRFP%202025%20Notification_1740483333_05Mar25_1741157534.pdf)
- status: expected | last known: 27 Feb-20 Mar 2025 (official); closed 3 Apr 2026, ran 13 May-13 Jul 2026 — [CareerIndia](https://www.careerindia.com/news/iit-delhi-srfp-2026-apply-for-summer-research-fellowship-057621.html)
- next window: PROJECTION Feb-Apr 2027 | amount: Rs 500/week in 2025 (official); Rs 2,000/week reported for 2026 (secondary), plus travel, boarding and lodging
- bot: PDF needs text extraction | confidence: high on 2025, medium on 2026

**20. FOSSEE Summer Fellowship, IIT Bombay**
- org: IIT Bombay | category: internship | years: unclear (no official year rule read) | restriction: screening task per project, open-source tools
- status: expected | last known close: 13 Apr 2026 (aggregator) — [talentd](https://www.talentd.in/articles/fossee-summer-fellowship-2026-iit-bombay); results page updated 8 Jun
- next window: PROJECTION Feb-Apr 2027 | amount: reported as no honorarium on the official site — [FOSSEE, via search snippet](https://cfd.fossee.in/fellowship2026)
- official: https://fossee.in/ | bot: SSR, but the 2026 pages list fellows, not rules | confidence: medium-low. No central IIT Bombay external UG program was found.

**21. SPARK, IIT Roorkee**
- org: IIT Roorkee | category: research | years: 1st and 2nd on paper (see caveat)
- restriction: BArch, BE/BTech, BS-MS, MSc; at least two semesters done before summer and one left after; CGPA 7.5 (IIT/IISc), 8.0 (NIT/IISER), 8.5 (others) — [talentd](https://www.talentd.in/articles/iit-roorkee-spark-internship-2026-eligibility-stipend-dates) (aggregator; official notice not read)
- status: expected | last known close: 8 Mar 2026, 23:59 | next window: PROJECTION Feb-Mar 2027 | amount: Rs 3,000/week
- official: https://spark.iitr.ac.in/ | bot: JS | confidence: medium

**22. SURE, IIT Hyderabad**
- org: IIT Hyderabad | category: research | years: **2nd year BTech/BDes qualifies** (also 3rd; 3rd-4th integrated)
- restriction: top 20% of class, certified by head of institution; 100 of 250 seats for women — [Careers360](https://news.careers360.com/iit-hyderabad-sure-internship-2026-apply-march-10-dates-fellowship-selection-eligibility-250-seats-women-iith-ac-in)
- status: expected | last known close: 10 Mar 2026; results 14 Apr; start 15 May | next window: PROJECTION Feb-Mar 2027 | amount: Rs 15,000 for two months or Rs 10,000 for 1.5 months | confidence: medium-high

**23. SRIP, IIT (ISM) Dhanbad**
- org: IIT (ISM) Dhanbad | category: research | years: any year on paper; "gives preference to Pre-Final year students" — [official](https://people.iitism.ac.in/~research/SRIP.php)
- restriction: CGPA 7.5 (IIT/IISc), 8.0 (NIT/IISER), 8.5 (others); no backlogs
- status: unclear | dates: null | next window: null | amount: Rs 10,000 for 8 weeks if funded; self-funded track exists | bot: SSR | confidence: medium

**24. IIT Mandi Summer Internship**
- org: IIT Mandi | category: internship | years: 3rd+ (outside target), "Pre-Final year of B.Tech. / B.E. students and PG Students" — [Careers360](https://news.careers360.com/iit-mandi-opens-summer-internship-2026-application-for-ug-pg-students-monthly-stipend-of-rs-10-thousand-eligibility)
- status: expected | dates: null | amount: Rs 10,000/month | confidence: medium. Note: a 3-yr degree's pre-final year is 2nd year, but BTech/BE is what is named.

#### D. Government labs and national portals

**25. ISRO Internship Scheme**
- org: DoS/ISRO | category: internship | years: any year on paper | region: India (citizens)
- restriction: "UG/ PG/ PhD students ... in the disciplines of Science/Technology"; 60% or CGPA 6.32; max 45 days; each centre runs its own intake — [official](https://www.isro.gov.in/InternshipAndProjects.html)
- status: open now in the sense of rolling per-centre intake, unverified per centre | last known: IIRS closed 31 Mar 2026 — [Biotecnika](https://www.biotecnika.org/2026/03/life-sciences-external-student-internship-at-isro-iirs); another listing says 1 Aug-31 Oct annually, which conflicts
- next window: null (centre-specific) | amount: **none**. "shall not be eligible for any stipend/ remuneration/ financial assistance" — [official](https://www.isro.gov.in/InternshipAndProjects.html)
- bot: SSR | confidence: high on rules, low on live windows

**26. ISRO Student Project Trainee Scheme**
- org: DoS/ISRO | category: research | years: 3rd+ (outside target): BE/BTech "completed 6th semester"; BSc "Only final-year students" — [official](https://www.isro.gov.in/InternshipAndProjects.html)
- status: rolling | dates: null | amount: none | confidence: high

**27. DRDO lab internships**
- org: DRDO labs | category: internship | years: 3rd+ (outside target). Lab notices say final year, e.g. "in final year only" — [DLRL notice](https://www.drdo.gov.in/drdo/sites/default/files/career-vacancy-documents/advtDLRL01072025.pdf); [RCI notice](https://drdo.gov.in/drdo/sites/default/files/career-vacancy-documents/AdvtRCI27062025.pdf)
- status: expected, lab by lab | last known: many closed May-Jul 2026 | next window: PROJECTION May-Jul 2027 | amount: Rs 5,000/month in some labs, Rs 30,000 lump sum in others (secondary) | bot: PDFs fetchable, landing page thin | confidence: medium

**28. BARC summer training**
- org: BARC | category: internship | years: unclear; an aggregator says 3rd/4th year UG or PG
- status: unclear. No official 2026 notice found; aggregators give 15 May 2026 — [govtinternship.com](https://govtinternship.com/barc-summer-internship/) (low grade)
- next window: null | amount: null | confidence: low

**29. CSIR-SRTP and CSIR lab training**
- org: CSIR | category: internship | years: unclear
- status: paused or discontinued as a national scheme is plausible, but unconfirmed. The only SRTP evidence is from 2020 — [NEIST brochure](https://www.neist.res.in/srtp2020/brochure.pdf). Lab-level program exists: CCMB Summer Training 2026 — [CCMB](https://ccmb.res.in/?p=4713)
- dates: null | amount: null | confidence: low

**30. AICTE Internship Portal**
- org: AICTE | category: internship | years: any year on paper; first years can register, "most companies prefer students from the second year onwards" — [Internshala](https://internshala.com/blog/aicte-internship/)
- status: open now (rolling listings; no single window). Example: Cisco-AICTE virtual internship took 1st-3rd year students, last date 20 May 2026 — [freshershunt](https://freshershunt.in/?p=52669) (low grade)
- next window: rolling | amount: varies
- official: https://internship.aicte-india.org/ | bot: **JS only** (558 KB of scripts, no text) | confidence: medium-low

**31. PM Internship Scheme**
- org: Ministry of Corporate Affairs | category: internship | years: **3rd+ (outside target)**
- restriction: "Candidates currently enrolled in full-time education are not eligible"; age 21-24; no family member above Rs 8 lakh — [Primebook guide](https://www.primebook.in/blog/pm-internship-scheme-2026-eligibility-stipend-and-application-walkthrough). April 2026 change admitted only final-year UG and PG students — [Angel One](https://www.angelone.in/news/government-schemes/pm-internship-scheme-mca-expands-scheme-to-final-year-students)
- status: unclear for full rollout. Third pilot ran from Apr 2026 to Dec 2026, with full rollout reportedly next year — [ThePrint](https://theprint.in/economy/pm-internship-scheme-sees-stronger-response-in-third-pilot-round/3018530/)
- amount: conflict. Rs 5,000/month plus Rs 6,000 one-time ([Primebook](https://www.primebook.in/blog/pm-internship-scheme-2026-eligibility-stipend-and-application-walkthrough)) vs Rs 9,000 ([ThePrint](https://theprint.in/india/after-tepid-response-govt-to-revamp-pm-internship-scheme-with-higher-rs-9000-stipend-wider-age-limit/2877794))
- official: https://pminternship.mca.gov.in/ | bot: JS-heavy, WebFetch saw only the title | confidence: medium-high that 1st and 2nd years are excluded

#### E. National Scholarship Portal schemes

**32. PM-USP Central Sector Scheme (CSSS)**
- org: Ministry of Education | category: scholarship | years: 1st only for fresh entry (inferred, not stated by the source; see the first-year section); renewal thereafter
- restriction: above 80 per cent in Class 12 (as worded by Careers360), family income up to Rs 4.5 lakh, regular course, drop-year students generally ineligible — [Careers360](https://school.careers360.com/articles/pm-usp-scholarship-2026)
- status 2026-27: **unclear for fresh**. Official NSP home page shows only renewals: student 31-10-2026, institute 15-11-2026, L2 30-11-2026 — [NSP](https://scholarships.gov.in/). Careers360 lists fresh dates as "To be announced".
- last known: 2025-26 extended to 15 Dec 2025 — [Bihar board notice](https://secondary.biharboardonline.com/Adv.html); [Babushahi](https://babushahi.com/view-news.php?id=213753)
- next window: PROJECTION fresh window may still open in late 2026; check NSP weekly | amount: Rs 12,000/yr (yrs 1-3), Rs 20,000/yr (yr 4-5, PG)
- official: https://scholarships.gov.in/ | bot: SSR notices, but plain TLS failed (needs a relaxed client or full chain) | confidence: high on renewal dates, medium on fresh

**33. AICTE Pragati (girls)**
- org: AICTE | category: scholarship | years: 1st only (or 2nd by lateral entry)
- restriction: women, AICTE-approved technical degree/diploma, income up to Rs 8 lakh, max two girls per family — [Buddy4Study](https://www.buddy4study.com/article/aicte-scholarships)
- status: expected (student window ended 31 Oct 2026; institute verification to 15 Nov, DNO/SNO/MNO to 30 Nov) — [Thapar notice](https://www.thapar.edu/upload/files/NOTICE-AICTE%20PRAGATI,%20SAKSHAM%20&%20SWANATH%20%202026-27.pdf); [Buddy4Study](https://www.buddy4study.com/article/aicte-scholarships)
- last known close: 31 Oct 2026; 31 Oct 2025 — [Collegesimplified](https://www.collegesimplified.in/post/nsp-scholarship-last-date-2025-26-category-wise-updates)
- next window: PROJECTION Jun-Oct 2027 (NSP opened 1 Jun for AY 2026-27) | amount: Rs 50,000/yr | confidence: medium-high. An extension is possible; none found.

**34. AICTE Saksham (specially abled)**
- org: AICTE | category: scholarship | years: 1st only (or 2nd by lateral entry) | restriction: 40%+ disability, income up to Rs 8 lakh, UDID consent needed on NSP — [Buddy4Study](https://www.buddy4study.com/article/aicte-scholarships); [NSP](https://scholarships.gov.in/)
- status, dates, next window: same as item 33 | amount: Rs 50,000/yr | confidence: medium-high

**35. AICTE Swanath**
- org: AICTE | category: scholarship | years: any year (1st-4th) | restriction: orphans, COVID-bereaved, wards of martyrs; income up to Rs 8 lakh — [Buddy4Study](https://www.buddy4study.com/article/aicte-scholarships)
- status, dates, next window: same as item 33 | amount: Rs 50,000/yr | confidence: medium

**36. UGC Ishan Uday (North East)**
- org: UGC | category: scholarship | years: 1st only | restriction: "first-year undergraduates with Northeast domicile proof" — [CareerIndia](https://www.careerindia.com/news/nsp-scholarship-2026-apply-for-ugc-pg-and-ishan-uday-schemes-guide-011-65745.html)
- status: expected | last known: 16 Sep-31 Oct 2026; institute verification 15 Nov | next window: PROJECTION Sep-Oct 2027 | amount: null | confidence: medium

**37. PM Special Scholarship Scheme (PMSSS), J&K and Ladakh**
- org: AICTE | category: scholarship | years: unclear (admission-linked; not confirmed) | region: J&K, Ladakh
- status: unclear | last known: portal opened 16 Jul 2026 — [Kashmir Life](https://kashmirlife.net/pmsss-admissions-begin-as-aicte-opens-registration-for-jk-students-443444/); prior close 15 Dec 2025 (aggregator)
- next window: PROJECTION Jul-Dec 2027 | amount: null | confidence: low

**38. PM Scholarship Scheme (KSB, wards of ex-servicemen)**
- org: Kendriya Sainik Board | category: scholarship | years: unclear | restriction: wards of ex-servicemen
- status: unclear. 31 Dec 2026 reported by one aggregator, 31 Oct 2026 by others; neither is official | amount: null | confidence: low

#### F. Private and CSR scholarships

**39. Reliance Foundation Undergraduate Scholarship**
- org: Reliance Foundation | category: scholarship | years: **1st only** | region: India
- restriction: first year of a full-time degree, any stream; 60% in Class 12; income under Rs 15 lakh, preference under Rs 2.5 lakh; aptitude test — [Careers360](https://school.careers360.com/articles/reliance-foundation-scholarship-2026-27); [media release](https://www.reliancefoundation.org/sites/default/files/2026-08/14082026%20-%20MR%20-%20Reliance%20Foundation%E2%80%99s%20prestigious%20Scholarships%20open%20for%20applications%201.pdf)
- status: expected (2026-27 concluded) | last known: 14 Aug-5 Oct 2026; 2025-26 closed 4 Oct 2025 officially, with 7 Oct 2025 on other sites — [RF release](https://www.reliancefoundation.org/media/media-release/Reliance-Foundation-Scholarships-2025-26). indiascholarships' 15 Oct 2026 is an outlier.
- next window: PROJECTION mid-Aug to early Oct 2027 | amount: up to Rs 2 lakh over the degree; 5,000 awards
- official: https://scholarships.reliancefoundation.org/ | bot: portal is a thin JS shell; reliancefoundation.org press pages are fetchable | confidence: high

**40. Kotak Kanya Scholarship**
- org: Kotak Education Foundation | category: scholarship | years: **1st only** | restriction: women; 75% in Class 12; income under Rs 6 lakh; professional degree at NIRF/NAAC institute; one-year break permitted — [official](https://kotakeducationfoundation.org/kotak-kanya-scholarship/)
- status: expected | last known: 14 Jul-30 Sep 2026 — [official](https://kotakeducationfoundation.org/kotak-kanya-scholarship/). Press dates of 20 and 31 Aug are superseded.
- next window: PROJECTION Jul-Sep 2027 | amount: Rs 1.5 lakh/yr until degree completion | bot: SSR | confidence: high

**41. LIC Golden Jubilee Scholarship**
- org: LIC | category: scholarship | years: **1st only** ("taken admission in the academic year 2026-27 for pursuing first...") — [official scheme PDF](https://licindia.in/documents/d/guest/golden-jubilee-scholarship-scheme-2026)
- restriction: 60% in Class XII passed in 2023-24 to 2025-26; income up to Rs 4.5 lakh — [Internshala](https://internshala.com/competitions/lic-golden-jubilee-scholarship-scheme-2026/)
- status: expected | last known close: 30 Sep 2026, extended to 15 Oct 2026 — [PW](https://www.pw.live/news/lic-golden-jubilee-scholarship-2026). 15 Dec on one aggregator is unconfirmed.
- next window: PROJECTION Aug-Oct 2027 | amount: Rs 50,000 medical, Rs 40,000 engineering, Rs 20,000 other, per year | confidence: high on rules, medium on extension

**42. ONGC Merit Scholarship**
- org: ONGC Foundation | category: scholarship | years: **1st only** ("in the 1st year of a full-time regular Graduate Engineering or MBBS course")
- restriction: 60% in Class 12; income under Rs 4.5 lakh SC/ST, under Rs 2 lakh OBC/General — [Buddy4Study](https://www.buddy4study.com/scholarship/ongc-merit-scholarship)
- status: **open now** on Buddy4Study (18 Oct-30 Nov 2026). Conflict: other listings give 15 May 2026 and 31 Oct 2026. Verify at ongcscholar.org.
- next window: null | amount: Rs 48,000/yr | confidence: medium

**43. Foundation for Excellence (FFE)**
- org: FFE | category: scholarship | years: 1st only | restriction: engineering, medicine, integrated law; 70% in Class XII; income under Rs 4 lakh; BArch and BDS excluded
- status: **open now** per listing, 1 Aug-31 Dec 2026 — [Internshala](https://internshala.com/competitions/?p=13090) (not confirmed officially); prior cycle reported closing 31 Jan 2026
- next window: PROJECTION Aug-Dec 2027 | amount: Rs 50,000/yr | confidence: medium-low

**44. Santoor Women's Scholarship**
- org: Wipro Consumer Care | category: scholarship | years: 1st only (Class 12 passed in the current session, first year of UG) — [indiascholarships.in](https://www.indiascholarships.in/news/santoor-womens-scholarship-2026-27-registration-dates)
- restriction: women from government schools; AP, Telangana, Karnataka, Chhattisgarh (a search summary said AP and Maharashtra, so verify)
- status: unclear. 15 Oct 2026 ([Agrijob](https://www.agrijob.in/santoor-scholarship-program-2026-27-apply-online/)) vs "late November 2026" (indiascholarships); 15 Oct 2025 prior — [fundsforngos](https://www2.fundsforngos.org/education/apply-now-santoor-womens-scholarship-program-india/)
- next window: PROJECTION Aug-Oct 2027 | amount: Rs 30,000/yr up to 3 years | confidence: medium-low

**45. Aditya Birla Scholarships**
- org: Aditya Birla Group | category: scholarship | years: 1st only in effect. "The top 20 students (in terms of their entrance exam ranking at the time of admission) are invited to apply through the Dean" — [official](https://www.adityabirlascholars.net/eligibility-application-process)
- restriction: invitation only; IITs Mumbai, Delhi, Chennai, Kanpur, Kharagpur, Roorkee, Guwahati; BITS Pilani; named law colleges; IIMs and XLRI
- status: expected | dates: null. The official page says the scholarship "is announced only in September". Aggregator dates conflict (10 Aug 2026, Dec 2025).
- next window: PROJECTION results around Sep 2027 | amount: IITs/BITS INR 1,50,000 p.a.; Law INR 1,80,000 p.a. or actual fees — [official](https://www.adityabirlascholars.net/eligibility-application-process)
- bot: 406 to plain UA, 200 to browser UA | confidence: high on rules

**46. Aditya Birla Capital Scholarship**
- org: Aditya Birla Capital Foundation | category: scholarship | years: any year | restriction: girls in government institutions per DT Next; aggregators say broader with 60% and income Rs 6 lakh
- status: unclear. 30 Oct (2026 implied) — [DT Next](https://www.dtnext.in/news/tamilnadu/dt-next-campus-applications-open-for-aditya-birla-capital-programme-here-is-how-you-can-apply) vs 30 Nov 2026 — [indiascholarships](https://www.indiascholarships.in/scholarships/aditya-birla-capital-scholarship)
- amount: up to Rs 60,000 | confidence: low-medium

**47. Tata Trusts education grants**
- org: Tata Trusts | category: scholarship | years: unclear
- Medical and Healthcare Scholarship: "Submission for this scholarship is no longer accepted" → paused or discontinued — [official](https://www.tatatrusts.org/our-work/individual-grants-programme/education-grants)
- Means Grant: "Applications are currently being accepted online by email for the 2026-27 academic year", reimbursement basis → open now; level of study not read — [official](https://www.tatatrusts.org/our-work/individual-grants-programme/education-grants)
- amount: null | bot: SSR | confidence: high on status, low on Means Grant detail

**48. Tata Capital Pankh**
- org: Tata Capital | category: scholarship | years: any year | restriction: Class 11-12, UG, diploma, ITI
- status: expected | last known close: 26 Oct 2026 (most sources); 30 Sep 2026 on one — [Careers360](https://school.careers360.com/articles/tata-capital-pankh-scholarship-program-2026-27) | next window: PROJECTION Aug-Oct 2027 | amount: null | confidence: medium

**49. HDFC Parivartan ECSS**
- org: HDFC Bank | category: scholarship | years: any year | restriction: UG enrolled, 55% in last exam, income up to Rs 2.5 lakh, crisis cases preferred
- status: **open now**. Deadline moved from 31 Aug to 31 Oct to **15 Dec 2026** — [Careers360](https://school.careers360.com/articles/hdfc-parivartan-ecss-programme-2026). Other listings show 30 Sep 2026.
- next window: PROJECTION Jul-Dec 2027 | amount: UG figure not stated | confidence: medium

**50. HDFC Badhte Kadam**
- org: HDFC | category: scholarship | years: unclear | status: unclear. No official 2026-27 notice found. Last reported close around 31 Jan 2026; CollegeDekho shows "to be announced" — [CollegeDekho](https://collegedekho.com/hdfc-badhte-kadam-scholarship-dsp-33)
- amount: conflicting across listings | confidence: low. The name may have changed or lapsed since HDFC Ltd merged into HDFC Bank (inference, unverified).

**51. Sitaram Jindal Foundation Scholarship**
- org: Sitaram Jindal Foundation | category: scholarship | years: any year | restriction: under 30; income up to Rs 4 lakh salaried, Rs 2.5 lakh others; marks thresholds by category — [DT Next](https://www.dtnext.in/news/tamilnadu/dt-next-campus-applications-open-for-sitaram-jindal-foundation-scholarship-scheme-2026-here-is-how-you-can-apply); [official](https://www.sitaramjindalfoundation.org/scholarships-for-students-in-bangalore.php)
- status: **open now**, "Round The Year" (updated 28 Oct 2026) | amount: varies by category; Rs 500-1,800/month visible officially, up to Rs 3,200/month by aggregators | bot: SSR | confidence: medium

**52. Colgate Keep India Smiling**
- org: Colgate-Palmolive India | category: scholarship | years: 1st in effect in the last read terms (Class 12 passed in the same year) | restriction: income under Rs 5 lakh, 60% in Class 12
- status: unclear. Latest terms found are 2022-23; offer period "July to December" — [Buddy4Study](https://www.buddy4study.com/article/colgate-scholarship). Listing of 31 Dec 2024 close is unconfirmed.
- amount: Rs 30,000/yr | confidence: low

**53. SBI Platinum Jubilee Asha Scholarship**
- org: SBI Foundation | category: scholarship | years: any year | restriction: Top 300 NIRF, or NAAC A grade or above, for UG
- status: expected | last known close: 4 Sep 2026, extended to 19 Sep 2026 — [Careers360](https://school.careers360.com/articles/sbi-asha-scholarship-2026-27); prior 30 Nov 2025 (aggregators)
- next window: PROJECTION Jul-Nov 2027 | amount: Rs 75,000 UG | confidence: medium

**54. Glow & Lovely Careers Scholarship**
- org: HUL | category: scholarship | years: unclear | restriction: women aged 15-30 | status: unclear; 30 Nov 2025 last reported — [indiascholarships](https://www.indiascholarships.in/scholarships/glow-lovely-careers-scholarship-for-women) | amount: null | confidence: low

#### G. Abroad

**55. Mitacs Globalink Research Internship (India via AICTE)**
- org: Mitacs, AICTE | category: research | years: 3rd+ (outside target) in practice (see the minimum-year section) | region: Canada
- restriction: Indian nationals; BE/BTech only at listed institutions; **IIT students not eligible for 2027**; 70% CGPA; 300 seats — [official](https://www.mitacs.ca/our-programs/globalink-research-internship-students/)
- status: expected (closed) | last known close: 16 Sep 2026, 1 pm PT; call "typically open for six weeks" | next window: PROJECTION Aug-Sep 2027 | amount: airfare, housing and food stipends, insurance, no figures
- bot: SSR | confidence: high

**56. DAAD WISE**
- org: DAAD | category: research | years: 3rd+ (outside target) by the most-cited rule: "Bachelor students must be in their 5th or 6th semester at the application deadline" — [opportunityinside](https://opportunityinside.com/scholarships/daad-wise-internship-germany-2027.html) (aggregator). A [Konstanz page](https://dbis.inf.uni-konstanz.de/student-corner-1/internships) says 4th or 5th semester.
- restriction: selected partner Indian institutions; German host invitation
- status: expected | last known close: 1 Nov 2026 (aggregators) | next window: PROJECTION Sep-Nov 2027 | amount: EUR 831/month plus EUR 1,050 travel (aggregator; EUR 861 also seen)
- bot: daad.in WISE URL returned 404; the DAAD India internships page does not mention WISE | confidence: medium-low. **Official text not reached.**

**57. France Excellence Charpak Lab / Summer Training**
- org: French Institute in India | category: research | years: any year on paper. "enrolled in an Indian institution of higher learning at Bachelor's or Master's level at the time of application" — [official](https://www.inde.campusfrance.org/node/96)
- restriction: invitation letter from a French lab; NOC from the Indian university
- status: expected ("Call for Applications 2026 session is closed now") | last known close: 24 Jan 2025 (listing) | next window: PROJECTION Nov 2026-Jan 2027 | amount: EUR 700/month up to two months | bot: SSR | confidence: high on rules, low on dates

**58. Khorana Program for Scholars**
- org: IUSSTF, DBT | category: research | years: 2nd only if that is the pre-final year of a 3-yr degree; otherwise 3rd. Excludes "First Year, Final year and PhD students" — [official](https://iusstf.org/khorana-program-for-scholars)
- restriction: biotechnology and allied fields
- status: **unclear**. Official page still shows 7 Oct 2024 and summer 2025. WINStep says on hold (undated) — [WINStep](https://www.winstepforward.org/?p=3752). An aggregator's 7 Oct 2026 looks carried over.
- next window: null | amount: airfare, stipend, insurance; figure null | bot: SSR but stale | confidence: high on year rule, low on status

**59. IUSSTF-Viterbi Program**
- org: IUSSTF, USC | category: research | years: 3rd+ (outside target): "3rd year of a 4-year bachelor's" — [official](https://iusstf.org/iusstf-viterbi-program)
- restriction: EE, ECE, computer engineering, computational sciences; GPA 8.5
- status: expected | last known close: 31 Dec 2025, noon IST (extended) | next window: PROJECTION Oct-Dec 2026 | amount: stipend, airfare, housing | bot: SSR | confidence: high

**60. ETH Student Summer Research Fellowship (Computer Science)**
- org: ETH Zurich | category: fellowship | years: 2nd only in practice. "You will have completed two years of study by start of the programme" — [official](https://inf.ethz.ch/studies/summer-research-fellowship/how-to-apply.html)
- restriction: CS or closely related field; graduation in the year after the fellowship or later
- status: **open now**. Window 1 Nov-16 Dec 2026, 13:00 CET; programme 2 Jul-27 Aug 2027 — [official](https://inf.ethz.ch/studies/summer-research-fellowship/how-to-apply.html). Prior: 16 Dec 2025 — [Opportunities Circle](https://www.opportunitiescircle.com/eth-student-summer-research-fellowship/)
- next window: PROJECTION Nov-Dec 2027 | amount: "a stipend of CHF 4,000" plus travel and visa. Aggregators say per month, which conflicts; use the official wording
- bot: SSR | confidence: high

**61. EPFL E3 Summer Research Program**
- org: EPFL | category: research | years: 3rd+ (outside target). "successfully completed at least your second Bachelor year" at the time of application — [official](https://eee.epfl.ch/selection-criteria)
- status: expected | last known close: 1 Nov 2025 — [EPFL news](https://actu.epfl.ch/news/apply-to-the-e3-epfl-excellence-in-engineering-p-6); 1 Nov 2026 by aggregators | next window: PROJECTION Sep-Nov 2027 | amount: CHF 1,800-2,500/month (unverified aggregator) | confidence: high on rule

**62. EPFL Excellence Research Internship Program (ERIP)**
- org: EPFL | years: not available to Indian universities. Partner universities in North America and Singapore only; "If you are a 1st year student, you are unfortunately not yet eligible" — [official](https://epfl.ch/education/international/en/coming-to-epfl/research-internships/eligibility-and-application)
- status: not applicable | closes 30 Nov 2026 for partners | confidence: high

**63. Summer@EPFL (CS) and EPFL Life Sciences SRP**
- org: EPFL | years: unclear | deadlines 29 Nov 2026 and 15 Nov 2026 from aggregators only — [Leap](https://leapscholar.com/blog/?p=82115). Official page URL tried returned 404.
- status: unclear | confidence: low

**64. Caltech SURF**
- org: Caltech | category: research | years: **1st and 2nd on paper.** Visiting students must "Complete the second semester or third quarter at your college or university", be continuing undergraduates, GPA 2.5/4.0 — [official](https://sfp.caltech.edu/undergraduate-research/programs/surf/eligibility_requirements)
- restriction: international students on the Caltech campus only, not JPL; needs a prospective Caltech mentor
- status: **open now** by aggregators (opened 1 Nov 2026); due 22 Feb — [official](https://sfp.caltech.edu/undergraduate-research/programs/surf/application_information)
- next window: PROJECTION Nov 2027-Feb 2028 | amount: $8,110 or $8,354 (aggregators conflict) | bot: SSR | confidence: high on rule. Funding for non-Caltech Indian students not confirmed.

**65. Amgen Scholars Asia (NUS host)**
- org: NUS, Amgen Foundation | category: research | years: **1st and 2nd.** Must have "completed at least your first year" by 31 May 2027 — [Biotecnika](https://www.biotecnika.org/2026/11/amgen-scholars-asia-program-2027-nus/) (reproduces the call). A current Indian 1st-year whose second semester ends after 31 May may fall short, so confirm with NUS.
- restriction: home university in Asia, UN definition; awards a bachelor's in Biology, Biotechnology, Biomedical or Pharmaceutical Sciences; interest in a PhD
- status: **open now**, 1 Nov 2026-1 Feb 2027, 18:00 SGT. Prior: 1 Nov 2025-1 Feb 2026 — [NUS](https://www.dbs.nus.edu.sg/outreach/amgen-scholars-program)
- next window: PROJECTION Nov 2027-Feb 2028 | amount: SGD 6,000 plus travel up to SGD 1,500 | bot: NUS page is a 212-byte stub to curl | confidence: medium-high

**66. NUS School of Computing Summer Research Internship**
- org: NUS SoC | category: research | years: any year on paper ("current undergraduate and master's students") — [official](https://www.comp.nus.edu.sg/programmes/pg/events/res-internship/)
- status: expected | last known close: 16 Jan 2026 | next window: PROJECTION Dec 2026-Jan 2027 | amount: SGD 500/week for 10 weeks | confidence: medium-high

**67. IRIS @ NUS**
- org: NUS CDE | category: research | years: 2nd+ by aggregators, minimum GPA 3.5/4 reported from the official page — [NUS, via search snippet](https://cde.nus.edu.sg/graduate/iris-nus/). ASEAN may be prioritised — [NUS Graduate School](https://nusgs.nus.edu.sg/?p=89839)
- status: unclear | dates: null | bot: stub to curl | confidence: low

**68. OIST Research Internship**
- org: OIST | category: research | years: 3rd+ (outside target), "final 2 years of study" (aggregator) — [Heysuccess](https://www.heysuccess.com/opportunity/OIST-(Okinawa-Institute-of-Science-and-Technology-Graduate-University)-Research-Internship-Program-(sping-2025)-11004)
- status: expected, twice-yearly | last known close: 15 Oct 2024 and 15 Oct 2025 (listings) | amount: null | official: https://admissions.oist.jp/apply-research-internship | confidence: low-medium

**69. KAUST VSRP**
- org: KAUST | category: research | years: 3rd+ (outside target) (aggregators) | status: rolling | amount: about $1,000/month (aggregators) | confidence: low-medium — [Opportunities Corners](https://opportunitiescorners.com/kaust-student-research-internship/)

**70. S.N. Bose Scholars**
- org: IUSSTF | category: research | years: unclear | status: unclear | last known close: 31 Oct 2025 (aggregator) | confidence: low — [indiascholarships](https://www.indiascholarships.in/scholarships/sn-bose-scholars-program-international-research)

### Inferences
- Official sites of the private scholarships often delegate to Buddy4Study, so a bot should target both.

### Gaps
- DAAD WISE official rule could not be reached; item 56 relies on aggregators.
- JNCASR SRFP year-of-study rule not read (site unstable).
- IIT Guwahati, Indore, Ropar, Palakkad and Dharwad were not verified. Leads: [IIT Ropar ad](https://iitrpr.ac.in/mainwebsite-api/uploads/advertisements/others/1773296556902-SI_advt.%202026.docx%20(5).pdf), [IIT Palakkad](https://sun.iitpkd.ac.in), [IIT Dharwad](https://ldap.iitdh.ac.in/node/8254). An Amgen-related site at [IIIT](https://amgenscholars.iiit.ac.in/faqs.html) was seen and not examined.
- Stipend amounts for SRFP, SURGE and Khorana were not found officially.

## What is the real minimum year?

### Takeaway
Most summer research programs start at 2nd year, and most flagship abroad programs start in practice at 3rd year. True 1st-year research access in India is the HBCSE NIUS line and JNCASR POCE/POBE. Abroad, Amgen Scholars Asia and Caltech SURF are the two that a first-year can reach on paper.

### Cited Findings
- IASc-INSA-NASI exact list: "BS / BSc (II year only)", "BE / BTech / BCA (II and III years only)", "BStat / BMath (II year only)", "BSc (Research) (III year only)", "BPharm (III and IV years only)", "BArch (II, III and IV years only)", "(5-year integrated) MS / MSc / MTech / MBBS / BVSc (II, III, IV years only)", "(dual degree) BTech + MTech (II, III, IV years only)" — [official instructions](https://webjapps.ias.ac.in/fellowship2027/application_instructions.jsp)
- Mitacs: "Applicants must have completed at least two years of undergraduate study" or be in the second year, with "one to three semesters remaining in their program as of fall 2027" — [official](https://www.mitacs.ca/our-programs/globalink-research-internship-students/)
- Khorana excludes "First Year, Final year and PhD students" and targets "Pre-final year" — [official](https://iusstf.org/khorana-program-for-scholars)
- DAAD WISE: 5th or 6th semester at the deadline — [aggregator](https://opportunityinside.com/scholarships/daad-wise-internship-germany-2027.html); not official.
- ETH: two years completed "by start of the programme" — [official](https://inf.ethz.ch/studies/summer-research-fellowship/how-to-apply.html)
- EPFL E3: second Bachelor year completed at application — [official](https://eee.epfl.ch/selection-criteria)
- IIT Delhi: "completed at atleast 2 years" — [official 2025](https://home.iitd.ac.in/public/storage/uploads/SRFP%202025%20Notification_1740483333_05Mar25_1741157534.pdf)
- SURGE: external BSc/BA 2nd year, external BTech 3rd year — [official](https://surge.iitk.ac.in/node/5)
- ISRO internship: no year bar, UG allowed, 60% — [official](https://www.isro.gov.in/InternshipAndProjects.html)
- Caltech: "Complete the second semester or third quarter" — [official](https://sfp.caltech.edu/undergraduate-research/programs/surf/eligibility_requirements)

### Inferences
- Mitacs for a 4-year BTech: a 2nd-year applicant in Sep 2026 is in semester 3. In fall 2027 that student is in semester 5 with four semesters left, failing "one to three". So the "second year" wording does not help a 4-year BTech student. It works for a 3rd-year applicant. A 2nd-year student in a shorter program is not relevant, since Mitacs India is BE/BTech only.
- ETH is usable by a current 2nd-year: four semesters finish before 2 Jul 2027, and a BTech student graduates after 2028.
- EPFL E3 is not: a 2nd-year applying in Nov 2026 has not completed two years at application.
- IIT Delhi's wording is ambiguous on whether "completed" applies at application or at start, but the top-ten rank certificate plus Feb-Apr deadlines point to 3rd-years.
- A BSc student has better access than a BTech student at the same year in SURGE, IASc and Khorana, since 2nd year is the pre-final year of a 3-yr degree.
- SPARK's "two semesters" rule and Caltech's rule admit 1st-years on paper. A first-year applying in Feb-Mar has one semester of grades, so real acceptance odds are unknown.

### Gaps
- No acceptance data by year of study was found for any program.
- PM-USP wording: Careers360 says "80 per cent"; my recollection is that the scheme uses the 80th percentile of the board's pass list. This was not verified this session and needs the official guideline.

## Which programs are strictly first-year-only?

### Takeaway
These must be claimed in the year of admission, with no later entry: Reliance UG, Kotak Kanya, LIC Golden Jubilee, ONGC Merit, FFE, Santoor, Ishan Uday, Pragati, Saksham, POCE/POBE and NIUS Physics, Astronomy and Biology. INSPIRE-SHE would belong here but is paused. A missed year is permanent for the scholarships.

### Cited Findings
- Reliance: "first-year undergraduate and postgraduate students enrolled in full-time degree programmes" — [RF release](https://www.reliancefoundation.org/sites/default/files/2026-08/14082026%20-%20MR%20-%20Reliance%20Foundation%E2%80%99s%20prestigious%20Scholarships%20open%20for%20applications%201.pdf)
- Kotak: "secured admission to the first year of graduation programs in the academic year 2026-27" — [official](https://kotakeducationfoundation.org/kotak-kanya-scholarship/)
- LIC: "Have taken admission in the academic year 2026-27 for pursuing first" year — [official PDF](https://licindia.in/documents/d/guest/golden-jubilee-scholarship-scheme-2026)
- ONGC: "be in the 1st year of a full-time regular Graduate Engineering or MBBS course" — [Buddy4Study](https://www.buddy4study.com/scholarship/ongc-merit-scholarship)
- Pragati: "admitted to degree level course (1st or 2nd year) through lateral entry" — [Buddy4Study](https://www.buddy4study.com/article/aicte-scholarships). This means 1st year, or 2nd year only by lateral entry.
- Ishan Uday: "for first-year undergraduates with Northeast domicile proof" — [CareerIndia](https://www.careerindia.com/news/nsp-scholarship-2026-apply-for-ugc-pg-and-ishan-uday-schemes-guide-011-65745.html)
- POCE: "You must be in your first year of a 3-year or 4-year Bachelor of Science (B.Sc.) program" — [thefellowships.in](https://thefellowships.in/?p=712)
- NIUS Physics and Astronomy: first-year undergraduates only — [Physics](https://nius.hbcse.tifr.res.in/?p=5094); [Astronomy](https://nius.hbcse.tifr.res.in/?p=5098). NIUS Biology: "first year undergraduate students" — [official](https://nius.hbcse.tifr.res.in/announcements/nius-biology-2026/)
- INSPIRE-SHE: the offer is confirmed "upon submission of the first year B.Sc. / B.Sc. (Hons)/B.S./ B.Sc. with Research (4 years)/Int. M.Sc./Int. M.S. examination Mark-Sheet by the Scholar" and entry is by "top 1%" of Boards or eligible rank — [DST guidelines](https://online-inspire.gov.in/Content/SHEPostofferImplementationGuidelines2024.pdf)
- 2nd-year-only: NIUS Chemistry "second year undergraduate" with 70% in first year — [official](https://nius.hbcse.tifr.res.in/announcements/nius-chemistry-2026/); IASc for BSc students, item 4.

### Inferences
- Aditya Birla Scholarships act as first-year-only, since entry depends on rank at admission and the award comes in September.
- PM-USP fresh awards appear tied to the year after Class 12: the drop-year bar points that way, though Careers360 does not say so explicitly.
- A student in 1st year in 2026-27 who missed autumn 2026 can still reach ONGC and FFE now, and NIUS Physics and Astronomy, POCE and POBE in early 2027.

### Gaps
- The DST guideline read is the post-offer document. The pre-application SHE eligibility guideline was not read, so the "must apply in the year of entry" rule is inferred from it and from secondary sources.
- Keep India Smiling terms are from 2022-23.

## Real dates in the last 2-3 cycles, next windows, and what is open right now

### Takeaway
Open on 2026-11-06: IASc-INSA-NASI (to 30 Nov), ETH SSRF (to 16 Dec), Amgen Asia at NUS (to 1 Feb 2027), Caltech SURF (to 22 Feb), HDFC ECSS (to 15 Dec), ONGC (to 30 Nov, verify), FFE (to 31 Dec, verify), Sitaram Jindal (rolling) and Tata Means Grant. The dense months for 1st and 2nd years are Jan-Mar for research and Jul-Oct for scholarships.

### Cited Findings
Dates with two or more cycles:

| Program | Earlier cycle | Latest cycle | Source |
|---|---|---|---|
| IASc-INSA-NASI | close 30 Nov 2024; 31 Jan 2026 | 30 Nov 2026 | [2025](https://webjapps.ias.ac.in/fellowship2025/), [2026](https://webjapps.ias.ac.in/fellowship2026/), [2027](https://webjapps.ias.ac.in/fellowship2027/) |
| Reliance UG | close 4 Oct 2025 | 14 Aug-5 Oct 2026 | [2025](https://www.reliancefoundation.org/media/media-release/Reliance-Foundation-Scholarships-2025-26), [2026](https://school.careers360.com/articles/reliance-foundation-scholarship-2026-27) |
| NIUS Chemistry | close 17 Oct 2025 | close 30 Sep 2026 | [2025](https://nius.hbcse.tifr.res.in/?p=5059), [2026](https://nius.hbcse.tifr.res.in/announcements/nius-chemistry-2026/) |
| IIT Delhi SRFP | 27 Feb-20 Mar 2025 | close 3 Apr 2026 | [2025](https://home.iitd.ac.in/public/storage/uploads/SRFP%202025%20Notification_1740483333_05Mar25_1741157534.pdf), [2026](https://www.careerindia.com/news/iit-delhi-srfp-2026-apply-for-summer-research-fellowship-057621.html) |
| ETH SSRF | close 16 Dec 2025 | 1 Nov-16 Dec 2026 | [2025](https://www.opportunitiescircle.com/eth-student-summer-research-fellowship/), [2026](https://inf.ethz.ch/studies/summer-research-fellowship/how-to-apply.html) |
| Amgen Asia NUS | 1 Nov 2025-1 Feb 2026 | 1 Nov 2026-1 Feb 2027 | [NUS](https://www.dbs.nus.edu.sg/outreach/amgen-scholars-program), [Biotecnika](https://www.biotecnika.org/2026/11/amgen-scholars-asia-program-2027-nus/) |
| PM-USP CSSS | extended to 15 Dec 2025 | renewal to 31 Oct 2026 | [Bihar notice](https://secondary.biharboardonline.com/Adv.html), [NSP](https://scholarships.gov.in/) |
| Pragati/Saksham | 31 Oct 2025 | 31 Oct 2026 | [2025](https://www.collegesimplified.in/post/nsp-scholarship-last-date-2025-26-category-wise-updates), [2026](https://www.buddy4study.com/article/aicte-scholarships) |
| Santoor | 15 Oct 2025 | 15 Oct 2026 (disputed) | [2025](https://www2.fundsforngos.org/education/apply-now-santoor-womens-scholarship-program-india/), [2026](https://www.agrijob.in/santoor-scholarship-program-2026-27-apply-online/) |

Single-cycle dates are in each record. Bot-fetch results, probed 2026-11-06:
- Fetchable SSR: webjapps.ias.ac.in, surge.iitk.ac.in, nius.hbcse.tifr.res.in, isro.gov.in, mathweb.tifr.res.in, kotakeducationfoundation.org, mitacs.ca, iusstf.org (stale content), sfp.caltech.edu, inf.ethz.ch, epfl.ch, inde.campusfrance.org, tatatrusts.org, sitaramjindalfoundation.org, licindia.in (PDF), online-inspire.gov.in (incomplete TLS chain breaks strict clients).
- UA-gated, works with a browser UA: ias.ac.in, ssp.iitm.ac.in, adityabirlascholars.net.
- Needs relaxed TLS: scholarships.gov.in, spark.iitr.ac.in.
- JS or stub, needs a headless browser: srip.iitgn.ac.in, internship.aicte-india.org, spark.iitr.ac.in, dbs.nus.edu.sg, cde.nus.edu.sg, scholarships.reliancefoundation.org, pminternship.mca.gov.in.
- Unstable: jncasr.ac.in, ipc.iisc.ac.in (502 or timeout).

### Inferences
- PROJECTION calendar, for students in 1st or 2nd year in 2026-27:
  - Dec 2026-Jan 2027: JNCASR SRFP, NUS SoC.
  - Jan-Feb 2027: POCE, POBE, Charpak.
  - Feb-Mar 2027: NIUS Physics, NIUS Astronomy, SURGE, SRIP, SPARK, SURE, TIFR Math.
  - Jul-Oct 2027: next first-year scholarship wave, for incoming students only.
- Deadline extensions are common on NSP: 2025-26 PM-USP moved to 15 Dec 2025. A closed NSP window should be rechecked for about six weeks.
- Hardcoded dates age quickly: HDFC ECSS moved twice in one cycle, and IASc swung between Nov and Jan.

### Gaps
- Open dates are missing for most programs; only close dates were published.
- Three-cycle history was found for IASc only. Earlier cycles for the rest would need archived pages.
- ONGC, FFE and Caltech's 2027 opening rest on partner or aggregator listings.
- Whether PM-USP fresh opened after this probe is unknown.
