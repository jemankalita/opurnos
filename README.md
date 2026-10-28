# Opurnos

**Never miss the one that matters.** Opurnos is an agent that keeps watch over hackathons, fellowships, scholarships, research positions, internships and jobs. It checks each one against *your* resume and cites its evidence, then emails you the few worth your time. It also helps you apply. Every claim in your application is checked against what you've actually done, and nothing is submitted until you approve it.

Opurnos is a SaaS product for students and early-career people in India. It's **free** for the radar, eligibility checks, digests and scam warnings. **Pro** (₹199/month, billed through Razorpay) adds the AI on top: AI eligibility judging, tailored applications, the apply agent, AI referral drafts and live web search. The AI runs on **OpenAI** models.

> Not a job board. A chief of staff for your ambitions.

---

## What it does

1. **Drop your resume.** The model reads the PDF directly (structured output) and builds your profile: education, experience, projects, skills, work authorisation. You confirm it and choose what you care about.
2. **The radar fills.** Opurnos watches 92 live sources, plus 15 official pages it checks daily and flags when new dates go up: seasonal Indian programs, the PM Internship Scheme, NATS apprenticeships, PSU hiring through GATE (POWERGRID, NPCIL, ISRO) and the GATE 2027 exam, with a focus on India: Codeforces and CodeChef contests, hackathons (Devpost, MLH, Devfolio, ETHGlobal, HackerEarth, Unstop, Hack Club), programs (Google Summer of Code, Outreachy, and a hand-checked list of fellowships, scholarships and accelerators), and early-career roles (two community internship lists, SimplifyJobs new grad, Amazon, Workday career sites such as NVIDIA, Adobe and Intel, HN Who is hiring, Remote OK, Unstop internships and jobs with stipend or salary, 60+ Greenhouse/Lever/Ashby boards including Indian companies such as Sarvam AI, CRED, Groww and Zeta, SmartRecruiters India roles at Swiggy, Bosch and ServiceNow, and Indian scholarship and fresher-job feeds). On Pro, a **web scout** also uses OpenAI's `web_search` tool to find long-tail fellowships and scholarships, and keeps only the leads that come with a real citation.
   **Watch any website.** In Settings, paste a careers page, an events page or a fellowships feed (2 sites on Free, 10 on Pro). Opurnos previews what it finds and then checks the site on every scan. It needs no AI: it reads the schema.org `JobPosting`/`Event` data that sites publish for search engines, follows links to Greenhouse, Lever or Ashby boards, or falls back to the site's RSS feed. It respects robots.txt and refuses private-network addresses.
3. **Every match is explained.** Opurnos extracts hard eligibility rules from each listing (degree, graduation year or batch, country, sponsorship, students-only, and the cutoffs Indian drives use: CGPA or percentage, "throughout" Class 10 and 12, active backlogs, branch, a GATE score for PSU roles, and years of experience, so a "fresher" role that asks for 2+ years is called out) and checks them against you. **Listings that ask applicants for money** (a registration fee, a refundable deposit, a UPI handle) are flagged as likely scams, kept out of the digest, and shown with a warning and the 1930 cybercrime helpline. Paid roles show how their pay compares with similar open listings. The quote from the listing sits next to the fact from your profile. A transparent score shows exactly why each opportunity ranks where it does.
4. **A digest you'll actually read.** A daily or weekly email, in English or Hindi, lists the new picks. Deadlines of everything you save sync to Google, Apple or Outlook calendar through a private feed, with a reminder the day before. Each has a signed, single-use, 72-hour **Apply now** link.
5. **Apply Studio (Pro).** Opurnos tailors your summary, bullets, cover letter and answers. The **Truthfulness Verifier** then checks every factual claim against your resume. Anything it can't back up is blocked until you fix it or explicitly stand behind it.
6. **The agent fills, you submit (Pro).** On Greenhouse, Lever and Ashby, the apply agent drives a real browser to fill the form while you watch. It stops on the review page, and a guard in the code refuses any agent click on a submit button. You review every field and press submit yourself. On any other site, you get everything ready to paste.
7. **Ask for a referral.** For jobs and internships, Opurnos links to alumni of your college at the company and drafts a connection note (within LinkedIn's 300-character limit) and a follow-up message from your real profile: from a template on Free, written for the role on Pro. You send it yourself.
8. **Pipeline.** A kanban board shows everything in flight. Applications sent through Opurnos move on their own.

## Plans

| | Free | Pro (₹199/month) |
|---|---|---|
| Radar: 92 sources and 15 watched official pages | ✓ | ✓ |
| Eligibility rules checked with quoted evidence | ✓ | ✓ |
| Eligibility judging | rules | AI |
| Digest (English or Hindi), calendar feed, scam warnings, pay comparison | ✓ | ✓ |
| Referral requests | template | AI-written |
| Tailored applications, Truthfulness Verifier, apply agent | | ✓ (`PRO_DAILY_APPLY_CAP` a day) |
| Live web scout | | ✓ |
| Websites you can watch | 2 | 10 |
| Daily AI allowance per account (resume reading and so on) | `FREE_DAILY_AI_USD` | `PRO_DAILY_AI_USD` |

Plan logic lives in `src/lib/plans.ts`. Pro is on while the Razorpay subscription is `authenticated`, `active` or `pending`; after cancelling, it lasts until the end of the paid period. **Without Razorpay keys, billing is off and every account gets Pro**, which is what you want for local development and self-hosting.

## The agent graph

| Agent | Model | In → Out |
|---|---|---|
| Profile Parser | `MODEL_DEFAULT` = `gpt-6.1-terra` (PDF input, strict JSON schema) | resume PDF → `Profile` |
| Source connectors | deterministic | public ATS and listing APIs → raw opportunities |
| Rule Extractor | `MODEL_PUBLIC` = `gpt-6-luna` (public listing text only) | listing → eligibility rules |
| Web Scout (Pro) | `MODEL_DEFAULT` + `web_search` | profile → cited leads (uncited leads dropped) |
| Triage | deterministic | profile × thousands of listings → top 150 by keyword fit, with closed and senior roles removed |
| Hard-rule check | deterministic | rules × profile → verdict + evidence |
| Eligibility Judge | `MODEL_DEFAULT` on Pro, deterministic on Free | profile × listing → verdict, fit, value, why, gaps |
| Ranker | deterministic | `100 × (.35 fit + .25 eligibility + .15 urgency + .15 value + .10 your taste)`; ineligible or closed opportunities capped at 25 |
| Tailor (Pro) | `MODEL_DEFAULT` | profile + listing → summary, bullets, cover letter, answers |
| Truthfulness Verifier (Pro) | `MODEL_DEFAULT` (separate judge call) | tailored text × resume → each claim marked `supported / rephrased / unsupported` |
| Apply Agent (Pro) | `MODEL_AGENT` = `gpt-6.1-sol` (vision + tools) | approved materials + form → filled form, paused before submit |

The cheap public model only ever sees public listing text. The server enforces a per-plan daily AI allowance and apply cap. Every call is logged with its tokens and cost (web search calls included), which you can see in Settings. Model names are env vars, so you can switch to any OpenAI or OpenAI-compatible model. If a model rejects a sampling parameter such as `temperature`, the client drops it and remembers that for the model.

**Rules-only mode.** Without an `OPENAI_API_KEY`, every agent falls back to a deterministic heuristic, and the UI says so. The fallbacks are:
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
            │   settings · pricing · legal                  └─ screenshot→action agent loop
            ├─ /api/*  route handlers (zod-validated)                 ▲
            ├─ /api/billing/{subscribe,verify,cancel,webhook}         │
            ├─ /api/cron/{ingest,match,digest}  (Vercel Cron)         │ Bearer APPLY_WORKER_SECRET
            └─ lib: connectors · matching · ranking · ai · apply ─────┘
                       │                        │
                Postgres (Neon/Supabase;   OpenAI API        Razorpay         Resend
                PGlite locally)            api.openai.com    Subscriptions    (local outbox in dev)
```

- **Auth**: passwordless magic links (a JWT signed with `jose`, single-use `jti`), an httpOnly session cookie, and a `proxy.ts` gate.
- **Billing**: Razorpay Subscriptions. The server creates the subscription, Checkout collects the UPI AutoPay or card mandate, the Checkout signature is verified against the subscription id stored on the server, and signed webhooks (`subscription.*`) keep the status current. Deleting an account cancels its subscription first.
- **Jobs**: plain cron route handlers. `ingest` runs every 6 h, `match` runs 30 min later (with the web scout for Pro accounts), and `digest` runs daily.
- **Apply sessions**: a filled form waits in a live browser for your approval for up to 20 minutes. The worker must run as a single instance.

## Run it locally

Requirements: Node 20+ and Google Chrome (locally, the apply agent drives your installed Chrome).

```bash
npm install
cp .env.example .env.local     # every value is optional in development
npm run dev                    # http://localhost:3000
npm run ingest                 # pull live listings from all sources (~30 s)
```

Sign in with any email. In development, the magic link appears on screen and in `/dev/outbox`. Upload a resume PDF, confirm your profile, and your radar fills. Add an `OPENAI_API_KEY` to switch from rules-only mode to the OpenAI models. To try billing, add Razorpay **test mode** keys and a test plan id.

| Script | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | 305 unit, integration and browser tests (Vitest) |
| `npm run test:coverage` | coverage for `src/lib` |
| `npm run lint` / `typecheck` | ESLint / `tsc` |
| `npm run worker` | run the apply worker locally |
| `npm run db:generate` | regenerate SQL migrations from the Drizzle schema |

The tests run against:
- an embedded Postgres
- a local mock of the OpenAI API, covering strict JSON schema, PDF parts, citations, dropped parameters and the budget
- Razorpay with signatures computed the way Razorpay computes them, covering subscribe → Checkout → webhooks → cancel
- a real headless Chrome filling a local form, covering fill → approval gate → submit and the submit guard

## Deploy

1. **Database**: create a Postgres database (Neon or Supabase) and set `DATABASE_URL`. The migrations in `drizzle/` run automatically on first connection.
2. **App on Vercel**: import the repo and set these env vars from `.env.example`: `APP_URL`, `AUTH_SECRET`, `CRON_SECRET`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `DATABASE_URL`, `APPLY_WORKER_URL`, `APPLY_WORKER_SECRET`, plus the billing and business variables below. `vercel.json` schedules the crons. The 6-hourly crons need Vercel Pro; on Hobby, change them to daily.
3. **Apply worker** on Railway, Fly or any Docker host: build the `Dockerfile`, set `DATABASE_URL`, `APPLY_WORKER_SECRET` and `OPENAI_API_KEY`, and run one instance only. Then point `APPLY_WORKER_URL` at it.
4. **Email**: verify your sending domain in Resend and set `EMAIL_FROM`.
5. **Billing (Razorpay)**:
   - Create API keys in the Razorpay dashboard and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
   - Under Subscriptions → Plans, create a monthly plan for ₹199 and set `RAZORPAY_PRO_PLAN_ID`. If you choose another price, set `PRO_PRICE_INR` to match.
   - Under Webhooks, add `https://<your domain>/api/billing/webhook` with all `subscription.*` events and a secret, and set `RAZORPAY_WEBHOOK_SECRET`.
   - Razorpay reviews your website before turning on live mode. The Pricing, Terms, Privacy, Cancellation & Refunds and Contact pages are built in. Set `COMPANY_NAME`, `SUPPORT_EMAIL`, `COMPANY_ADDRESS` and `GRIEVANCE_OFFICER` so they show your real business details, and have the policy text reviewed for your business before launch.

## Repo layout

```
src/app/            pages (App Router) and /api route handlers
src/app/(public)/   pricing, terms, privacy, refunds, contact
src/components/     UI kit, radar, nav, prefs editor, upgrade button
src/lib/ai/         OpenAI client, prompts, agents, rules-only heuristics
src/lib/apply/      apply state machine, browser control, agent loop
src/lib/billing/    Razorpay subscriptions, signatures, webhooks
src/lib/connectors/ source connectors (ATS boards, hackathons, SimplifyJobs)
src/lib/            plans, matching, ranking, eligibility, digest, auth, tokens, db
worker/             standalone apply worker (HTTP)
tests/              Vitest suites
drizzle/            SQL migrations
```

See [DESIGN.md](DESIGN.md) for the design system. The original plan and build log from the project's first days are in [docs/history](docs/history).

## Principles

- **Evidence over vibes.** Every verdict cites the listing, and every claim in an application is checked against your resume.
- **You press submit.** The agent never submits on its own. The code enforces this, not just the prompt.
- **No credential handling.** Opurnos uses guest-apply flows only, with no LinkedIn automation and no CAPTCHA solving. Anything else becomes a hand-off.
- **Your data is yours.** You can export everything as JSON or delete your account from Settings. Deleting it also cancels your subscription.
- **Finding is free.** Knowing what you're eligible for shouldn't cost money. Pro pays for the AI that writes and fills forms.
