import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Logo } from "@/components/brand";
import { EvidenceExhibit, GateExhibit, VerifierExhibit, WeightsTable } from "@/components/landing/exhibits";
import { RevealObserver } from "@/components/landing/reveal";
import { Postmark, Stamp } from "@/components/landing/stamp";
import { type SheetItem, type SheetKind, StampSheet } from "@/components/landing/stamp-sheet";
import { Art, type ArtName, ButtonLink } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { getLandingSample, getPublicStats } from "@/lib/queries";
import { cn, deadlineLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Stats = Awaited<ReturnType<typeof getPublicStats>>;
type Sample = Awaited<ReturnType<typeof getLandingSample>>;

const SHEET: Omit<SheetKind, "count" | "items">[] = [
  { type: "hackathon", art: "clock", tone: "peri" },
  { type: "internship", art: "divider", tone: "sage" },
  { type: "fellowship", art: "hand", tone: "clay" },
  { type: "scholarship", art: "inkwell", tone: "sky" },
  { type: "research", art: "microscope", tone: "peri" },
  { type: "job", art: "compass", tone: "sand" },
  { type: "competition", art: "coin", tone: "sage" },
];

const SOURCES = ["Devpost", "Hack Club", "Unstop", "SimplifyJobs", "Greenhouse", "Lever", "Ashby", "Grounded web search"];

const CREDITS = [
  ["View of the Observatory, Oxford", "The Met, 786806"],
  ["Lighthouse, etching", "The Met, 382738"],
  ["Lantern clock", "The Met, 4751"],
  ["Microscope", "The Met, 206892"],
  ["Surveyor's compass", "The Met, 8029"],
  ["Inkwell, pewter", "The Met, 4440"],
  ["Architect's compass", "Art Institute of Chicago, 79228"],
  ["Denarius portraying Julius Caesar", "Art Institute of Chicago, 5588"],
  ["Life cast of the hands of Abraham Lincoln", "Art Institute of Chicago, 566"],
];

const delay = (i: number) => ({ "--i": i }) as CSSProperties;

async function loadLanding(): Promise<{ stats: Stats | null; sample: Sample }> {
  try {
    const [stats, sample] = await Promise.all([getPublicStats(), getLandingSample()]);
    return { stats, sample };
  } catch {
    return { stats: null, sample: [] };
  }
}

function toItem(s: Sample[number]): SheetItem {
  return { id: s.id, title: s.title, org: s.org, due: deadlineLabel(s.deadline), remote: Boolean(s.remote) };
}

function buildSheet(stats: Stats | null, sample: Sample): SheetKind[] {
  const count = (t: string) => stats?.byType[t] ?? 0;
  return SHEET.map((k) => {
    // The coin stamp stands for prize money: competitions, or grants when there are more of those today.
    const type = k.type === "competition" && count("grant") > count("competition") ? "grant" : k.type;
    return { ...k, type, count: count(type), items: sample.filter((s) => s.type === type).map(toItem) };
  });
}

function soonest(sample: Sample, n: number): SheetItem[] {
  return sample
    .filter((s) => s.deadline)
    .toSorted((a, b) => +new Date(a.deadline!) - +new Date(b.deadline!))
    .slice(0, n)
    .map(toItem);
}

export default async function Landing() {
  const [{ stats, sample }, session] = await Promise.all([loadLanding(), getSession()]);
  const cta = session ? { href: "/radar", label: "Open your radar" } : { href: "/login", label: "Start with your resume" };
  const today = new Date();
  const postmark: [string, string] = [
    today.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase(),
    String(today.getUTCFullYear()),
  ];
  const total = stats?.total ?? 0;

  return (
    <div className="overflow-x-clip">
      <RevealObserver />
      <SiteHeader cta={cta} signedIn={Boolean(session)} />

      <section className="mx-auto max-w-[1240px] px-4 pt-14 text-center md:px-8 md:pt-24">
        <h1 className="reveal mx-auto max-w-[19ch] font-display text-[clamp(36px,7.4vw,112px)] leading-[0.92] tracking-[-0.015em] uppercase">
          Never miss <Ital>the one</Ital> that matters
        </h1>
        <p className="reveal mx-auto mt-7 max-w-[34rem] text-[18px] leading-relaxed text-pretty" style={delay(1)}>
          Opurnos reads your resume, sweeps the web every morning for hackathons, fellowships, research, scholarships and internships, and tells you which ones you
          can actually get.
        </p>
        <div className="reveal mt-9 flex flex-wrap items-center justify-center gap-3" style={delay(2)}>
          <ButtonLink href={cta.href} size="lg">
            {cta.label} <ArrowRight className="size-4" />
          </ButtonLink>
          <a href="#sheet" className="px-3 py-2 text-[15px] underline decoration-1 underline-offset-4 hover:decoration-2">
            See today&apos;s sheet
          </a>
        </div>
        <HeroStamp postmark={postmark} total={total} />
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-16 md:px-8 md:py-24">
        <p className="reveal mx-auto max-w-[52rem] text-center font-serif text-[clamp(26px,3.3vw,42px)] leading-[1.22] text-balance">
          Every year students miss the fellowship they were perfect for because the page was buried, the deadline slipped, or the rules were written for someone else.{" "}
          <em>Opurnos reads the fine print for you</em>, and only writes when something is worth your evening.
        </p>
      </section>

      <section id="sheet" className="scroll-mt-20 bg-elevated/70 py-16 md:py-20">
        <div className="mx-auto max-w-[1240px] px-4 md:px-8">
          <SectionTitle
            kicker={`Today's sweep · ${postmark[0]}`}
            title={
              <>
                Seven kinds, <Ital>one</Ital> sheet
              </>
            }
          >
            Each stamp is a kind of opportunity and the number of open listings for it this morning. Pick one to see what closes next.
          </SectionTitle>
          <div className="reveal mt-8 lg:mt-4" style={delay(2)}>
            <StampSheet kinds={buildSheet(stats, sample)} />
          </div>
        </div>
      </section>

      <Chapter
        n="I"
        id="how"
        early
        title={
          <>
            Watching <Ital>everywhere</Ital>
          </>
        }
        aside={
          <figure className="mx-auto w-[min(70vw,280px)]">
            <Art name="lighthouse" className="aspect-[300/424] w-full" label="Dithered etching of a lighthouse on a rocky coast" />
            <figcaption className="mt-3 text-center text-[13px] text-muted">
              <span className="label">Fig. 1</span> Lighthouse, etching. The Met
            </figcaption>
          </figure>
        }
      >
        <p>
          Structured feeds from the places students already look, plus a grounded web search for the long tail: the lab page, the foundation blog, the society that posts
          once a year. A link without a citation is thrown away.
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-x-6 border-b border-dotted border-border-strong text-[15px]">
          {SOURCES.map((s) => (
            <li key={s} className="border-t border-dotted border-border-strong py-2.5">
              {s}
            </li>
          ))}
        </ul>
        {stats ? <p className="label mt-4">{`${stats.sources} sources healthy · ${total.toLocaleString("en-US")} open listings`}</p> : null}
      </Chapter>

      <Chapter
        n="II"
        flip
        title={
          <>
            Checking <Ital>every rule</Ital>
          </>
        }
        aside={<EvidenceExhibit />}
      >
        <p>
          Hard rules first: degree, graduation year, citizenship, deadline. Then a judge reads the nuance. Every verdict quotes the line in the listing beside the fact from
          your profile that meets it, and the score is a sum you can read.
        </p>
        <WeightsTable />
      </Chapter>

      <Chapter
        n="III"
        title={
          <>
            Applying <Ital>honestly</Ital>
          </>
        }
        aside={<VerifierExhibit model={env.MODEL_DEFAULT} />}
      >
        <p>
          Tailored materials pass through a separate Truthfulness Verifier. A claim your resume can&apos;t back is struck out and blocked until you remove it or confirm it
          yourself. Nothing invented reaches a reviewer.
        </p>
        <Fig n={2} art="inkwell" size="h-[196px] w-[120px]" caption="Inkwell, pewter. The Met" note="Every word it writes is traced back to your resume." />
      </Chapter>

      <Chapter
        n="IV"
        flip
        title={
          <>
            You press <Ital>submit</Ital>
          </>
        }
        aside={<GateExhibit model={env.MODEL_AGENT} />}
      >
        <p>
          A browser agent fills the form in an isolated window you can watch, then stops at the review page. You can take over at any moment. It never submits without your
          explicit approval.
        </p>
        <Fig n={3} art="hand" size="h-[172px] w-[144px]" caption="Life cast of Abraham Lincoln's hand. Art Institute of Chicago" note="The last step is always yours." />
      </Chapter>

      <Letter items={soonest(sample, 3)} />

      <section className="mx-auto max-w-[1240px] px-4 py-20 text-center md:px-8 md:py-24">
        <h2 className="reveal mx-auto max-w-[16ch] font-display text-[clamp(36px,6vw,84px)] leading-[0.95] uppercase">
          Your next <Ital>big thing</Ital> is posted
        </h2>
        <p className="reveal mx-auto mt-6 max-w-md text-[17px]" style={delay(1)}>
          Upload a resume and get a ranked radar in under a minute, with evidence for every match.
        </p>
        <div className="reveal mt-8" style={delay(2)}>
          <ButtonLink href={cta.href} size="lg">
            {cta.label} <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Ital({ children }: { children: ReactNode }) {
  return <em className="font-serif normal-case italic tracking-normal">{children}</em>;
}

function SiteHeader({ cta, signedIn }: { cta: { href: string }; signedIn: boolean }) {
  const link = "underline-offset-4 decoration-1 hover:underline";
  return (
    <header className="mx-auto flex h-20 max-w-[1240px] items-center gap-8 px-4 md:px-8">
      <Logo />
      <nav className="ml-auto hidden items-center gap-7 text-[15px] md:flex" aria-label="Sections">
        <a href="#sheet" className={link}>
          Today&apos;s sheet
        </a>
        <a href="#how" className={link}>
          How it decides
        </a>
        <a href="#letter" className={link}>
          The letter
        </a>
      </nav>
      <ButtonLink href={cta.href} size="sm" className="ml-auto md:ml-0">
        {signedIn ? "Open radar" : "Sign in"}
      </ButtonLink>
    </header>
  );
}

function HeroStamp({ postmark, total }: { postmark: [string, string]; total: number }) {
  const layer = (name: string, tone: string) => (
    <span className={`dither dither-fill absolute inset-0 ${tone}`} style={{ "--art": `url(/art/${name}.png)` } as CSSProperties} aria-hidden />
  );
  return (
    <div className="reveal relative mx-auto mt-16 w-full max-w-[680px] md:mt-20" style={delay(3)}>
      <div className="stamp" style={{ "--stamp": "#f6eedd" } as CSSProperties}>
        <div className="stamp-face p-3 text-left text-[#140d0d] sm:p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em]">
            Opurnos · Daily post{total ? ` · ${total.toLocaleString("en-US")} open today` : ""}
          </p>
          <div className="relative mt-3 aspect-[520/295] overflow-hidden" role="img" aria-label="Dithered etching of the observatory at Oxford">
            <div className="drift absolute inset-0">
              {layer("observatory-sky", "text-sky")}
              {layer("observatory-sage", "text-sage")}
              {layer("observatory-clay", "text-clay")}
              {layer("observatory", "text-[#140d0d]")}
            </div>
          </div>
          <p className="mt-3 text-center font-display text-[clamp(18px,2.6vw,26px)] uppercase">
            The <span className="font-serif normal-case italic">opportunity</span> post
          </p>
        </div>
      </div>
      <Postmark lines={postmark} className="absolute -top-12 right-0 w-[112px] -rotate-12 text-text/75 sm:-top-16 sm:-right-24 sm:w-[190px] lg:-right-36 lg:w-[220px]" />
    </div>
  );
}

function SectionTitle({ kicker, title, children }: { kicker: string; title: ReactNode; children: ReactNode }) {
  return (
    <div className="text-center">
      <p className="reveal label">{kicker}</p>
      <h2 className="reveal mt-4 font-display text-[clamp(34px,5vw,68px)] leading-[0.95] uppercase" style={delay(1)}>
        {title}
      </h2>
      <p className="reveal mx-auto mt-5 max-w-xl text-[17px] text-pretty" style={delay(1)}>
        {children}
      </p>
    </div>
  );
}

type ChapterProps = { n: string; id?: string; title: ReactNode; flip?: boolean; early?: boolean; aside: ReactNode; children: ReactNode };

/** One claim of the story. `early` puts text and picture side by side from tablet width (for short asides). */
function Chapter({ n, id, title, flip, early, aside, children }: ChapterProps) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-dotted border-border-strong">
      <div
        className={cn(
          "mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-10 px-4 py-14 md:px-8 md:py-20 lg:gap-16",
          early ? "md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-2" : "lg:grid-cols-2",
        )}
      >
        <div className={cn("min-w-0", flip && "lg:order-2")}>
          <p className="reveal font-serif text-[22px] text-label italic">Chapter {n}</p>
          <h2 className="reveal mt-2 font-display text-[clamp(36px,5vw,72px)] leading-[0.95] uppercase" style={delay(1)}>
            {title}
          </h2>
          <div className="reveal mt-6 max-w-[34rem] text-[17px] leading-relaxed" style={delay(2)}>
            {children}
          </div>
        </div>
        <div className={cn("reveal min-w-0", flip && "lg:order-1")} style={delay(3)}>
          <div className="w-full max-w-[560px]">{aside}</div>
        </div>
      </div>
    </section>
  );
}

/** A museum print set into the text column with a catalogue caption, like a figure in a printed essay. */
function Fig({ n, art, size, caption, note }: { n: number; art: ArtName; size: string; caption: string; note: string }) {
  return (
    <figure className="mt-10 flex items-end gap-6 border-t border-dotted border-border-strong pt-6">
      <Art name={art} className={cn("shrink-0", size)} label={caption} />
      <figcaption className="pb-1">
        <span className="font-serif text-[20px] leading-snug italic">{note}</span>
        <span className="mt-2 block text-[13px] text-muted">
          <span className="label mr-2">Fig. {n}</span>
          {caption}
        </span>
      </figcaption>
    </figure>
  );
}

const PLACEHOLDER_LETTER: SheetItem[] = [
  { id: "p1", title: "Research Fellowship in ML Systems", org: "A research foundation", due: "6 days left", remote: true },
  { id: "p2", title: "Global AI Hackathon", org: "A hackathon platform", due: "9 days left", remote: true },
  { id: "p3", title: "Undergraduate Research Program", org: "A university lab", due: "12 days left", remote: false },
];

function Letter({ items }: { items: SheetItem[] }) {
  return (
    <section id="letter" className="scroll-mt-20 bg-sage/30 py-16 md:py-24">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-12 px-4 md:px-8 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="min-w-0">
          <p className="reveal label text-text/70">The letter</p>
          <h2 className="reveal mt-4 font-display text-[clamp(36px,5vw,72px)] leading-[0.95] uppercase" style={delay(1)}>
            Only <Ital>when it counts</Ital>
          </h2>
          <p className="reveal mt-6 max-w-[32rem] text-[17px] leading-relaxed" style={delay(2)}>
            No feed to refresh. When something you qualify for appears, Opurnos sends a short letter with the reason it fits and a signed link that opens it straight
            in Apply Studio. Daily, weekly, or never.
          </p>
        </div>
        <figure className="reveal relative mx-auto w-full max-w-[560px] min-w-0 bg-surface p-6 pt-8 text-left sm:p-9" style={delay(2)}>
          <Stamp art="clock" tone="peri" name="Opurnos" count="1st class" className="absolute -top-7 right-5 h-[112px] w-[88px] rotate-[5deg] sm:right-8" />
          <p className="label pr-24">To: you · From: Opurnos</p>
          <p className="mt-5 pr-20 font-serif text-[26px] leading-tight">Hi there, fresh picks for you.</p>
          <ol className="mt-6">
            {(items.length ? items : PLACEHOLDER_LETTER).map((it, i) => (
              <li key={it.id} className="flex items-baseline gap-4 border-t border-dotted border-border-strong py-3.5">
                <span className="font-mono text-[12px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-medium">{it.title}</span>
                  <span className="block text-[14px] text-muted">{it.org}</span>
                </span>
                <span className="shrink-0 font-mono text-[12px] text-signal">{it.due}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-dotted border-border-strong pt-4 text-[14px] text-muted">Open any of these in Apply Studio. Unsubscribe in one click.</p>
        </figure>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-dotted border-border-strong">
      <div className="mx-auto max-w-[1240px] px-4 pt-14 pb-6 md:px-8">
        <div className="grid grid-cols-1 gap-10 text-[14px] md:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-muted">
              Built on Meta models: {env.MODEL_DEFAULT} for reading and judging, {env.MODEL_AGENT} for the browser agent. Listings belong to their publishers; every card
              links to the original.
            </p>
          </div>
          <div>
            <p className="label">Pictures</p>
            <p className="mt-3 text-muted">Public-domain (CC0) museum objects, redrawn as 1-bit prints.</p>
            <ul className="mt-4 grid gap-x-8 gap-y-1.5 text-muted sm:grid-cols-2">
              {CREDITS.map(([title, src]) => (
                <li key={title}>
                  <span className="text-text">{title}</span> · {src}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Wordmark />
      </div>
    </footer>
  );
}

/** The name set edge to edge. SVG with a fixed text length so it always fills the width and keeps its descender. */
function Wordmark() {
  return (
    <svg viewBox="0 0 1000 326" className="mt-12 block w-full font-display text-text select-none" aria-hidden>
      <text x="0" y="226" fontSize="318" textLength="1000" lengthAdjust="spacing" fill="currentColor">
        Opurnos
      </text>
    </svg>
  );
}
