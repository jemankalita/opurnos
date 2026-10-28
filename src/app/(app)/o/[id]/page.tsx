import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, CircleHelp, ExternalLink, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Deadline, OrgAvatar, Panel, ScoreRing, SectionLabel, TypePill, VerdictPill } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getOpportunityForUser } from "@/lib/queries";
import { WEIGHTS } from "@/lib/ranking";
import { OpportunityActions } from "./opportunity-actions";

export const metadata: Metadata = { title: "Opportunity" };

const BREAKDOWN_LABEL: Record<string, string> = {
  fit: "Background fit",
  eligibility: "Eligibility",
  urgency: "Urgency",
  value: "Value",
  preference: "Your taste",
};

export default async function OpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ apply?: string }>;
}) {
  const { userId } = await requireUser();
  const { id } = await params;
  const { apply } = await searchParams;
  const data = await getOpportunityForUser(userId, id);
  if (!data) notFound();
  const { opp, match, application } = data;
  const place = opp.remote ? "Remote / online" : opp.locations.join(" · ");

  return (
    <article>
      <Link href="/radar" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Radar
      </Link>

      <header className="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <OrgAvatar org={opp.org} logo={opp.orgLogo} size={52} />
          <div className="min-w-0">
            <p className="text-sm text-muted">
              {opp.org}
              {place ? ` · ${place}` : ""}
            </p>
            <h1 className="mt-1 font-serif text-3xl leading-tight text-balance sm:text-[42px]">{opp.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {match ? <VerdictPill verdict={match.verdict} /> : null}
              <TypePill type={opp.type} />
              {opp.comp ? <span className="text-sm text-muted">{opp.comp}</span> : null}
              <span className="hidden text-faint sm:inline">·</span>
              <Deadline deadline={opp.deadline} className="text-sm" />
              {!opp.isActive ? <span className="text-sm text-danger">No longer listed</span> : null}
            </div>
          </div>
        </div>
        <OpportunityActions
          opportunityId={opp.id}
          status={match?.status ?? null}
          applicationId={application?.id ?? null}
          applicationState={application?.state ?? null}
          url={opp.url}
          autoApply={apply === "1"}
          canApply={opp.isActive}
        />
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {match ? (
            <Panel className="p-5 sm:p-6">
              <SectionLabel>Why it&apos;s on your radar</SectionLabel>
              <p className="mt-3 text-[17px] leading-relaxed text-pretty">{match.why}</p>
              {match.evidence.length ? (
                <>
                  <SectionLabel className="mt-8">Eligibility, checked</SectionLabel>
                  <ul className="mt-3 divide-y divide-border">
                    {match.evidence.map((e, i) => (
                      <li key={i} className="flex gap-3 py-3.5">
                        {e.status === "met" ? (
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-eligible" aria-label="Met" />
                        ) : e.status === "unmet" ? (
                          <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Not met" />
                        ) : (
                          <CircleHelp className="mt-0.5 size-4 shrink-0 text-likely" aria-label="Unknown" />
                        )}
                        <div className="min-w-0 text-sm">
                          <div className="font-medium">{e.requirement}</div>
                          {e.listingQuote ? (
                            <blockquote className="mt-1.5 border-l-2 border-border-strong pl-3 text-muted">
                              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Listing </span>“{e.listingQuote}”
                            </blockquote>
                          ) : null}
                          {e.profileFact ? (
                            <p className="mt-1.5 border-l-2 border-text/50 pl-3 text-muted">
                              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">You </span>
                              {e.profileFact}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {match.gaps.length ? (
                <>
                  <SectionLabel className="mt-8">Gaps to close</SectionLabel>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted">
                    {match.gaps.map((g) => (
                      <li key={g} className="flex gap-2">
                        <span className="text-stretch">→</span>
                        {g}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Panel>
          ) : (
            <Panel className="p-6 text-sm text-muted">We haven&apos;t judged this one against your profile yet. It will be checked on your next scan.</Panel>
          )}

          <Panel className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <SectionLabel>About</SectionLabel>
              {/* Remote OK's API terms require a followed link back that names them, with the referrer kept. */}
              <a
                href={opp.url}
                target="_blank"
                rel={opp.ats === "remoteok" ? "noopener" : "noopener noreferrer"}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-text"
              >
                {opp.ats === "remoteok" ? "Original listing on Remote OK" : opp.ats === "pagewatch" ? "Official page" : "Original listing"} <ExternalLink className="size-3" />
              </a>
            </div>
            <div className="mt-4 max-h-[560px] overflow-y-auto whitespace-pre-line pr-2 text-sm leading-relaxed text-muted scrollbar-thin">
              {opp.description || "The source didn't include a description. Open the original listing for details."}
            </div>
            {opp.tags.length ? (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {opp.tags.map((t) => (
                  <span key={t} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </Panel>
        </div>

        <aside className="space-y-6">
          {match ? (
            <Panel className="p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <ScoreRing score={match.score} verdict={match.verdict} size={64} />
                <div>
                  <div className="font-serif text-2xl">Match {match.score}</div>
                  <div className="font-mono text-[11px] text-faint">judged by {match.judgedBy === "rules" ? "rules engine" : match.judgedBy}</div>
                </div>
              </div>
              <ul className="mt-6 space-y-3.5">
                {(Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => {
                  const v = match.breakdown[k] ?? 0;
                  return (
                    <li key={k}>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">{BREAKDOWN_LABEL[k]}</span>
                        <span className="font-mono text-faint tabular">
                          {Math.round(v * 100)} × {Math.round(WEIGHTS[k] * 100)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.round(v * 100)}%`, background: k === "eligibility" ? `var(--${match.verdict})` : "var(--accent)" }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-faint">The score is a transparent weighted sum. Ineligible or closed opportunities are capped at 25.</p>
            </Panel>
          ) : null}
          <Panel className="p-5 text-sm">
            <SectionLabel>Source</SectionLabel>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-muted">
              <dt className="text-faint">Feed</dt>
              <dd className="truncate">{opp.sourceId}</dd>
              <dt className="text-faint">Form</dt>
              <dd className="capitalize">{opp.ats ?? "unknown"}</dd>
              <dt className="text-faint">First seen</dt>
              <dd className="font-mono text-xs tabular">{opp.firstSeen.toISOString().slice(0, 10)}</dd>
            </dl>
          </Panel>
        </aside>
      </div>
    </article>
  );
}
