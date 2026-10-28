# Opurnos — Implementation Plan

> An agent that finds the opportunities you'd otherwise miss, checks whether you qualify, and helps you apply.
> A real product, launched at the Meta Global AI Developer Hackathon · Track: **Indie** (startup afterwards, see 10.1) · Theme: **Build for Your World**
> Plan written 2026-10-27. Submission deadline: **Wed Nov 4, 9:00 PM ET** (8 build days).

> **As built (updated 2026-10-27).** The shipped architecture deliberately simplifies a few choices below. `README.md` describes what exists.
> - **Next.js 16** (not 15), Tailwind v4, hand-built UI kit on Motion, without shadcn or the extra component libraries.
> - **Jobs:** plain cron route handlers (`/api/cron/{ingest,match,digest}`, run by Vercel Cron) instead of Inngest. There is one fewer service to run, and the pipeline is idempotent anyway.
> - **Database:** Drizzle on Postgres (Neon or Supabase via `DATABASE_URL`, embedded PGlite locally). Opurnos has its own magic-link auth, with resumes stored in the profile row, instead of Supabase Auth and Storage.
> - **Triage:** keyword fit (phrase-aware tokens, title hits weighted double) instead of pgvector. There is no Meta embeddings endpoint, and keyword triage plus the LLM judge was good enough.
> - **Apply worker:** TypeScript + Playwright in a Docker container (`worker/`, `Dockerfile`) on Railway or Fly, instead of a Python worker on Modal. It shares the apply code with the app.
> - **Sources:** 68 connectors (Greenhouse, Lever, Ashby, Workday, Amazon, SimplifyJobs, vanshb03 internships, HN Who is hiring, Remote OK, Devpost, MLH, Devfolio, ETHGlobal, HackerEarth, Hack Club, Unstop, Google Summer of Code, Outreachy, curated programs) plus the web scout.
> - **Not built:** voice onboarding (Muse Voice), Muse Image art, the ⌘K palette, the calendar export. They move to the post-hackathon roadmap.

---

## 0. TL;DR

| | |
|---|---|
| **One-liner** | You upload your resume once. Opurnos keeps searching ~15 sources plus the open web, checks every opportunity against your profile with cited evidence, emails you a ranked digest, and helps you apply with materials that are checked against your real resume. |
| **What makes it different** | 1) It covers every kind of opportunity: jobs, internships, hackathons, fellowships, scholarships, research positions, conferences. 2) Eligibility checks are verifiable, with each verdict citing the source text. 3) A **truthfulness verifier** catches anything the AI made up in tailored resumes (the most common complaint against Jobright and similar tools). 4) Applying is human-in-the-loop: the agent fills the form and the user approves the final submit. |
| **Meta models used** | Muse Spark 1.3 (resume PDF parsing, extraction, eligibility, tailoring), **web_search grounding** (finding long-tail opportunities), Muse Wonder 1.0 **computer use** (Apply agent), Muse Voice Transcribe (voice onboarding), Muse Image (digest/share art). |
| **Stack** | Next.js 15 + TS + Tailwind v4 + shadcn/ui + Motion · Supabase (Postgres, pgvector, Auth, Storage) · Inngest (cron + durable jobs) · Resend + React Email · Python apply-worker in a long-running container (Modal if credits are granted, otherwise Railway/Fly) running Playwright |
| **Demo hook** | Drop a resume. In about 20 seconds the "radar" fills with 30 matched opportunities, each with an eligibility verdict. Click **Apply Now** in the email. Watch the agent fill a real Greenhouse form live. The verifier flags one invented claim. The user approves, and the application is submitted. |

---

## 1. Research findings

### 1.1 Meta Model API (verified from dev.meta.ai docs + cookbook)
- **Base URL** `https://api.meta.ai/v1`, `Authorization: Bearer $MODEL_API_KEY`. Works as a drop-in with the **OpenAI SDK** (the cookbook recommends it over the official client, which is outdated). Anthropic SDK compatibility is also claimed.
- **Models**
  - `muse-spark-1.3`: text/image/video/PDF input, 1M context, tool calling, structured output, search grounding. **Default for everything.**
  - `muse-spark-1.3-contributor`: cheaper, but Meta may train on your data. **Use only for public opportunity data, never for user resumes.**
  - `muse-wonder-1.0`: adds **computer use** and reasoning effort levels from `minimal` to `max`. **This drives the Apply agent.**
  - `muse-image-1.0`, `muse-voice-transcribe-1.0` (realtime WebSocket + file endpoint), `sam-3.1`.
  - Open weights (Muse Spark Open, Muse Glimmer) are **not used**. The rules say Meta API *and/or* open weights, and the API's rate limits are enough. This removes Baseten as a dependency.
- **Search grounding**: Responses API, `tools=[{"type":"web_search", "search_context_size":"high", "user_location":{...}}]`, `include=["web_search_call.results"]`. Returns `url_citation` annotations with character offsets. **No domain or recency filters** on the Responses API, so the date and domain filtering has to happen in our own post-processing.
- **Structured output**: Chat Completions `response_format` (JSON schema). Parse with Zod (TS) / Pydantic (Py).
- **No embeddings endpoint.** Use a local open embedding model (`bge-small-en-v1.5` via fastembed / transformers.js) and store vectors in pgvector.
- **Rate limits**: 2,400 req/min and 800k tokens/min per team. Watch the `x-ratelimit-remaining-*` headers.
- **Cookbook recipes to copy patterns from**: `01/03_tool_calling`, `01/04_structured_output`, `01/05_prompt_caching`, `01/10_search_grounding`, `02/01_basic_agent_loop`, `02/02_interleaved_reasoning`, `03/12_computer_use` (Cua sandbox), `04/07_goal_tracking_with_judge`.
- Pricing pages returned 404 when fetched. **Check the Billing page on day 1** and set a $150 spend alert.

### 1.2 Competitive landscape
| Product | What it does | Gap Opurnos fills |
|---|---|---|
| **QuantScraper** | Scrapes 128 firms' career pages every 6h, normalises title/location/seniority, trending list | Jobs only, three verticals, **no alerts**, no eligibility check, no applying |
| **SimplifyJobs** (GitHub repos + extension) | Community-curated `listings.json` for internships/new-grad. Free autofill extension | You still have to find and judge each listing yourself. Autofill fills forms but doesn't tailor or verify |
| **Jobright** | Agent tailors resume and auto-submits (supervised or autopilot) | Reviews say its resume tool **adds skills the user doesn't have**. Jobs only. Billing complaints |
| **LazyApply / JobCopilot / LoopCV** | Apply in volume | Spray-and-pray. Hurts the user's reputation with recruiters |
| **Devpost / MLH / Devfolio / Unstop / Hack Club / Hackalist** | Hackathon listings, each siloed | Fragmented. Nobody combines them with jobs and fellowships for one profile |
| **Newsletters (0xShip, OpenQuant)** | Weekly curated lists | Same list for every reader. Doesn't know your profile |
| **simplytk** (UK, 10 markets) | Live board of ~4,000 spring weeks/internships + fellowships/accelerators, morning email alerts, AI CV rater (scored per firm), cover letter + cold email AI, OA drills, interview/HireVue prep, UCAS tools. Free tier + £4.99/wk pass + paid reviews/mentoring. Light UI, Inter, blue accent, standard SaaS layout | **Closest competitor, and proof people will pay.** No eligibility verdicts with evidence, no applying for you, thin on hackathons/research/scholarships, and it's a board you browse rather than a ranked list for one person. Opurnos has to win on the agent + the verification, not on the tracker |

**Positioning:** *"Not a job board. A chief-of-staff for your ambitions."* It covers every opportunity type, checks eligibility with evidence, and asks for permission before it submits anything.

### 1.3 Hackathon fit & risk check
- **Anti-project list:** "AI Job Application Screener" is banned, but that's the *employer* side. Opurnos is applicant-side and covers more than jobs. **Always lead with hackathons, fellowships, and research positions** in the pitch so judges don't pattern-match it to "another job tool".
- "Basic RAG" is also banned. Opurnos is a multi-agent system (discovery → extraction → eligibility → ranking → tailoring → verification → computer-use apply), so make the agent graph visible in the demo.
- **Judging (Indie):** creativity, technical ambition, *whether it works*. A live deployed URL plus a real end-to-end apply in the video covers all three.
- **New work only:** the repo is created today and commit history shows the work. Keep a `HACKATHON_LOG.md`.

---

## 2. Product scope

### 2.1 MVP (must ship by Nov 3)
1. **Onboarding**: upload resume PDF (or speak a 60s intro with Voice Transcribe) → Muse Spark parses it into a structured `Profile` → user confirms and edits chips (interests, roles, locations, grad year, work authorization, opportunity types).
2. **Discovery engine**: scheduled connectors + web-search scout → normalised `Opportunity` rows.
3. **Eligibility + ranking**: each opportunity gets a verdict per user (`eligible | likely | stretch | ineligible`), the evidence quotes behind it, and a 0–100 match score.
4. **Radar dashboard**: ranked feed, filters, deadline timeline, save/dismiss (which feeds back into ranking).
5. **Email digest**: daily or weekly ranked list via Resend. Each card has a signed **Apply Now** link that opens Apply Studio.
6. **Apply Studio**: tailored resume + cover letter/answers → **truthfulness verifier** → computer-use agent fills the form in a sandbox while the user watches a live view → user approves → submit. Supported: **Greenhouse, Lever, Ashby** (standard forms). Everything else gets *prefill + handoff*: answers ready to copy and a deep link.
7. **Pipeline**: kanban of Discovered → Shortlisted → Applying → Submitted → Interview/Outcome.

### 2.2 Stretch (only if MVP is green by Nov 2)
- Calendar export (.ics) for deadlines
- "Why didn't I qualify?" gap coaching (missing skill → link to a hackathon that builds it)
- Teammate finder for hackathons (match two Opurnos users)
- Muse Image shareable "My week in opportunities" card

### 2.3 Explicit non-goals
No LinkedIn automation (against its ToS). No CAPTCHA solving. No fully autonomous submission without user approval. No storing third-party passwords: the agent only uses guest-apply flows.

---

## 3. Architecture

```
                ┌──────────────────────── Next.js 15 (Vercel) ────────────────────────┐
 User ─────────▶│ Landing · Onboarding · Radar · Opportunity · Apply Studio · Pipeline │
                │ Route handlers / Server Actions                                     │
                └──────┬───────────────────────┬───────────────────────────┬─────────┘
                       │                       │                           │
                 Supabase                 Inngest (jobs)          Worker (Modal/Railway)
         Postgres+pgvector+Auth+        ┌─────────────────────┐     ┌──────────────────────┐
         Storage(resumes, artifacts)    │ cron: connectors    │     │ apply-worker         │
                       ▲                │ cron: web scout     │     │  Playwright sandbox  │
                       │                │ extract → dedupe    │     │  Muse Wonder CU loop │
                       └────────────────│ match → rank        │────▶│  screenshot stream   │
                                        │ digest → Resend     │     │  pause-for-approval  │
                                        └─────────┬───────────┘     └──────────────────────┘
                                                  │
                           Meta Model API (muse-spark-1.3 / wonder / voice / image)
```

### 3.1 Agent graph (show this in the demo and README)
| Agent | Model | Input → Output |
|---|---|---|
| **Profile Parser** | Spark 1.3 (PDF input, structured output) | resume PDF / voice transcript → `Profile` JSON |
| **Source Connectors** | none (deterministic) | ATS JSON APIs, GitHub listings, hackathon sites → raw items |
| **Web Scout** | Spark 1.3 + `web_search` | profile-derived queries ("2027 undergrad AI research fellowship India deadline") → candidate URLs + citations |
| **Extractor** | Spark 1.3-contributor (public data only) | raw page/JSON → `Opportunity` (type, deadline, eligibility rules, location, comp, apply URL, ATS type) |
| **Triage** | none (SQL hard filters + pgvector similarity) | profile × 1000s of opportunities → keep top ~100 before any LLM call |
| **Eligibility Judge** | Spark 1.3 (structured output) | profile × opportunity → verdict + `evidence[]` (quote + source field) + `missing[]` |
| **Ranker** | deterministic formula | see 3.3 |
| **Tailor** | Spark 1.3 | profile + JD → tailored resume bullets, cover letter, form answers |
| **Truthfulness Verifier** | Spark 1.3 (separate call, judge prompt) | tailored doc vs. source resume → every claim marked `supported / rephrased / UNSUPPORTED` |
| **Apply Agent** | Wonder 1.0 computer use | apply URL + approved materials → filled form, paused before submit |

### 3.2 Data model (Supabase / Postgres)
```sql
profiles(id, user_id, raw_resume_path, parsed jsonb, embedding vector(384),
         prefs jsonb, -- types, locations, remote, grad_year, work_auth, min_comp, digest_freq
         updated_at)
sources(id, kind, -- greenhouse|lever|ashby|simplify|devpost|mlh|devfolio|unstop|hackclub|web
        config jsonb, last_run_at, status)
opportunities(id, source_id, external_id, url, apply_url, ats, type, -- job|internship|hackathon|fellowship|scholarship|research|conference|grant
              title, org, location jsonb, remote bool, deadline timestamptz, starts_at,
              comp jsonb, eligibility jsonb, description text, embedding vector(384),
              content_hash, first_seen, last_seen, is_active)
  unique(source_id, external_id); index on content_hash (cross-source dedupe)
matches(user_id, opportunity_id, verdict, score, evidence jsonb, missing jsonb,
        reasons text, status, -- new|saved|dismissed|applying|submitted|interview|rejected|offer
        feedback smallint, emailed_at, created_at)
applications(id, user_id, opportunity_id, tailored jsonb, verifier_report jsonb,
             run_id, state, -- drafting|verifying|filling|awaiting_approval|submitted|failed|handoff
             screenshots text[], submitted_at, error)
agent_runs(id, kind, input jsonb, output jsonb, tokens_in, tokens_out, cost_usd, ms, status)  -- observability + cost panel
```
Row-level security on every user table. Resumes go in a private bucket and are served through signed URLs only.

### 3.3 Ranking formula (transparent, shown in the UI as a breakdown)
```
score = 100 × ( 0.35·semantic_fit      // cosine(profile, opp) blended with LLM fit
              + 0.25·eligibility       // eligible 1, likely .7, stretch .35, ineligible 0 (hidden by default)
              + 0.15·urgency           // deadline proximity, but 0 when past
              + 0.15·value             // prestige/comp/prize, LLM-estimated 0..1
              + 0.10·preference )      // learned from save/dismiss per type/org/tag
```

### 3.4 Sources (connectors in priority order)
| # | Source | Method | Types |
|---|---|---|---|
| 1 | Greenhouse boards | `GET boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` (public, no auth) | jobs, internships |
| 2 | Lever | `GET api.lever.co/v0/postings/{slug}?mode=json` | jobs, internships |
| 3 | Ashby | `GET api.ashbyhq.com/posting-api/job-board/{name}?includeCompensation=true` | jobs, internships |
| 4 | SimplifyJobs | raw `listings.json` from `Summer2027-Internships` + New-Grad repo (public GitHub) | internships, new grad |
| 5 | Devpost | public hackathon listing JSON (verify the endpoint on day 2; fall back to HTML) | hackathons |
| 6 | MLH | season events page (HTML parse) | hackathons |
| 7 | Hack Club hackathons + Hackalist | open JSON / GitHub data | hackathons (travel-reimbursement flag) |
| 8 | Devfolio, Unstop | HTML/JSON where robots.txt allows | hackathons, competitions (India) |
| 9 | **Web Scout** | `web_search` grounded queries built from the profile, about 10 per user per day | fellowships, scholarships, research positions, conferences, grants |

Seed company list: the ~130 firms QuantScraper covers (quant, AI labs, big tech) plus YC companies on Ashby. Each connector is about 50 lines behind one interface: `fetch(): RawItem[]`. Respect robots.txt and rate-limit every source to at most 1 req/s.

### 3.5 Apply agent: safety design (pitch it as "verifiable agents")
1. **Draft**: the Tailor writes materials.
2. **Verify**: the Verifier must report zero `UNSUPPORTED` claims, or the user explicitly accepts each one. The UI shows a diff of original vs. tailored, with claims highlighted.
3. **Fill**: Muse Wonder runs a screenshot → action loop in an isolated browser container (a fresh browser context per run, destroyed afterwards). It gets **only** the approved materials and the profile fields the form needs. Hard step cap (40) and timeout (5 min).
4. **Pause**: the agent stops on the review page. The user sees a full-page screenshot plus a field-by-field table.
5. **Approve → Submit**: one click. Opurnos stores a confirmation screenshot and the application moves to `Submitted`.
6. **Fallbacks**: if it hits a CAPTCHA, a login wall, or an unknown ATS, it switches to *handoff* mode with prefilled answers and a deep link. It never guesses.

Email links are **signed, single-use, 72h-expiry JWTs** that open Apply Studio. They never submit anything directly.

---

## 4. UI/UX design system

### 4.1 Direction: "Night radar, editorial calm"
The product watches the horizon for you, so the visual metaphor is a **radar or constellation**: opportunities appear as points of light that get brighter as they match you better. Everything around that stays quiet and editorial so the content does the talking. That means one confident accent, generous whitespace, serif display type, and mono metadata.

- **Mood references:** collect them on cosmos.so / savee.com (search "radar UI", "observatory", "editorial dark", "mission control minimal"). Shotdeck for night-sky / control-room frames. Midjourney for one hero still and email header art (or Muse Image, which also counts toward using Meta models).
- **Base DESIGN.md:** start from **getdesign.md**'s *Linear* (dark minimal discipline) + *Vercel* (Geist type system) + *Claude* (warm editorial accent) entries, and merge them into our own `DESIGN.md` at the repo root so every agent session (Muse Code / Claude Code) builds on-system.

### 4.2 Tokens
| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#0A0B0F` | `#F6F4EF` (paper) |
| `--surface` | `#12141A` | `#FFFFFF` |
| `--elevated` | `#1A1D25` | `#FBFAF7` |
| `--border` | `#ffffff14` | `#0000001a` |
| `--text` | `#ECEAE4` | `#16171B` |
| `--muted` | `#8B8D98` | `#6B6D76` |
| `--accent` (signal amber) | `#FFB547` | `#D9861A` |
| `--eligible` | `#5BD69B` | `#1F9D63` |
| `--likely` | `#7AB8FF` | `#2F6FD1` |
| `--stretch` | `#C79BFF` | `#7B4BD1` |
| `--ineligible` | `#6B6D76` | `#9A9CA4` |

- **Type:** *Instrument Serif* (display, hero, section titles) · *Geist* (UI/body) · *Geist Mono* (deadlines, scores, source tags). Scale: 12/14/16/20/28/40/64/96.
- **Radius** 10 / 14 / 20. **Spacing** on a 4px grid. **Shadows** are kept minimal. Elevation comes from surface tone plus a 1px inner highlight.
- **Motion:** Motion (motion.dev) springs `{stiffness: 380, damping: 32}` for UI and `{duration: .6, ease: [.22,1,.36,1]}` for reveals. Respect `prefers-reduced-motion` everywhere.

### 4.3 Resource → where it's used
| Resource | Use in Opurnos |
|---|---|
| **getdesign.md** | Seed `DESIGN.md` (4.1) |
| **Spline** | Landing hero: a slow-rotating 3D radar/globe with glowing opportunity pings. Export as `@splinetool/react-spline`, lazy-loaded, with a static poster fallback on mobile and reduced-motion |
| **motion.dev** | Shared-layout transitions (card → detail), list reorder when ranking updates, scroll reveals, Apply Studio step progress |
| **reactbits.dev** | *Hero text*: Split/Blur text reveal on the tagline. *Background*: subtle Aurora/Particles behind onboarding only. *Count-up* numbers on the stats strip. Use sparingly, at most two effects per screen |
| **kokonutui.com** | AI-input / file-upload component for the resume dropzone, animated cards, "AI loading" states |
| **21st.dev (motion libs)** | Command palette (⌘K), animated tabs, kanban card drag, toast stack |
| **bklit.com** | Charts: **radar chart** for match breakdown, **heatmap** for the deadline calendar, **funnel** for the pipeline, **sparklines** for "new this week" per type |
| **morphicons.com** | Morphing state icons: save ↔ saved, play ↔ pause (agent run), check states in Apply Studio |
| **motionsites.ai / desengs.com** | Inspiration for landing composition and section rhythm |
| **higgsfield.ai** | Reference/B-roll clips for the 3-minute demo video intro (10s max) |
| **cosmos.so / savee.com / shotdeck / midjourney** | Moodboard + one hero still + email header art |
| **bharatdigital.org** | Could not verify what it offers during research. Check it as a reference for the India-first sources (Unstop, Devfolio, StartupGrants India) |

### 4.4 Screens
1. **Landing (`/`)**: Spline radar hero, serif headline *"Never miss the one that matters."*, a live counter of opportunities tracked (real number from the DB), a "how it works" section with 3 steps animated on scroll, an agent-graph diagram, a CTA. Fully responsive with no horizontal scroll at 360px.
2. **Onboarding (`/start`)**, 3 steps, under 90s:
   - Drop resume (Kokonut dropzone) **or** "Tell me about yourself" voice button (Muse Voice Transcribe realtime, with a live waveform).
   - *Live parse theatre*: fields stream into a profile card as the model extracts them (stream structured output), with motion stagger.
   - Preference chips: opportunity types, locations, remote, grad year, work authorization, digest cadence.
3. **Radar (`/radar`)**: left: filters plus a mini radar visual (points = top 30 matches, angle = type, distance = 1 − score). Center: the ranked feed, where cards show title, org logo, type pill, verdict pill, deadline countdown in mono, score ring, and a "why" line. Right: a deadline timeline. Keyboard: `j/k` to move, `s` save, `x` dismiss, `a` apply, `⌘K` palette.
4. **Opportunity (`/o/[id]`)**: shared-element transition from the card. Eligibility checklist where each requirement gets ✓/✗/? plus the quoted evidence, and hovering highlights the source text. bklit radar chart of the score breakdown. "Gaps" with suggestions. Buttons: Apply / Save / Not for me (asks for a reason, which feeds ranking).
5. **Apply Studio (`/apply/[id]`)**: 3-pane stepper: *Materials* (side-by-side diff, verifier highlights in red/amber/green) → *Agent* (live screenshot stream of the sandbox browser, action log on the side, pause/stop) → *Review & Submit* (field table + final screenshot + big Approve button). This is the demo's centrepiece, so polish it most.
6. **Pipeline (`/pipeline`)**: kanban with drag (21st.dev), bklit funnel on top.
7. **Settings (`/settings`)**: profile edit, digest cadence, sources on/off, data export/delete, and a usage panel showing model cost from `agent_runs`.
8. **Email digest**: React Email, dark and light safe, 5–10 cards, each with verdict, deadline, one-line why, and an **Apply Now** button. Header art from Muse Image.

### 4.5 Quality bar (check before submit)
Empty, loading, and error states on every screen · skeletons instead of spinners · focus rings + keyboard navigation · WCAG AA contrast in both themes · Lighthouse ≥ 90 on landing · no layout shift from Spline (reserved aspect box) · tabular numerals for scores and countdowns.

---

## 5. Repo layout
```
opurnos/
  DESIGN.md  PLAN.md  HACKATHON_LOG.md  README.md  .env.example
  apps/web/                      # Next.js 15
    app/(marketing)/page.tsx
    app/(app)/start|radar|o/[id]|apply/[id]|pipeline|settings
    app/api/inngest/route.ts  app/api/apply/[token]/route.ts
    components/ui (shadcn) components/radar components/apply components/charts
    lib/meta.ts         # OpenAI SDK client → api.meta.ai, retries, cost logging
    lib/schemas.ts      # Zod: Profile, Opportunity, Verdict, VerifierReport
    lib/ranking.ts  lib/eligibility.ts  lib/tokens.ts
    inngest/ connectors/*.ts  scout.ts  extract.ts  match.ts  digest.ts
    emails/Digest.tsx
  workers/apply/                 # Python + Playwright, Dockerfile (Modal or Railway)
    app.py  agent_loop.py  ats/{greenhouse,lever,ashby}.py  verifier.py
  supabase/migrations/*.sql
  tests/ (vitest unit, playwright e2e)
```

---

## 6. Day-by-day schedule (Oct 27 → Nov 4)

| Day | Date | Goal | Done when |
|---|---|---|---|
| 1 | **Tue Oct 27** | Setup. Claim the $150 Meta credits (form) and request Modal credits. Public GitHub repo, Next.js + Supabase + Inngest scaffold, `lib/meta.ts`, DESIGN.md + tokens. Smoke-test Spark structured output + web_search + Wonder computer use (from cookbook 03/12). Attend Agents 101 | All 3 model calls return. App deploys to Vercel |
| 2 | Wed Oct 28 | Profile Parser (PDF → Profile) + onboarding UI with streaming parse. Connectors 1–4 (Greenhouse/Lever/Ashby/Simplify). Attend Agents 102 (verifiable agents, which feeds the Verifier design) | Upload a resume → profile saved. 2k+ opportunities in DB |
| 3 | Thu Oct 29 | Extractor + dedupe, connectors 5–8 (hackathons), Web Scout for fellowships/scholarships/research. Embeddings + pgvector | 5k+ rows across ≥5 types, each with deadline and eligibility |
| 4 | Fri Oct 30 | Triage (SQL + vectors) → Eligibility Judge → Ranker. Radar feed + Opportunity detail with evidence. Fireworks workshop | A real profile gets a sensible top 30 with verdicts |
| 5 | Sat Oct 31 | Tailor + Truthfulness Verifier + Apply Studio Materials step. Signed email tokens + Resend digest | Digest email arrives. Apply Now opens Studio with verified materials |
| 6 | Sun Nov 1 | Apply-worker container: Wonder CU loop on Greenhouse → Lever → Ashby. Live screenshot stream, pause-for-approval, handoff fallback | **One real end-to-end submit** on a test/your own posting |
| 7 | Mon Nov 2 | Landing page (Spline hero, reveals), Pipeline kanban + funnel, Settings/cost panel, voice onboarding. Polish pass with design skills | All screens at the quality bar (4.5) |
| 8 | Tue Nov 3 | Bug bash, e2e tests on the critical path, README with agent graph + "built during hackathon" section, **record the demo video**. Last day of office-hours support | Video uploaded, repo public, prod URL stable |
| 9 | Wed Nov 4 | Buffer only. Final checks, submit by **6 PM ET** (3h margin before the 9 PM deadline) | Submitted ✅ |

Cut order if behind: voice onboarding → Lever/Ashby (keep Greenhouse) → Devfolio/Unstop → Pipeline funnel chart → Spline (swap for a CSS radar).

---

## 7. Demo video (3:00)
| Time | Shot |
|---|---|
| 0:00–0:15 | Hook: "Last year I missed 4 hackathons and a fellowship deadline because I found out too late." Quick B-roll, then the logo |
| 0:15–0:45 | Drop resume → live parse theatre → chips → radar fills (show source count + types) |
| 0:45–1:15 | Open a fellowship: eligibility checklist with quoted evidence. Open a hackathon: travel reimbursement flagged |
| 1:15–1:30 | The digest email in Gmail → click **Apply Now** |
| 1:30–2:30 | Apply Studio: verifier flags an invented "led a team of 10" → fix → Muse Wonder fills a real Greenhouse form live → review → Approve → confirmation |
| 2:30–2:50 | Agent graph + which Meta model powers each node + cost panel ("$0.0X per user per day") |
| 2:50–3:00 | "Built in 9 days during the hackathon" + URL + repo |

Use the `ui-demo` skill (Playwright recording) for clean screen captures.

---

## 8. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Computer use is unreliable on real forms | Limit to 3 ATSs. Write ATS-specific hints into the system prompt. Fall back to handoff. Pre-record a backup take |
| Scraping breaks or violates ToS | Prefer official public JSON (ATS APIs, GitHub). Follow robots.txt. Cache aggressively. Show a source-health panel |
| Hallucinated eligibility / deadlines | Extractor must return quoted spans. Drop rows without a parseable deadline. Verdict has to cite evidence or it falls back to `likely` |
| Fabricated resume claims | The Verifier is a hard gate in the UI. This is a core feature, not a safety afterthought |
| Credit burn ($150) | Free SQL/vector triage before any LLM call, extract each opportunity once and share it across users, Spark contributor only for public data, prompt caching on the profile prefix, per-run cost logging, spend alert |
| PII (resumes) | RLS, private bucket, no contributor model for user data, delete-my-data button |
| Judges read it as "job tool" (banned list) | Lead with hackathons, fellowships, and research. Show the multi-agent graph |

---

## 9. Immediate next steps (today)
1. Submit the **Meta credits form** and the Modal credits form (Modal caps at the first 1,000 participants, so apply now).
2. Create the public repo `opurnos`, run `pnpm create next-app`, Supabase project, Inngest, Resend domain.
3. Run three smoke tests: structured output, web_search, Wonder computer use.
4. Write `DESIGN.md` from 4.1–4.2 and build the token layer + typography before any screens.
5. Check bharatdigital.org by hand (unverified during research).
6. Track is decided: Indie. Build the 10.2 groundwork in from day 1 anyway.

---

## 10. Beyond the hackathon: Opurnos as a real product

The hackathon is the launch, not the finish line. Build the 8-day version so nothing has to be thrown away afterwards.

### 10.1 Track choice: Indie now, startup later (decided 2026-10-27)
Indie is judged on **creativity, technical ambition, and whether it works**. So the 8 days go into the things judges see: the agent graph, the verifier, live computer-use apply, and a polished UI. The production checklist in 10.3 mostly waits until after Nov 4, **except** for the cheap groundwork in 10.2 and three must-haves for a public demo URL: Supabase Auth, RLS on user tables, and a per-user LLM budget (so judges' traffic can't drain the credits).

Startup path afterwards: work through 10.3 → private beta → incorporate when there's traction. The public hackathon repo becomes the open-core foundation. Decide later whether the product stays open source or moves to a private fork for the paid features.

### 10.2 Build decisions that let it grow (do these during the hackathon)
- **Opportunities are global, matches are per user.** Each listing is fetched, extracted and embedded **once** and shared by every user. LLM cost per user then covers only eligibility judging + tailoring, which keeps it affordable at scale.
- **Ingestion is separate from serving.** Connectors write to `opportunities` on their own schedule. The app only reads. A broken source never takes the app down.
- **Model calls go through one gateway** (`lib/meta.ts`) with retries, timeouts, a per-user daily budget and cost logging. Switching or adding models later is a one-file change.
- **Versioned prompts and schemas** (`prompts/eligibility.v1.md`), plus a small eval set of 50 hand-labelled profile×opportunity pairs. Re-run it before changing any prompt.
- **Background jobs are idempotent** (Inngest step functions keyed by `opportunity_id` / `user_id`), so a retry never sends duplicate emails or submits an application twice.

### 10.3 Production checklist (post-hackathon, or during it if on the Startup track)
| Area | What's needed |
|---|---|
| **Auth & accounts** | Supabase Auth (Google + magic link), account deletion, data export |
| **Privacy & legal** | Privacy policy + ToS. GDPR (EU/UK users) and India's **DPDP Act 2023** (consent, purpose limitation, deletion on request). Resumes encrypted at rest, retention limits, no training on user data (never use contributor-mode models for user data) |
| **Source compliance** | Per-source ToS/robots review, keep the public JSON feeds as the backbone, honour takedown requests, attribute and link back to the original posting |
| **Apply-agent trust** | Approval before every submit, a log of each submission with screenshots, per-user daily apply cap (stops spam-applying, which protects users' reputations with employers), kill switch per ATS |
| **Email deliverability** | Custom domain with SPF/DKIM/DMARC, one-click unsubscribe, bounce handling, digests sent in each user's local morning |
| **Reliability** | Sentry for errors, source-health dashboard (alert when a connector returns 0 rows), uptime monitor, daily DB backups |
| **Abuse & cost** | Rate limits per user/IP, per-user LLM budget, Cloudflare Turnstile on sign-up |
| **Quality loop** | Thumbs up/down and "applied → got interview" outcomes feed the ranker, plus a weekly eval run |
| **Testing** | Unit tests on ranking/eligibility/token logic, e2e tests on onboarding → digest → apply, recorded ATS form fixtures for the apply agent |

### 10.4 Business model (draft)
| Tier | Price | Includes |
|---|---|---|
| Free | ₹0 / $0 | Weekly digest, radar, eligibility verdicts, 3 tailored applications/month, handoff apply |
| Pro | ~₹299/mo · ~$6/mo | Daily digest, unlimited tailoring + verifier, agent apply (with a fair-use cap), deadline calendar sync |
| Campus / club | per seat | Career centres and student clubs push curated opportunities to members |

simplytk shows students will pay roughly £5/week for less than this. Price in INR for India first (Unstop and Devfolio users), then USD.

### 10.5 Roadmap after Nov 4
1. **Weeks 1–2:** close the production checklist gaps, private beta with 50 students (college clubs, hackathon Discords).
2. **Month 1:** more sources (university research boards, scholarship portals, government schemes, Wellfound/YC jobs), browser extension that adds Opurnos verdicts to any job page.
3. **Month 2:** outcome tracking (interview/offer), teammate matching for hackathons, campus tier.
4. **Month 3:** public launch (Product Hunt, Reddit r/csMajors and r/developersIndia, college ambassadors).
