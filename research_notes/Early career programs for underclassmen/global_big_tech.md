# Big-tech programs for 1st and 2nd year undergraduates: verified status for the 2026-27 cycle

All "checked" statements mean checked on 2026-11-06 unless another date is given. "Raw fetch" means a plain curl request with a bot user agent. "Browser" means a real headless Chrome session. Evidence strength, strongest first: live employer API or page > employer text on a mirror > press > guide or aggregator.

## Is it true that Google STEP, Microsoft Explore and Meta University were cancelled in 2025? Does Explore have a summer 2027 window?

### Takeaway
The three programs have three different outcomes. Meta University is really closed, confirmed by a Meta spokesperson. Microsoft Explore is alive, with a first-year posting live today and a published window rule. Google STEP as a brand has disappeared without any Google announcement, but Google ran a near-identical 2nd-year "Associate Software Developer Intern" role for summer 2026 in India, so "cancelled" overstates what is known. The extern.com pages I read do not actually say what the brief attributes to them: they say "cancelled or restructured" in general terms, say Explore still runs, and say Google never announced an end to STEP.

### Cited Findings

**Microsoft Explore: not cancelled, summer 2027 confirmed from primary sources**
- Microsoft's job API returns a live posting: "Explore Program Engineering Internship Opportunities: First-Year Students, Redmond", job number 200042630, postedTs decodes to 2026-11-02 03:44 UTC, record created 2026-07-06 — [Microsoft Careers API](https://apply.careers.microsoft.com/api/pcsx/position_details?position_id=1970393556925823&domain=microsoft.com&hl=en); [public posting](https://apply.careers.microsoft.com/careers/job/1970393556925823)
- Quote from that posting: "Applications for this role will be accepted during the first week of each month from November through February, or until all positions are filled. This position will be open for a minimum of 5 days" — [same posting](https://apply.careers.microsoft.com/careers/job/1970393556925823)
- Quote: "Must be enrolled in first year of a 4-year undergraduate degree program at time of application." Pay: "USD $25.96 - $47.77 per hour", or "$37.58 - $54.04" in the SF Bay Area and NYC — [same posting](https://apply.careers.microsoft.com/careers/job/1970393556925823)
- The posting does not literally say "summer 2027". That year is inferred from the posted date and from third-party coverage. Microsoft's Explore page still describes the program as current — [Explore Microsoft](https://careers.microsoft.com/v2/global/en/exploremicrosoft)
- The second-year US posting (job number 200042628, position 1970393556925816 per Extern) returns "Position not found" from the same API today — [API](https://apply.careers.microsoft.com/api/pcsx/position_details?position_id=1970393556925816&domain=microsoft.com&hl=en). Extern reported its rule as "first week of each month from October through December", with the October window opening Oct 1 and closed by Oct 9, 2026, and labelled the Nov 1-7 and Dec 1-7 windows as EXPECTED — [Extern](https://www.extern.com/post/microsoft-explore-internship-guide)
- I did not find the second-year posting on the Microsoft search API on Nov 6, so the expected November reopening is not confirmed — [search API](https://apply.careers.microsoft.com/api/pcsx/search?domain=microsoft.com&query=Explore%20Program&location=&start=0&num=20)
- This explains a conflict between guides. Extern's freshman page says "No first-year version is posted" (status from its Oct 8 check), which the Nov 2 posting has now overtaken — [Extern](https://www.extern.com/post/internships-for-freshmen-in-college-2027)
- No source I read claims Explore was cancelled. Extern's Explore guide cites only a Reddit thread where "some wondered whether the program had been dropped" — [Extern](https://www.extern.com/post/microsoft-explore-internship-guide)

**Meta University: closed, confirmed**
- Work Shift, April 30, 2025, by Colleen Connolly: Meta spokesperson Tracy Clayton confirmed Meta University "has accepted its final class"; a January 10, 2025 memo (reported by Axios per the article) indicated the closure. The spokesperson is paraphrased, not fully quoted, and Meta gave no official reason. The article frames it within a shift away from DEI efforts — [Work Shift](https://workshift.org/with-meta-universitys-closure-a-sign-of-changing-times-in-tech/)
- No replacement is reported — [Work Shift](https://workshift.org/with-meta-universitys-closure-a-sign-of-changing-times-in-tech/); [Extern](https://www.extern.com/post/2027-underclassmen-cs-internships-guide)
- The old program URL I tried returned 404 by raw fetch. This is weak evidence on its own, because metacareers.com may reject bots — [Meta Careers](https://www.metacareers.com/careerprograms/pathways/metauniversity)

**Google STEP: brand gone, no announcement, probable rename in at least two regions**
- Browser check: https://buildyourfuture.withgoogle.com/programs/step redirects to the Google Careers home page (https://www.google.com/about/careers/applications/). This matches Extern's report — [Extern](https://www.extern.com/post/google-step-program-guide)
- Google Careers search for "STEP" at Intern & Apprentice level: "0 jobs matched" — [Google Careers](https://www.google.com/about/careers/applications/jobs/results?q=%22STEP%22&target_level=INTERN_AND_APPRENTICE)
- Google Careers search for "Associate Software Developer": "0 jobs matched" — [Google Careers](https://www.google.com/about/careers/applications/jobs/results?q=%22Associate%20Software%20Developer%22)
- Intern-level India search: 4 jobs. Three visible titles are PhD roles; the fourth title was not captured, and it is remote-eligible — [Google Careers](https://www.google.com/about/careers/applications/jobs/results?target_level=INTERN_AND_APPRENTICE&location=India)
- Extern: "Google hasn't announced that the program ended"; no STEP posting as of November 2, 2026 — [Extern](https://www.extern.com/post/google-step-program-guide). I also found no Google statement.
- Last STEP-branded postings were for summer 2025: Extern lists EMEA with deadline October 25, 2024 and internship dates June 30 to September 26, 2025 — [Extern](https://www.extern.com/post/google-step-program-guide). "Student Training in Engineering Program (STEP) Intern, 2025" postings also appear for India — [Outscal mirror](https://outscal.com/job/software-student-training-in-engineering-program-step-intern-2025-english-at-google-in-bengaluru-karnataka-india-1)
- Google-authored posting text on a mirror, "Associate Software Developer Intern, 2026 (English)": "This internship is intended for 2nd year students who are pursuing an Engineering degree program in Computer Science or a related field. Our Summer internships will start in May 2026 and will be for 10-12 weeks in duration." Locations: Bengaluru, Hyderabad, Pune — [AnitaB mirror](https://jobs.anitab.org/companies/google-24698/jobs/63713505-associate-software-developer-intern-2026-english)
- Google-authored text on a mirror, "Associate Software Developer Intern, 2025", Sydney: "Applications will open April 28th, 2025. Please complete your application by May 23rd, 2025." "intended for students in their second year of an accredited degree program" — [AnitaB mirror](https://jobs.anitab.org/companies/google-24698/jobs/49923352-associate-software-developer-intern-2025)
- The rename claim itself is unofficial: Eric Spiegel, a mentor and not a Google source, wrote "Google has rebranded STEP to ASDI — Associate Software Developer Intern." — [LinkedIn](https://www.linkedin.com/posts/espiegel_students-google-careers-activity-7367941921014456321-yyWU). Extern calls this unconfirmed and could not confirm a US version — [Extern](https://www.extern.com/post/2027-underclassmen-cs-internships-guide)

### Inferences
- ASDI is very likely STEP's functional successor outside North America: same year of study, same 10-12 week summer shape, same three Indian cities that guides report for STEP. This is my inference. Google has not said so.
- Zero ASDI postings on Nov 6 is not evidence of cancellation for India, because the 2026 India posting appeared only around December 16, 2025 (see the dates section). The real test is mid-December 2026 to January 2027.
- A North American STEP or ASDI equivalent has no 2026 or 2027 evidence at all. Treat it as discontinued in practice, unannounced.

### Gaps
- Could not confirm: any Google statement on STEP; a Google-domain copy of the ASDI posting (only mirrors survive); a summer 2027 ASDI posting; whether ASDI still prioritises women or underrepresented groups as guides say India STEP did.
- Could not confirm whether the second-year Explore posting reopened in November, or the exact Nov-Feb calendar days ("first week" is Microsoft's wording, not a date range).
- Reddit is blocked from this research tooling, so community reports were not read directly.

## Which programs can a student enrolled at an Indian university apply to?

### Takeaway
Only a handful: Microsoft Explore second-year track (India, but with an official-page contradiction on year of study), Google Associate Software Developer Intern if it returns (India, 2nd year), Amazon Future Engineer India scholarship (women, low income, new entrants), and Google Summer of Code (any year, not an employer internship). Microsoft's first-year track explicitly excludes India. NVIDIA Ignite and Salesforce Tech Launchpad explicitly require US universities. Everything else is either US-located with no India wording, or has no underclass track.

### Cited Findings
- **Microsoft Explore, second year, YES:** "Microsoft's second-year application is intended for candidates in their second year of a bachelor's degree program in the United States, Canada, Mexico or India." — [Explore Microsoft](https://careers.microsoft.com/v2/global/en/exploremicrosoft)
- **Microsoft Explore, first year, NO:** "The Explore Microsoft's first-year application is intended for candidates in their first year of a bachelor's degree program in the United States, Canada, or Mexico. Please do not apply for both." — [Explore Microsoft](https://careers.microsoft.com/v2/global/en/exploremicrosoft)
- **Official contradiction:** Microsoft's eligibility page says for India, "Role Title: Explore Interns", "currently in their pre-final year of graduation (3rd year of bachelors degree or 1st year of masters degree)" — [Internship Eligibility](https://careers.microsoft.com/v2/global/en/internship_eligibility). That conflicts with the FAQ above. Talentd reports that the India Explore posting live in December 2025 asked for "the second year of a 4-year undergraduate degree" — [Talentd](https://www.talentd.in/articles/microsoft-software-engineering-internship)
- **Google ASD Intern, YES for the 2026 posting:** "intended for 2nd year students who are pursuing an Engineering degree program"; minimum: "Currently enrolled in a Bachelor's program, majoring or intending to major in Computer Science or related technical field." — [AnitaB mirror](https://jobs.anitab.org/companies/google-24698/jobs/63713505-associate-software-developer-intern-2026-english)
- **Amazon Future Engineer India, YES:** "Female engineering students enrolled in computer science and related programs for the 2025-2029 academic cycle can apply" — [Amazon press, Aug 2025](https://press.aboutamazon.com/in/news/community/2025/8/amazon-program-to-empower-indias-women-in-tech-announces-500-more-scholarships)
- **NVIDIA Ignite, NO:** "pursuing a bachelor's degree at a four-year university in the United States" (2027 posting wording as quoted by a guide; the posting itself is gone) — [Extern](https://www.extern.com/post/nvidia-ignite-program-guide)
- **Salesforce Tech Launchpad, NO:** "Students who will complete their sophomore year in Spring 2026 and have plans to major in computer science/engineering at a US college or university are encouraged to apply." — [CodePath](https://info.codepath.org/futureforce-tech-launchpad)
- **Amazon Future Engineer US, NO:** "Be a high school senior in the U.S." — [AFE Scholarships](https://www.amazonfutureengineer.com/scholarships)
- **Google Summer of Code, YES:** the official FAQ requires age 18+, residence in a non-embargoed country and limited prior open-source experience; being a student is not required (official FAQ as summarised by search; not quoted verbatim) — [GSoC FAQ](https://developers.google.com/open-source/gsoc/faq?authuser=7)
- **Regular Google SWE Intern 2027, not for 1st/2nd years of a 4-year degree:** "Enrolled in the penultimate academic year of a Bachelor's or Master's degree." — [Google Careers](https://www.google.com/about/careers/applications/jobs/results/104489346874122950-software-engineering-intern/)
- **Atlassian intern, same:** "Designed for students in their penultimate year of undergraduate or postgraduate studies" — [Atlassian](https://www.atlassian.com/company/careers/earlycareers)

### Inferences
- The eligibility-page row for India Explore is word-for-word the same as the row above it for University Interns, so it is probably a copy-paste leftover. The Explore page FAQ and the December 2025 posting both say second year. Treat second year as the working rule and tell users to read the live posting. This is my reading, not Microsoft's.
- For a 1st-year student at an Indian university, no big-tech internship in this set is open. AFE India and GSoC are the only confirmed routes. A 1st-year student should plan for Explore or ASDI in their second year.

### Gaps
- Capital One, Duolingo, Bloomberg First Year Insights, Visa and Uber Career Prep pages I read give no explicit India or university-country wording, so they stay "unclear", though all are US-located.
- Uber Career Prep's page shows an eligibility heading ("Major & Location"), but the criteria text is not in the raw HTML.

## What were the actual open and close dates in the last 2-3 cycles, and what window can be projected?

### Takeaway
Reliable multi-year dates exist only for NVIDIA Ignite (stable, about two weeks in early-to-mid October), Duolingo Thrive SWE (closes about Sept 29-30), and partly for Google India (December). Most other programs have one data point or none. Microsoft has moved to a repeating monthly window instead of a single deadline.

### Cited Findings

| Program | Cycle | Open | Close | Source strength |
|---|---|---|---|---|
| NVIDIA Ignite | Summer 2027 | 2026-10-05 | 2026-10-18 | Guide plus GitHub tracker — [Extern](https://www.extern.com/post/nvidia-ignite-program-guide); [tracker](https://github.com/Jose-Gael-Cruz-Lopez/underclassmen-opportunities) |
| NVIDIA Ignite | Summer 2026 | 2025-10-06 | 2025-10-19 | Guide — [Extern](https://www.extern.com/post/nvidia-ignite-program-guide) |
| Explore 1st yr, US | Summer 2027 | 2026-11-02 (posted) | Rule: first week of each month, Nov-Feb, or until filled | Primary — [Microsoft](https://apply.careers.microsoft.com/careers/job/1970393556925823) |
| Explore 2nd yr, US | Summer 2027 | 2026-10-01 | by 2026-10-09; rule Oct-Dec | Guide — [Extern](https://www.extern.com/post/microsoft-explore-internship-guide) |
| Explore 2nd yr, India | Summer 2026 | null (posting live December 2025) | null | Guide — [Talentd](https://www.talentd.in/articles/microsoft-software-engineering-internship) |
| Explore 2nd yr, India | Summer 2025 | null | 2025-03-09 | Search snippet only; page returned 403 — [Prosple](https://in.prosple.com/graduate-employers/microsoft-india/jobs-internships/explore-program-internship-second-year-students) |
| Google ASD Intern, India | Summer 2026 | about 2025-12-16 | 2026-01-14, conflict below | Mirror and search snippet — [AnitaB](https://jobs.anitab.org/companies/google-24698/jobs/63713505-associate-software-developer-intern-2026-english); [Prosple](https://in.prosple.com/graduate-employers/google-india/jobs-internships/associate-software-developer-intern) |
| Google ASD Intern, Sydney | 2025 | 2025-04-28 | 2025-05-23 | Google text on a mirror — [AnitaB](https://jobs.anitab.org/companies/google-24698/jobs/49923352-associate-software-developer-intern-2025) |
| Google STEP, India | Summer 2025 | late Nov 2024 (guide) | 2024-12-15 | Aggregators only — [CSE NoticeBard](https://cse.noticebard.com/internships/google-step-internship-2025/amp) |
| Google STEP, EMEA | Summer 2025 | null | 2024-10-25 | Guide — [Extern](https://www.extern.com/post/google-step-program-guide) |
| Duolingo Thrive SWE | Summer 2027 | 2026-09-15/16 | 2026-09-30 | Guide — [Extern](https://www.extern.com/post/duolingo-internship-guide) |
| Duolingo Thrive SWE | Summer 2026 | null | 2025-09-29 | Guide — [Extern](https://www.extern.com/post/duolingo-internship-guide) |
| Salesforce Tech Launchpad | Summer 2026 | null (info session 2026-01-22) | 2026-02-22 | Primary partner page — [CodePath](https://info.codepath.org/futureforce-tech-launchpad) |
| AFE India | 2025-29 cohort | 2025-08-18 | 2025-11-30 | Primary — [Amazon press](https://press.aboutamazon.com/in/news/community/2025/8/amazon-program-to-empower-indias-women-in-tech-announces-500-more-scholarships) |
| AFE US | 2027 | 2026-11-03 | 2027-01-05 | Primary — [AFE](https://www.amazonfutureengineer.com/scholarships) |
| Bloomberg First Year Insights | 2024 | null | 2024-03-01 | University notice — [Morehouse](https://careerdevelopment.morehouse.edu/blog/2024/02/13/bloomberg-early-engagement-opportunities/) |
| Bloomberg Academy Singapore | 2026 | null | 2026-05-10 | University listing, via search — [NUS](https://nus.edu.sg/cfg/events/details/1061e06b410b262dbc0e0915b22dd6cb) |
| GSoC | 2026 | 2026-03-16 | 2026-03-31 | Primary, via search — [GSoC timeline](https://developers.google.com/open-source/gsoc/timeline) |

- Date conflict, Google ASD India close: Prosple says "Apply by 14 Jan 2026" (search snippet); an Unstop listing is shown as closed with a January 1, 2026 date (search summary) — [Prosple](https://in.prosple.com/graduate-employers/google-india/jobs-internships/associate-software-developer-intern); [Unstop](https://unstop.com/internships/associate-software-developer-internship-google-1611454). Neither page could be read in full.
- Date conflict, Explore 2nd-yr US: Global South Opportunities gives the Nov-Feb rule for the first-year role only; do not apply it to second-year — [GSO](https://www.globalsouthopportunities.com/2026/11/02/microsoft-6/)
- Date conflict, AFE India press date: the fetched Amazon page is dated May 29, 2026, while a search summary said April 29, 2026. I use the page — [Amazon press](https://press.aboutamazon.com/in/2026/5/amazon-future-engineer-program-expands-to-2-200-scholars-with-500-new-scholarships-for-women-in-computer-science)
- Date note: Microsoft India's general Software Engineering Intern for summer 2027 was posted 2026-09-18 and gone by 2026-10-30. Talentd says the summer 2026 posting was live in November 2025, so India timing moved about two months earlier — [Talentd](https://www.talentd.in/articles/microsoft-software-engineering-internship)

### Inferences
- All projections are in the records below and are labelled PROJECTION. They extrapolate from the rows above and are not announced dates.
- Because Microsoft India's main intern posting moved earlier this year, the India Explore projection is deliberately wide.

### Gaps
- No open or close dates found for: Capital One TEIP/AEIP, Amazon Propel after 2022, UberSTAR, Palantir Launch, Bloomberg First Year Insights after 2024.
- Only one reliable data point exists for most India rows, so those projections are low to medium confidence.

## Verified per-program records

### Takeaway
Open today for an underclass student: Explore first-year (US, Canada, Mexico only), AFE India (banner says open), AFE US (high-school seniors, so not undergraduates). Most likely next India-eligible opening: Explore second-year and Google ASD Intern, both projected December 2026 to March 2027.

### Cited Findings

The field `status` uses the requested four values. Where a summer 2027 window has already closed, status is "expected" and refers to the next cycle, with the closure stated.

#### Microsoft
**1. Explore Microsoft, first-year track**
- org: Microsoft | category: internship | years: 1st only | region: US (12 weeks, Redmond posting); applicants from US, Canada, Mexico
- Indian universities: **no**. "first year of a bachelor's degree program in the United States, Canada, or Mexico"
- status 2026-27: **open now** (live in API; applyAction not closed; window is first week of each month)
- last known: posted 2026-11-02; close rule "first week of each month from November through February, or until all positions are filled"
- projected next: PROJECTION: Dec 1-7 2026, Jan 1-7 2027, Feb 1-7 2027 if not filled; calendar days are my reading of "first week"
- stipend: USD 25.96-47.77/hr; 37.58-54.04/hr in SF Bay Area and NYC
- official: https://apply.careers.microsoft.com/careers/job/1970393556925823
- sources: [posting](https://apply.careers.microsoft.com/careers/job/1970393556925823); [API](https://apply.careers.microsoft.com/api/pcsx/position_details?position_id=1970393556925823&domain=microsoft.com&hl=en); [program page](https://careers.microsoft.com/v2/global/en/exploremicrosoft)
- confidence: high

**2. Explore Microsoft, second-year track, US**
- org: Microsoft | category: internship | years: 2nd only | region: US, 12 weeks
- Indian universities: see record 3 (India has its own posting)
- status: **expected** (Oct 2026 window closed; posting returns 404 in API on Nov 6; a Nov or Dec reopening is unconfirmed)
- last known: open 2026-10-01, closed by 2026-10-09 (guide)
- projected next: PROJECTION: Dec 1-7 2026 if seats remain, per the reported Oct-Dec rule
- stipend: USD 25.96-47.77/hr (guide)
- official: https://careers.microsoft.com/v2/global/en/exploremicrosoft
- sources: [Extern](https://www.extern.com/post/microsoft-explore-internship-guide); [API 404](https://apply.careers.microsoft.com/api/pcsx/position_details?position_id=1970393556925816&domain=microsoft.com&hl=en)
- confidence: medium

**3. Explore Microsoft, second-year track, India**
- org: Microsoft | category: internship | years: 2nd only (official pages conflict, see India section) | region: India, "various India campuses"; Bangalore reported, Hyderabad in a 2025 Unstop listing title
- Indian universities: **yes**. "second year of a bachelor's degree program in the United States, Canada, Mexico or India"
- status: **expected** (no India Explore posting in API on Nov 6; other India intern roles are live: Product Design, Applied Sciences, Research Sciences, Product Management, Security Research)
- last known: live December 2025 for summer 2026, close null; summer 2025 deadline 2025-03-09 (snippet)
- projected next: PROJECTION: opens December 2026 to February 2027, closes by about March 2027, low-medium confidence
- stipend: not published; about Rs 1,25,000/month reported by Analytics Insight via Talentd (unverified). Duration conflict: 8 weeks on Microsoft's page, 12 weeks in the India posting per Talentd
- official: https://careers.microsoft.com/v2/global/en/exploremicrosoft
- sources: [program page](https://careers.microsoft.com/v2/global/en/exploremicrosoft); [eligibility page](https://careers.microsoft.com/v2/global/en/internship_eligibility); [Talentd](https://www.talentd.in/articles/microsoft-software-engineering-internship); [Prosple](https://in.prosple.com/graduate-employers/microsoft-india/jobs-internships/explore-program-internship-second-year-students); [search API India](https://apply.careers.microsoft.com/api/pcsx/search?domain=microsoft.com&query=intern&location=India&start=0&num=30)
- confidence: high that the track exists and includes India; medium on timing

**4. Microsoft Discovery Program**
- org: Microsoft | category: internship | years: pre-college ("rising first-year college students"); 4 weeks | region: Redmond or Atlanta
- Indian universities: **unclear**, effectively no: "open to rising first-year college students, based in Redmond, Washington or Atlanta, Georgia"
- status: unclear | last known: null / null | projected: null | stipend: null
- official and source: [Microsoft students](https://careers.microsoft.com/v2/global/en/students)
- confidence: medium that it is listed; low on everything else

**5. Microsoft Engage (India)**
- org: Microsoft | category: community (mentorship) | years: null | region: India
- Indian universities: yes historically
- status: **paused or discontinued**. Talentd found "no edition after 2022"; absent from Microsoft's students page
- last known: 2022 edition, dates null | projected: null | stipend: null
- official: null | source: [Talentd](https://www.talentd.in/articles/microsoft-software-engineering-internship)
- confidence: medium

#### Google
**6. Google STEP (brand)**
- org: Google | category: internship | years: 1st and 2nd historically; 2nd only in India per guides | region: global historically
- Indian universities: historically yes; no current posting to quote. A 2025 notice said "second year of their university studies" (aggregator)
- status: **paused or discontinued** in practice; no announcement exists
- last known: India close 2024-12-15 (aggregators); EMEA close 2024-10-25 (guide); opens null
- projected: null, no basis to project the brand
- stipend: null
- official: https://buildyourfuture.withgoogle.com/programs/step (redirects to careers home)
- sources: [Extern](https://www.extern.com/post/google-step-program-guide); [Google search 0 results](https://www.google.com/about/careers/applications/jobs/results?q=%22STEP%22&target_level=INTERN_AND_APPRENTICE)
- confidence: high on no posting and on the redirect; medium on "discontinued"

**7. Google Associate Software Developer Intern (India)**
- org: Google | category: internship | years: 2nd only | region: India (Bengaluru, Hyderabad, Pune)
- Indian universities: **yes** for the 2026 role. "intended for 2nd year students who are pursuing an Engineering degree program in Computer Science or a related field"
- status: **expected** (nothing posted Nov 6; last year's posting appeared in mid-December). If nothing appears by end January 2027, change to paused
- last known: about 2025-12-16 to 2026-01-14 (close conflicts with an Unstop date of 2026-01-01)
- projected next: PROJECTION: opens late November to late December 2026, closes late December 2026 to mid January 2027, for a May 2027 start
- stipend: not stated by Google; Rs 4-6 LPA is a third-party estimate (unverified)
- official: https://www.google.com/about/careers/applications/jobs/results?q=%22Associate%20Software%20Developer%22
- sources: [AnitaB mirror](https://jobs.anitab.org/companies/google-24698/jobs/63713505-associate-software-developer-intern-2026-english); [Prosple](https://in.prosple.com/graduate-employers/google-india/jobs-internships/associate-software-developer-intern); [Placement Officer](https://www.placement-officer.com/2025/12/google-internship-2026-associate.html)
- confidence: high that the 2026 role existed; low-medium that it repeats

**8. Google Associate Software Developer Intern (Australia)**
- org: Google | category: internship | years: 2nd only | region: Sydney
- Indian universities: **no** in practice: "this role is not eligible for immigration sponsorship"
- status: unclear (no 2026 data found) | last known: 2025-04-28 to 2025-05-23 | projected: PROJECTION: April to May 2027, low confidence | stipend: null
- official: null (posting gone) | source: [AnitaB mirror](https://jobs.anitab.org/companies/google-24698/jobs/49923352-associate-software-developer-intern-2025)
- confidence: medium

**9. Google Summer of Code**
- org: Google | category: community | years: any year, students not required | region: worldwide except embargoed countries
- Indian universities: **yes**. Official FAQ: 18+, non-embargoed country, limited prior open-source experience (paraphrase)
- status: **expected** (no 2027 dates published)
- last known: 2026-03-16 to 2026-03-31
- projected next: PROJECTION: mid to late March 2027
- stipend: Rs 71,250 to Rs 2.85 lakh for India per Leap Scholar (unverified)
- official: https://summerofcode.withgoogle.com/
- sources: [timeline](https://developers.google.com/open-source/gsoc/timeline); [FAQ](https://developers.google.com/open-source/gsoc/faq?authuser=7); [Leap Scholar](https://leapscholar.com/blog/?p=82099)
- confidence: high on eligibility and last dates

#### Meta
**10. Meta University**
- org: Meta | category: internship | years: 1st and 2nd ("aimed at freshmen and sophomores") | region: US
- Indian universities: **no**, moot since closed. No India wording found
- status: **paused or discontinued**
- last known: dates null; final class confirmed by April 2025; last listing seen for summer 2025
- projected: null | stipend: null
- official: null
- sources: [Work Shift](https://workshift.org/with-meta-universitys-closure-a-sign-of-changing-times-in-tech/); [Huzzle listing](https://www.huzzle.com/internships/meta-university-engineering-summer-2025-394002)
- confidence: high

#### Amazon
**11. Amazon Propel Program**
- org: Amazon | category: internship | years: unclear; sources conflict | region: US
- Indian universities: **unclear**, no India evidence found
- status: **unclear**. No standalone posting. A "propel" search on amazon.jobs gives 114 hits; the 20 inspected were unrelated, matching the ordinary word. An Amazon SDE posting reportedly lists Propel in the Summer cycle via the standard SDE application
- last known: dedicated listing for Summer 2022; dates null
- projected: null | stipend: null
- official: null
- sources: [amazon.jobs search](https://www.amazon.jobs/en/search.json?base_query=propel&result_limit=20); [amazon.jobs posting](https://amazon.jobs/jobs/2808739); [Handshake 2022](https://longwood.joinhandshake.com/jobs/5422621/share_preview); [Extern, "No posting found" Oct 8](https://www.extern.com/post/2027-underclassmen-cs-internships-guide)
- confidence: low

**12. Amazon Future Engineer scholarship, US**
- org: Amazon | category: scholarship | years: not undergraduate; high-school seniors | region: US
- Indian universities: **no**. "Be a high school senior in the U.S."
- status: **open now** (for high-school seniors only)
- last known: 2026-11-03 to 2027-01-05 | projected: PROJECTION: November 2027 to January 2028 | stipend: null (amount not captured)
- official and source: [AFE Scholarships](https://www.amazonfutureengineer.com/scholarships)
- confidence: high

**13. Amazon Future Engineer scholarship, India**
- org: Amazon | category: scholarship | years: 1st only (inferred from "2025-2029 academic cycle" wording) | region: India
- Indian universities: **yes**, for women from low-income backgrounds. "female students pursuing B.E. or B.Tech degrees in computer science or allied branches, from low-income backgrounds"
- status: **open now**, medium confidence. Homepage says "Applications to Amazon Future Engineer Scholarships are open !" but gives no date, and this could be a stale banner
- last known: 2025-08-18 to 2025-11-30. 2026 window: null officially; aggregators say 2026-12-31 (unverified)
- projected next: PROJECTION: closes between late November and end December 2026
- stipend: Rs 2 lakh over four years, laptop, bootcamps, paid Amazon internships, mentorship
- official: https://www.amazonfutureengineer.in/
- sources: [press May 2026](https://press.aboutamazon.com/in/2026/5/amazon-future-engineer-program-expands-to-2-200-scholars-with-500-new-scholarships-for-women-in-computer-science); [press Aug 2025](https://press.aboutamazon.com/in/news/community/2025/8/amazon-program-to-empower-indias-women-in-tech-announces-500-more-scholarships); [AFE India](https://www.amazonfutureengineer.in/); [Buddy4Study](https://www.buddy4study.com/scholarship/amazon-future-engineer-scholarship-programme-2026)
- confidence: high that the program runs; medium on status

#### NVIDIA
**14. NVIDIA Ignite**
- org: NVIDIA | category: internship | years: 1st and 2nd: "current freshmen and sophomores" | region: US, Santa Clara, 12 weeks on-site
- Indian universities: **no**. "pursuing a bachelor's degree at a four-year university in the United States" (via guide)
- status: **expected** (summer 2027 window closed; posting page shows "The page you are looking for doesn't exist" in browser)
- last known: 2026-10-05 to 2026-10-18; prior 2025-10-06 to 2025-10-19
- projected next: PROJECTION: about Oct 4-17, 2027
- stipend: USD 20-56/hr, relocation and housing support (guide; 2026 posting was USD 18-54)
- official: https://www.nvidia.com/en-us/about-nvidia/careers/university-recruiting/
- sources: [NVIDIA](https://www.nvidia.com/en-us/about-nvidia/careers/university-recruiting/); [Extern](https://www.extern.com/post/nvidia-ignite-program-guide)
- confidence: high on program and years; medium on exact dates (no primary date source)

#### Apple
**15. Apple (no dedicated program found)**
- org: Apple | category: internship | years: any year of a degree | region: not assessed
- Indian universities: **unclear**. "We're open to those enrolled full-time and pursuing a bachelor's degree, master's degree, or doctorate". No India wording on the page
- status: **unclear**, no first/second-year program exists on the student page
- last known: null | projected: null | stipend: null
- official and source: [Apple students](https://www.apple.com/careers/us/work-at-apple/students.html)
- confidence: medium

#### Uber
**16. UberSTAR**
- org: Uber | category: internship | years: conflicting; US sources say freshmen and rising sophomores, Indian aggregators say pre-final and final year | region: US historically; expansion to India and Europe reported
- Indian universities: **unclear**. A 2025 Bangalore listing said "Open only to the UberShe++ shortlisted participants" (aggregator summary)
- status: **unclear**, leaning discontinued in US. uber.com/careers/uberstar returns 404; the Emerging Talent page lists no UberSTAR program but still shows UberSTAR intern stories; Extern reported no 2027 posting on Oct 8
- last known: Villanova table says an August to November window (undated); exact dates null
- projected: null | stipend: "upto Rs 1L/month" for 2025 per an aggregator title (unverified)
- official: https://jobs.uber.com/en/teams/emerging-talent/
- sources: [Uber Emerging Talent](https://jobs.uber.com/en/teams/emerging-talent/); [old URL, 404](https://www.uber.com/us/en/careers/uberstar/); [Extern](https://www.extern.com/post/internships-for-freshmen-in-college-2027); [Villanova](https://connections.villanova.edu/resources/sophomore-programs-in-tech/); [Talentd job](https://talentd.in/jobs/uber-is-hiring-for-software-engineering-uberstar-internship-2025-stipend-upto-rs-1l-month)
- confidence: low

**17. Uber Career Prep**
- org: Uber | category: fellowship | years: "undergraduate engineering students"; exact years not visible | region: virtual; a location criterion exists but its text is not in HTML
- Indian universities: **unclear**
- status: **unclear**. Page live, no dates
- last known: null | projected: null | stipend: none: "an unpaid fellowship"
- official: https://jobs.uber.com/en/teams/emerging-talent/careerprep/
- sources: [Uber](https://jobs.uber.com/en/teams/emerging-talent/careerprep/); [Hidden Genius Project](https://www.hiddengeniusproject.org/ubercareerprep/)
- confidence: medium that it is listed; low on activity

#### Bloomberg
**18. Bloomberg First Year Insights and early programs**
- org: Bloomberg | category: insight | years: 1st only for First Year Insights; other named programs not year-specific | region: US (New York, virtual) in 2024; Academy in Singapore
- Indian universities: **unclear**, no India wording. The Singapore Academy needs Singapore work authorization
- status: **unclear**. Official page says "Look out for events and programs like: Bloomberg Launch, First Year Insights, HBCU/HSI Summit(s), Tech Labs, and Engineering Accelerator", with no dates; no 2027 listing per Extern
- last known: First Year Insights close 2024-03-01; sophomore externship 2024-03-01 and March 15 (2023); Academy Singapore close 2026-05-10
- projected next: PROJECTION: First Year Insights February to March 2027, low confidence
- stipend: null
- official: https://www.bloomberg.com/company/early-careers/student-programs/
- sources: [Bloomberg](https://www.bloomberg.com/company/early-careers/student-programs/); [Morehouse](https://careerdevelopment.morehouse.edu/blog/2024/02/13/bloomberg-early-engagement-opportunities/); [NUS](https://nus.edu.sg/cfg/events/details/1061e06b410b262dbc0e0915b22dd6cb)
- confidence: medium that it is listed; low on dates

#### Duolingo
**19. Duolingo Thrive**
- org: Duolingo | category: internship | years: 2nd only ("second-year undergraduate") | region: US, Pittsburgh for SWE
- Indian universities: **unclear**, no official wording seen. "Duolingo does not offer remote internships" (guide)
- status: **expected** (SWE closed 2026-09-30; 0 Thrive titles among 57 Greenhouse jobs on Nov 6). Product Design and Studio Art Thrive appeared in early November last cycle, so they may still post
- last known: 2026-09-15/16 to 2026-09-30; prior close 2025-09-29
- projected next: PROJECTION: SWE mid to late September 2027; Design/Art tracks November 2026
- stipend: USD 43-45/hr plus USD 1,000/month housing (guide citing Levels.fyi, Summer 2025 data)
- official: https://careers.duolingo.com/thrive
- sources: [Greenhouse API](https://boards-api.greenhouse.io/v1/boards/duolingo/jobs?content=true); [Extern](https://www.extern.com/post/duolingo-internship-guide); [Extern sophomore guide](https://www.extern.com/post/sophomore-internships-2027-guide)
- confidence: medium-high

#### Palantir
**20. Palantir Path**
- org: Palantir | category: internship | years: historically Bachelor's students new to CS | region: US
- Indian universities: **unclear**, moot
- status: **paused or discontinued**. Only listing found was for Summer 2019; not among 311 Lever postings
- last known: null | projected: null | stipend: null
- official: null
- sources: [Built In NYC](https://www.builtinnyc.com/job/internship/palantir-path/43089); [Lever API](https://api.lever.co/v0/postings/palantir?mode=json)
- confidence: medium-high

**21. Palantir Launch**
- org: Palantir | category: insight | years: not first/second-year in recent listings; UK cycle wanted 2027 graduates, US cycle 2026 graduates | region: UK and US
- Indian universities: **no** on available wording: UK listing "at a UK university", US listing "accredited US university"
- status: **unclear**. Not on Lever on Nov 6; spring programs may post later
- last known: null | projected: null | stipend: null
- official: https://www.palantir.com/careers/students-and-early-talent
- sources: [Lever API](https://api.lever.co/v0/postings/palantir?mode=json); [Garys Guide](https://www.garysguide.com/jobs/459g6dt/Palantir-Launch-Spring-Program-at-Palantir-London-UK); [The Rundown mirror](https://jobs.therundown.ai/jobs/77155762-palantir-launch-spring-program)
- confidence: low-medium
- note: Palantir's regular SWE intern says "Must be planning on graduating in 2028". American Tech Fellowship (open through 2026-12-11) and Meritocracy Fellowship are on Lever but are not underclass programs.

#### Capital One
**22. Capital One Early Internship Program (Technology and Analyst)**
- org: Capital One | category: internship | years: 2nd only per program page: "designed for second-year undergraduate students". The students page says "earning a bachelor's degree between August 2029 and August 2030", which would also cover first-years; this is an unresolved conflict | region: US, McLean, 10 weeks
- Indian universities: **unclear**, no wording; location is "our McLean office"
- status: **expected** for TEIP (no summer 2027 posting as of Oct 8 per guide); AEIP summer 2027 reported posted and closed
- last known: null / null | projected: null, no date history | stipend: "10-week paid"; amount null
- official: https://www.capitalonecareers.com/early-internships-program
- sources: [program page](https://www.capitalonecareers.com/early-internships-program); [students page](https://www.capitalonecareers.com/students); [Extern](https://www.extern.com/post/internships-for-freshmen-in-college-2027)
- confidence: medium

#### Atlassian
**23. Atlassian Early Careers**
- org: Atlassian | category: internship | years: not 1st or 2nd: "penultimate year" | region: global, including India
- Indian universities: **yes for the regular intern**, but not at 1st or 2nd year of a 4-year degree. "India Recruiting Period: July - December Summer Internship: May - August"
- status: unclear for underclass: **no such program found**
- last known: null specific; recruiting period as above | projected: PROJECTION: July to December 2027 (penultimate-year intern only) | stipend: "full-time, paid"
- official and source: [Atlassian](https://www.atlassian.com/company/careers/earlycareers)
- confidence: high that there is no underclass track on this page

#### Datadog
**24. Datadog Early Careers**
- org: Datadog | category: internship | years: no first/second-year program found | region: US, France, Spain in current intern postings
- Indian universities: **unclear**; no India intern titles among 399 Greenhouse jobs
- status: unclear; **no such program found**. Software Engineering Intern roles first published 2026-09-08
- last known: null | projected: null | stipend: null
- official: https://careers.datadoghq.com/early-careers/
- sources: [Datadog](https://careers.datadoghq.com/early-careers/); [Greenhouse API](https://boards-api.greenhouse.io/v1/boards/datadog/jobs)
- confidence: medium-high

#### Salesforce
**25. Futureforce Tech Launchpad (with CodePath)**
- org: Salesforce / CodePath | category: internship (paid pre-internship) | years: 2nd only ("rising college juniors"; "Bachelor's graduation year: 2028" for 2026) | region: US, San Francisco
- Indian universities: **no**. "at a US college or university"
- status: **expected** (page still shows 2026 and a waitlist)
- last known: close 2026-02-22; open null; program June 1 to August 7, 2026
- projected next: PROJECTION: opens about January 2027, closes about late February 2027, graduation year 2029
- stipend: "Relocation stipend and paid learning experience"
- official: https://info.codepath.org/futureforce-tech-launchpad
- sources: [CodePath](https://info.codepath.org/futureforce-tech-launchpad); [Salesforce](https://www.salesforce.com/company/careers/university/internships/)
- confidence: high on rules; medium on projection

#### Similar programs found (leads, secondary sources only, not checked on employer sites)
**26. Visa 2027 Sophomore Internship Program:** org Visa; internship; 2nd only; US, five cities; Indian universities unclear; status open now per guide (reposted 2026-10-27; Highlands Ranch requisition ending 2026-11-05); USD 39-50/hr; confidence low-medium — [Extern](https://www.extern.com/post/sophomore-internships-2027-guide)

**27. SAP STAR (Technical Focus), Spring/Summer 2027:** org SAP; internship; years not verified; Newtown Square, PA; Indian universities unclear; status open per tracker; no deadline; confidence low — [SAP posting](https://careers.sap.com/job/Newtown-Square-SAP-Student-Training-and-Rotation-%28STAR%29-Program-Technical-Focus-SpringSummer-2027Newtown-Square-PA-19073/1430469433/); [tracker](https://github.com/Jose-Gael-Cruz-Lopez/underclassmen-opportunities)

**28. Jane Street FTTP:** org Jane Street; insight; first-year per guide; New York (Mar 21-25, 2027, apply by 2027-01-31) and London (apply by 2027-01-03); Indian universities unclear; status open now per tracker; confidence medium — [NY application](https://www.janestreet.com/apply-fttp-nyc/); [London application](https://www.janestreet.com/apply-fttp-ldn/); [Extern](https://www.extern.com/post/sophomore-internships-2027-guide)

**29. Citadel / Citadel Securities Discover:** org Citadel; insight; early-year per guides; US apply by 2027-03-05, EMEA by 2027-01-29, Hong Kong by 2027-02-14; Indian universities unclear; status open now per tracker; confidence medium — [Discover EMEA](https://www.citadel.com/careers/programs-and-events/discover-citadel/emea-apply/); [tracker](https://github.com/Jose-Gael-Cruz-Lopez/underclassmen-opportunities)

**30. Snap Academies:** org Snap; internship; aimed at community-college students and recent transfers; US; Indian universities no in practice; dates null; status unclear; confidence low — [Extern](https://www.extern.com/post/sophomore-internships-2027-guide)

### Inferences
- A tentative pattern across these records: several early-year programs (Meta University, STEP in North America, UberSTAR, Propel) have vanished or gone quiet since 2025, while others defined mainly by year of study (Explore, Ignite, Capital One) continue. Students on Reddit link this to DEI policy changes; only Work Shift's framing of Meta supports it, and no company has said so — [Extern](https://www.extern.com/post/internships-for-freshmen-in-college-2027).

### Gaps
- Apple's Swift Student Challenge, LinkedIn CoachIn, Goldman Sachs, Walmart CodeHers and similar India-specific programs were not verified here; the one search that targeted several India programs returned only Adobe material, including an unverified 2026 listing for the Adobe India Women-in-Technology Scholarship.
- Salary and stipend figures sourced to guides were not confirmed on employer pages.

## Can a simple bot fetch each official page?

### Takeaway
Best sources are JSON APIs, not career pages: Microsoft, Greenhouse and Lever all work with plain HTTP. Google Careers search is server-rendered. NVIDIA Workday, Uber's API and Duolingo's and Palantir's pages need a browser or an alternative source.

### Cited Findings
All findings below come from my own raw fetches on 2026-11-06.

| Source | Result | Bot-friendly? |
|---|---|---|
| [Microsoft Explore page](https://careers.microsoft.com/v2/global/en/exploremicrosoft) | 200, FAQ text in HTML | Yes, but its job widget shows unrelated jobs (two Senior SWE, one Consulting) under "Explore Program internships". Do not treat those as Explore openings |
| [Microsoft job API](https://apply.careers.microsoft.com/api/pcsx/search?domain=microsoft.com&query=Explore%20Program&location=&start=0&num=20) | 200 JSON; 404 JSON when a job closes | Yes, best signal. The job HTML page is about 690 KB of embedded config, with the posting text inside it; a closed job still returns 200 with a blank title |
| [Google Careers search](https://www.google.com/about/careers/applications/jobs/results?q=%22STEP%22&target_level=INTERN_AND_APPRENTICE) | 200, results and "N jobs matched" in HTML | Yes |
| [Google Build Your Future](https://buildyourfuture.withgoogle.com/programs/step) | 200 but only title "BuildYourFuture"; redirect happens in JS | No. A bot sees 200 and misses the redirect |
| [Lever API, Palantir](https://api.lever.co/v0/postings/palantir?mode=json) | 200 JSON | Yes |
| [Palantir students page](https://www.palantir.com/careers/students-and-early-talent) | 200, about 59 characters of text | No, JS-only |
| [Greenhouse API, Duolingo](https://boards-api.greenhouse.io/v1/boards/duolingo/jobs?content=true) and [Datadog](https://boards-api.greenhouse.io/v1/boards/datadog/jobs) | 200 JSON | Yes |
| [Duolingo Thrive page](https://careers.duolingo.com/thrive) | "You need to enable JavaScript" | No |
| [NVIDIA university page](https://www.nvidia.com/en-us/about-nvidia/careers/university-recruiting/) | 200, Ignite text in HTML | Yes for text, no dates |
| [NVIDIA Workday](https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/job/NVIDIA-2027-Ignite-Internships--Software-Engineering_JR2026958) | JSON endpoint 403 "permission denied"; HTML empty via fetch | No (note: the test was on a posting that had already closed) |
| [amazon.jobs search JSON](https://www.amazon.jobs/en/search.json?base_query=propel&result_limit=20) | 200 JSON | Yes, but keyword matches are noisy |
| [AFE scholarships](https://www.amazonfutureengineer.com/scholarships) | 200, dates in HTML | Yes |
| [Uber Emerging Talent](https://jobs.uber.com/en/teams/emerging-talent/) | 200, partial text; eligibility text missing | Partial. Uber jobs API returned 403 |
| [Capital One](https://www.capitalonecareers.com/early-internships-program) | 200, text in HTML | Yes |
| [Bloomberg student programs](https://www.bloomberg.com/company/early-careers/student-programs/) | 200, text in HTML | Yes, no dates |
| [Atlassian](https://www.atlassian.com/company/careers/earlycareers), [Salesforce](https://www.salesforce.com/company/careers/university/internships/), [CodePath](https://info.codepath.org/futureforce-tech-launchpad), [Apple](https://www.apple.com/careers/us/work-at-apple/students.html) | 200, text in HTML | Yes |
| [Meta Careers](https://www.metacareers.com/careerprograms/pathways/metauniversity) | 404, empty body | Unknown, may be bot-blocked |
| Prosple, windowsforum | 403 in WebFetch | No |

### Inferences
- A watcher should treat "HTTP 200" as meaningless on JS pages (Google Build Your Future is the proof) and should detect closure from API 404s or missing job IDs.

### Gaps
- Fetchability was tested once with one user agent. Rate limits and terms of service were not assessed.
