"use client";

import { Check, Copy, ExternalLink, Users } from "lucide-react";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";

type Draft = { note: string; message: string; by: string };

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-text"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-1.5 whitespace-pre-line rounded-md border border-border bg-surface p-3 text-[13px] leading-relaxed">{text}</p>
    </div>
  );
}

/** Drafts a referral request and links to people at the company; the student sends it themselves. */
export function ReferralHelper({ opportunityId, org, school }: { opportunityId: string; org: string; school: string | null }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const people = (keywords: string) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const json = await fetch("/api/referral", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ opportunityId }),
      }).then((r) => r.json());
      if (!json.ok) throw new Error(json.error);
      setDraft(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't draft the request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mt-2 text-sm text-muted">A referral from someone at {org} gets read first. Find alumni there, then send a short, specific ask.</p>
      <div className="mt-3 flex flex-col gap-1.5 text-sm">
        {school ? (
          <a href={people(`${org} ${school}`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-text">
            <Users className="size-3.5" /> Alumni of {school} at {org} <ExternalLink className="size-3" />
          </a>
        ) : null}
        <a href={people(org)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-text">
          <Users className="size-3.5" /> People at {org} <ExternalLink className="size-3" />
        </a>
      </div>
      {draft ? (
        <>
          <CopyBlock label={`Connection note · ${draft.note.length}/300`} text={draft.note} />
          <CopyBlock label="Message after they accept" text={draft.message} />
          <p className="mt-3 text-xs text-faint">Replace [Name] and [job link] before sending. Opurnos never sends anything for you.</p>
        </>
      ) : (
        <Button type="button" variant="secondary" className="mt-4 w-full" onClick={generate} disabled={loading}>
          {loading ? <Spinner /> : null} Draft a referral request
        </Button>
      )}
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
