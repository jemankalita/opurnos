# Opurnos

**Never miss the one that matters.** Opurnos is an agent that keeps watch over hackathons, fellowships, scholarships, research positions, internships and jobs. It checks each one against *your* resume and cites its evidence, then emails you the few worth your time. It also helps you apply. Every claim in your application is checked against what you've actually done, and nothing is submitted until you approve it.

Built for the **Meta Global AI Developer Hackathon** (Indie track, theme *Build for Your World*) on the **Meta Model API**: Muse Spark 1.3 for reasoning and Muse Wonder 1.0 for computer use.

> Not a job board. A chief of staff for your ambitions.

---

## What it does

1. **Drop your resume.** Muse Spark reads the PDF directly (structured output) and builds your profile: education, experience, projects, skills, work authorisation. You confirm it and choose what you care about.
2. **The radar fills.** Opurnos watches 92 live sources, plus 15 official pages it checks daily and flags when new dates go up: seasonal Indian programs, the PM Internship Scheme, NATS apprenticeships, PSU hiring through GATE (POWERGRID, NPCIL, ISRO) and the GATE 2027 exam, with a focus on India: Codeforces and CodeChef contests, hackathons (Devpost, MLH, Devfolio, ETHGlobal, HackerEarth, Unstop, Hack Club), programs (Google Summer of Code, Outreachy, and a hand-checked list of fellowships, scholarships and accelerators), and early-career roles (two community internship lists, SimplifyJobs new grad, Amazon, Workday career sites such as NVIDIA, Adobe and Intel, HN Who is hiring, Remote OK, Unstop internships and jobs with stipend or salary, 60+ Greenhouse/Lever/Ashby boards including Indian companies such as Sarvam AI, CRED, Groww and Zeta, SmartRecruiters India roles at Swiggy, Bosch and ServiceNow, and Indian scholarship and fresher-job feeds). A **web scout** also uses Muse Spark's `web_search` grounding to find long-tail fellowships and scholarships, and keeps only the leads that come with a real citation.
   **Watch any website.** In Settings, paste a careers page, an events page or a fellowships feed. Opurnos previews what it finds and then checks the site on every scan. It needs no AI: it reads the schema.org `JobPosting`/`Event` data that sites publish for search engines, follows links to Greenhouse, Lever or Ashby boards, or falls back to the site's RSS feed. It respects robots.txt and refuses private-network addresses.
3. **Every match is explained.** Opurnos extracts hard eligibility rules from each listing (degree, graduation year or batch, country, sponsorship, students-only, and the cutoffs Indian drives use: CGPA or percentage, "throughout" Class 10 and 12, active backlogs, branch, a GATE score for PSU roles, and years of experience, so a "fresher" role that asks for 2+ years is called out) and checks them against you. **Listings that ask applicants for money** (a registration fee, a refundable deposit, a UPI handle) are flagged as likely scams, kept out of the digest, and shown with a warning and the 1930 cybercrime helpline. Paid roles show how their pay compares with similar open listings. The quote from the listing sits next to the fact from your profile. A transparent score shows exactly why each opportunity ranks where it does.
4. **A digest you'll actually read.** A daily or weekly email, in English or Hindi, lists the new picks. Deadlines of everything you save sync to Google, Apple or Outlook calendar through a private feed, with a reminder the day before. Each has a signed, single-use, 72-hour **Apply now** link.
5. **Apply Studio.** Opurnos tailors your summary, bullets, cover letter and answers. The **Truthfulness Verifier** then checks every factual claim against your resume. Anything it can't back up is blocked until you fix it or explicitly stand behind it.
6. **The agent fills, you submit.** On Greenhouse, Lever and Ashby, Muse Wonder drives a real browser to fill the form while you watch. It stops on the review page, and a guard in the code refuses any agent click on a submit button. You review every field and press submit yourself. On any other site, you get everything ready to paste.
7. **Ask for a referral.** For jobs and internships, Opurnos links to alumni of your college at the company and drafts a connection note (within LinkedIn's 300-character limit) and a follow-up message from your real profile. You send it yourself.
8. **Pipeline.** A kanban board shows everything in flight. Applications sent through Opurnos move on their own.

## The agent graph

| Agent | Model | In → Out |
|---|---|---|
| Profile Parser | `muse-spark-1.3` (PDF input, strict JSON schema) | resume PDF → `Profile` |
| Source connectors | deterministic | public ATS and listing APIs → raw opportunities |
| Rule Extractor | `muse-spark-1.3-contributor` (public listing text only) | listing → eligibility rules |
| Web Scout | `muse-spark-1.3` + `web_search` | profile → cited leads (uncited leads dropped) |
| Triage | deterministic | profile × thousands of listings → top 150 by keyword fit, with closed and senior roles removed |
| Hard-rule check | deterministic | rules × profile → verdict + evidence |
| Eligibility Judge | `muse-spark-1.3` | profile × listing → verdict, fit, value, why, gaps |
| Ranker | deterministic | `100 × (.35 fit + .25 eligibility + .15 urgency + .15 value + .10 your taste)`; ineligible or closed opportunities capped at 25 |
| Tailor | `muse-spark-1.3` | profile + listing → summary, bullets, cover letter, answers |
| Truthfulness Verifier | `muse-spark-1.3` (separate judge call) | tailored text × resume → each claim marked `supported / rephrased / unsupported` |
| Apply Agent | `muse-wonder-1.0` computer use | approved materials + form → filled form, paused before submit |

Resumes and personal data only ever go to `muse-spark-1.3`. The cheaper contributor model only sees public listing text. The server enforces a per-user daily model budget (`DAILY_LLM_BUDGET_USD`) and apply cap (`DAILY_APPLY_CAP`). Every call is logged with its tokens and cost, which you can see in Settings.

**Demo mode.** Without a `MODEL_API_KEY`, every agent falls back to a deterministic heuristic, and the UI says so. The fallbacks are:
- a section-aware resume parser
- a regex rule extractor
- a keyword judge
- a tailor that reuses your resume bullets
- a verifier that checks numbers and word overlap
- a rule-based form filler

The whole product works end to end offline.

## Architecture

```
Browser ──▶ Next.js 16 app (Vercel)                         Apply worker (Docker, long-running)
            ├─ pages: landing · onboarding · radar ·        ├─ POST /run {applicationId, phase}
            │   opportunity · Apply Studio · pipeline ·     ├─ Playwright + Chromium
            │   settings                                    └─ Muse Wonder screenshot→action loop
            ├─ /api/*  route handlers (zod-validated)                 ▲
            ├─ /api/cron/{ingest,match,digest}  (Vercel Cron)         │ Bearer APPLY_WORKER_SECRET
            └─ lib: connectors · matching · ranking · ai · apply ─────┘
                       │                        │
                Postgres (Neon/Supabase;   Meta Model API          Resend
                PGlite locally)            api.meta.ai/v1          (local outbox in dev)
```

- **Auth**: passwordless magic links (a JWT signed with `jose`, single-use `jti`), an httpOnly session cookie, and a `proxy.ts` gate.
- **Jobs**: plain cron route handlers. `ingest` runs every 6 h, `match` runs 30 min later (with the web scout), and `digest` runs daily.
- **Apply sessions**: a filled form waits in a live browser for your approval for up to 20 minutes. The worker must run as a single instance.

## Run it locally

Requirements: Node 20+ and Google Chrome (locally, the apply agent drives your installed Chrome).

```bash
npm install
cp .env.example .env.local     # every value is optional in development
npm run dev                    # http://localhost:3000
npm run ingest                 # pull live listings from all sources (~30 s)
```

Sign in with any email. In development, the magic link appears on screen and in `/dev/outbox`. Upload a resume PDF, confirm your profile, and your radar fills. Add a `MODEL_API_KEY` to switch from demo mode to Muse Spark and Muse Wonder.

| Script | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | 120 unit, integration and browser tests (Vitest) |
| `npm run test:coverage` | coverage for `src/lib` |
| `npm run lint` / `typecheck` | ESLint / `tsc` |
| `npm run worker` | run the apply worker locally |
| `npm run db:generate` | regenerate SQL migrations from the Drizzle schema |

The tests run against:
- an embedded Postgres
- a local OpenAI-format mock of the Meta API, covering strict JSON schema, PDF parts, citations and the budget
- a real headless Chrome filling a local form, covering fill → approval gate → submit and the submit guard

## Deploy

1. **Database**: create a Postgres database (Neon or Supabase) and set `DATABASE_URL`. The migrations in `drizzle/` run automatically on first connection.
2. **App on Vercel**: import the repo and set these env vars from `.env.example`: `APP_URL`, `AUTH_SECRET`, `CRON_SECRET`, `MODEL_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `DATABASE_URL`, `APPLY_WORKER_URL`, `APPLY_WORKER_SECRET`. `vercel.json` schedules the crons. The 6-hourly crons need Vercel Pro; on Hobby, change them to daily.
3. **Apply worker** on Railway, Fly or any Docker host: build the `Dockerfile`, set `DATABASE_URL`, `APPLY_WORKER_SECRET` and `MODEL_API_KEY`, and run one instance only. Then point `APPLY_WORKER_URL` at it.
4. **Email**: verify your sending domain in Resend and set `EMAIL_FROM`.

## Repo layout

```
src/app/            pages (App Router) and /api route handlers
src/components/     UI kit, radar, nav, prefs editor
src/lib/ai/         Meta Model API client, prompts, agents, demo-mode heuristics
src/lib/apply/      apply state machine, browser control, Muse Wonder loop
src/lib/connectors/ source connectors (ATS boards, hackathons, SimplifyJobs)
src/lib/            matching, ranking, eligibility, digest, auth, tokens, db
worker/             standalone apply worker (HTTP)
tests/              Vitest suites
drizzle/            SQL migrations
```

See [DESIGN.md](DESIGN.md) for the design system and [HACKATHON_LOG.md](HACKATHON_LOG.md) for the build log. All code in this repository was written during the hackathon, starting Oct 27, 2026.

## Principles

- **Evidence over vibes.** Every verdict cites the listing, and every claim in an application is checked against your resume.
- **You press submit.** The agent never submits on its own. The code enforces this, not just the prompt.
- **No credential handling.** Opurnos uses guest-apply flows only, with no LinkedIn automation and no CAPTCHA solving. Anything else becomes a hand-off.
- **Your data is yours.** You can export everything as JSON or delete your account from Settings.
