# Opurnos design system: Paper & Ink

Direction: **the opportunity post.** Opurnos mails you what matters, so the product is set like printed matter: warm paper, black ink, a handful of flat stamp colours, and public-domain museum objects redrawn as 1-bit dithered prints. Each kind of opportunity has its own stamp. The landing page's live piece is a sheet of those stamps showing today's real counts. Click a stamp to see what closes next.

The style language (paper, ink, uppercase serif mixed with italic, dithered art, perforated stamps) is borrowed in spirit from bharatdigital.org. None of its content, art or brand is used.

Source of truth: `src/app/globals.css` (tokens and the few custom classes) and `src/components/ui.tsx` (primitives). Build with these. Don't add one-off colours, shadows, gradients or blurs.

## Colour

Light paper is the default. `data-theme="dark"` is an opt-in "ink" edition, stored in localStorage under `opurnos-theme`.

| Token | Light | Use |
|---|---|---|
| `--bg` / `--surface` / `--elevated` / `--sunken` | `#FFFBF2` / `#FFFDF8` / `#F8F2E5` / `#F3ECDE` | page, panels, hover/selected rows, inputs |
| `--text` / `--muted` / `--faint` | `#140D0D` / `#5B544C` / `#857D72` | three text levels, never more; running text is always `--text` |
| `--accent` | `= --text` | primary buttons are black pills; there is no brand hue |
| `--label` | `#606C47` | olive for mono uppercase labels (`.label`) |
| `--signal` | `#B4492C` | deadlines within a week, "live", Web Scout; the only warm highlight |
| `--sage` `--peri` `--clay` `--sky` `--sand` | `#B3BF96` `#B6C4FD` `#E7A88C` `#9DC3F2` `#EDE4D0` | flat fields only: stamps, verdict chips, section bands |
| `--eligible` `--likely` `--stretch` `--ineligible` | deep green, blue, rust, grey | verdict words, drawn on their tint (`bg-sage/40` and so on) |
| `--danger` | `#B3261E` | blocked claims, errors, destructive actions |

## Type

| Family | Token | Use |
|---|---|---|
| Libertinus Serif Display | `font-display` | headlines, always uppercase, with one phrase in Libertinus *italic* (`<em class="font-serif normal-case italic">`) |
| Libertinus Serif | `font-serif` | listing titles, statements, quoted evidence |
| Public Sans | `font-sans` | UI and body text, 15–18px |
| DM Mono | `font-mono` / `.label` | uppercase labels, dates, counts, model names |

Headlines stay at two lines or fewer. Numbers that matter (match score, counts) are set in `font-display` with tabular figures.

## Structure

- **Rules over boxes.** Lists are separated by dotted rules (`border-dotted border-border-strong`, or `.rule-dotted`). The first and last rule of a key block is solid ink (`border-text/80`). Use panels (`Panel`) only for forms and settings.
- **Stamps.** `.stamp` with a `--stamp` colour gives a perforated edge and an inner keyline (`.stamp-face`). Put the height on `.stamp`, not on `.stamp-face`.
- **Dithered art.** `<Art name="lighthouse" />` masks a 1-bit PNG from `public/art/`, so it takes the current text colour. Hue layers (`observatory-sky`, `-sage`, `-clay`) stack under the ink layer. Credits for every object are in the landing footer: The Met and the Art Institute of Chicago, all CC0.
- **Radius:** 4/6px for chips and inputs, full pills for buttons. No other rounding. No shadows except the lifted stamp.

## Motion

Section parts rise in turn as they scroll in (`.reveal` with `--i` for the stagger, driven by `RevealObserver`; nothing is hidden without JS). Stamps lift on hover and when selected. The hero print drifts slowly. Everything is transform or opacity, and under `prefers-reduced-motion` the travel is dropped.

## Voice

Plain, specific, a little warm. Say what happened and what it means ("23 close within a week"), never what the AI "magically" did. No em-dash-heavy marketing copy, no invented proof.
