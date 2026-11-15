# Competitor sources (checked 2026-11-15)

Opurnos already reads Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Amazon, SimplifyJobs, Hacker News, Remote OK, Devpost, MLH, Devfolio, ETHGlobal, HackerEarth, Hack Club, Unstop, GSoC, Outreachy, Codeforces, CodeChef, AtCoder, and a few RSS feeds.

## What the other boards actually pull

Public ATS widget APIs, documented and rechecked in October 2026 by [Mersetti's ATS Job Board APIs](https://github.com/Mersetti/ats-job-board-apis), and used by boards such as [ashby-job-scraper](https://github.com/rishilahoti/ashby-job-scraper) and [interninbox](https://github.com/hiratinspace/interninbox):

| ATS | Endpoint | In Opurnos |
|---|---|---|
| Greenhouse, Lever, Ashby, Workday, SmartRecruiters | existing connectors | yes |
| Workable | `GET https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true` | yes, Hugging Face (6 live jobs on 2026-11-15) |
| Recruitee | `GET https://{slug}.recruitee.com/api/offers/` | yes, bunq |
| Rippling | `GET https://ats.rippling.com/api/v2/board/{slug}/jobs?page=N` | yes, Rippling's own board |
| Personio | XML at `{slug}.jobs.personio.de/xml` | not yet |
| Breezy HR | `{slug}.breezy.hr/json` (no descriptions) | not yet |
| Teamtailor | `{domain}/jobs.rss` | only when someone adds the feed as a watched site |

simplytk tracks official career pages for UK spring weeks and India internships, then alerts on WhatsApp. It does not publish a scrape API. The early-career portal already holds those seasonal programs. LinkedIn, Internshala, and Wellfound are login-walled or forbid this kind of collection, so they are not connectors.

## Left alone on purpose

- Internshala and Naukri: bot walls, and the listings are not a public JSON API.
- Wellfound: the startup board sits behind their own terms and a session.
- LinkedIn: against its terms. The product already refuses LinkedIn automation.
