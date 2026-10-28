import { Check, CircleHelp, X } from "lucide-react";

/* The printed "exhibits" each landing chapter rests its claim on. Plain paper, ink rules, no chrome. */

const EVIDENCE = [
  { ok: true, req: "Currently enrolled undergraduate", quote: "open to undergraduate students", you: "B.Tech CSE, 3rd year" },
  { ok: true, req: "Graduating 2027 or later", quote: "expected graduation 2027–2028", you: "Graduating May 2027" },
  { ok: null, req: "Experience with ML research", quote: "prior research experience preferred", you: "Built a RAG pipeline (project)" },
];

export function EvidenceExhibit() {
  return (
    <figure className="border border-text/80 bg-surface p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label">Summer Research Fellowship</p>
          <p className="mt-2 font-display text-[34px] leading-none">Match 87</p>
        </div>
        <span className="inline-flex h-7 items-center rounded-sm bg-sage/45 px-2.5 text-[13px] font-medium text-eligible">Eligible</span>
      </div>
      <ul className="mt-6">
        {EVIDENCE.map((r) => (
          <li key={r.req} className="border-t border-dotted border-border-strong py-4">
            <p className="flex items-center gap-2 text-[15px] font-medium">
              {r.ok ? <Check className="size-4 text-eligible" /> : <CircleHelp className="size-4 text-likely" />}
              {r.req}
            </p>
            <p className="mt-2 grid grid-cols-[84px_1fr] gap-2 text-[14px]">
              <span className="label pt-0.5">Listing</span>
              <span className="font-serif text-[16px] italic">“{r.quote}”</span>
              <span className="label pt-0.5">You</span>
              <span className="text-muted">{r.you}</span>
            </p>
          </li>
        ))}
      </ul>
    </figure>
  );
}

const WEIGHTS: [string, number][] = [
  ["Background fit", 35],
  ["Eligibility", 25],
  ["Urgency", 15],
  ["Value", 15],
  ["Your taste", 10],
];

export function WeightsTable() {
  return (
    <dl className="mt-8 max-w-sm">
      {WEIGHTS.map(([k, v]) => (
        <div key={k} className="flex items-baseline gap-3 border-t border-dotted border-border-strong py-2.5 text-[15px]">
          <dt>{k}</dt>
          <span className="flex-1" />
          <dd className="font-mono text-[13px] tabular">{v}%</dd>
        </div>
      ))}
    </dl>
  );
}

const CLAIMS = [
  { s: "supported", t: "Built a retrieval pipeline serving 2k daily queries", n: "Resume: “RAG search for campus wiki, ~2k queries/day”" },
  { s: "rephrased", t: "Led a team of four at a national hackathon", n: "Reworded from “team lead, Smart India Hackathon”" },
  { s: "unsupported", t: "Published at NeurIPS 2025", n: "Not in your resume. Blocked until you remove or confirm it." },
] as const;

const CLAIM_STYLE = {
  supported: { mark: "bg-sage/50 text-eligible", word: "Supported", Icon: Check },
  rephrased: { mark: "bg-peri/50 text-likely", word: "Rephrased", Icon: Check },
  unsupported: { mark: "bg-clay/55 text-danger", word: "Blocked", Icon: X },
};

export function VerifierExhibit({ model }: { model: string }) {
  return (
    <figure className="border border-text/80 bg-surface p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-display text-[26px] leading-none">Truthfulness Verifier</p>
        <span className="label">{model}</span>
      </div>
      <ul className="mt-6">
        {CLAIMS.map((c) => {
          const { mark, word, Icon } = CLAIM_STYLE[c.s];
          return (
            <li key={c.t} className="grid grid-cols-[1fr_auto] gap-x-4 border-t border-dotted border-border-strong py-4">
              <p className={c.s === "unsupported" ? "text-[16px] line-through decoration-danger/70" : "text-[16px]"}>{c.t}</p>
              <span className={`row-span-2 inline-flex h-6 items-center gap-1 self-start rounded-sm px-2 text-[12px] font-medium ${mark}`}>
                <Icon className="size-3.5" /> {word}
              </span>
              <p className="mt-1 text-[14px] text-muted">{c.n}</p>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

const GATE = [
  { t: "Opened the application in an isolated browser", done: true },
  { t: "Filled 14 fields from your verified profile", done: true },
  { t: "Attached resume and cover letter", done: true },
  { t: "Waiting at the review page for your approval", done: false },
];

export function GateExhibit({ model }: { model: string }) {
  return (
    <figure className="border border-text/80 bg-surface p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-display text-[26px] leading-none">Application run</p>
        <span className="label">{model}</span>
      </div>
      <ol className="mt-6">
        {GATE.map((g, i) => (
          <li key={g.t} className="flex items-baseline gap-4 border-t border-dotted border-border-strong py-3.5 text-[15px]">
            <span className="w-5 font-mono text-[12px] text-faint tabular">{String(i + 1).padStart(2, "0")}</span>
            <span className={g.done ? "flex-1 text-muted" : "flex-1 font-medium"}>{g.t}</span>
            {g.done ? <Check className="size-4 self-center text-eligible" /> : <span className="caret size-2 self-center rounded-full bg-signal" />}
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="inline-flex h-10 items-center rounded-full bg-text px-5 text-sm font-medium text-bg">Approve and submit</span>
        <span className="inline-flex h-10 items-center rounded-full border border-text/75 px-5 text-sm">Take over</span>
      </div>
    </figure>
  );
}
