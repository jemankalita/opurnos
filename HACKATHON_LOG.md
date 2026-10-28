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

## Next
- Live run with a `MODEL_API_KEY` and tuning of the prompts against real listings.
- Deploy (Vercel + Neon + Railway worker + Resend domain).
- Record the 3-minute demo video.
