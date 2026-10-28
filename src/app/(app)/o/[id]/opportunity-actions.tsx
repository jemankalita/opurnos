"use client";

import { ArrowRight, Bookmark, BookmarkCheck, ExternalLink, ThumbsDown, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, buttonClass, Spinner } from "@/components/ui";

const ACTIVE_STATES = new Set(["drafting", "review_materials", "queued", "filling", "awaiting_approval", "submitting", "handoff", "submitted"]);

export function OpportunityActions({
  opportunityId,
  status,
  applicationId,
  applicationState,
  url,
  autoApply,
  canApply,
}: {
  opportunityId: string;
  status: string | null;
  applicationId: string | null;
  applicationState: string | null;
  url: string;
  autoApply: boolean;
  canApply: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(status === "saved");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);
  const hasApplication = applicationId && applicationState && ACTIVE_STATES.has(applicationState);

  async function start() {
    if (hasApplication) return router.push(`/apply/${applicationId}`);
    setStarting(true);
    setError(null);
    try {
      const json = await fetch("/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ opportunityId }),
      }).then((r) => r.json());
      if (!json.ok) throw new Error(json.error);
      router.push(`/apply/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the application.");
      setStarting(false);
    }
  }

  // "Apply now" from the email lands here with ?apply=1; drafting is safe (nothing is submitted).
  useEffect(() => {
    if (autoApply && canApply && !fired.current) {
      fired.current = true;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/matches/${opportunityId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  return (
    <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
      <div className="flex flex-wrap gap-2 md:flex-nowrap">
        <Button size="lg" onClick={start} disabled={starting || (!canApply && !hasApplication)} className="basis-full sm:basis-auto sm:flex-1 md:flex-none">
          {starting ? <Spinner /> : hasApplication ? <ArrowRight className="size-4" /> : <Wand2 className="size-4" />}
          {starting ? "Tailoring your materials…" : hasApplication ? "Continue application" : "Apply with Opurnos"}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-12 px-0"
          aria-label={saved ? "Unsave" : "Save"}
          onClick={() => {
            setSaved(!saved);
            void patch({ status: saved ? "new" : "saved", feedback: saved ? null : 1 });
          }}
        >
          {saved ? <BookmarkCheck className="size-4 text-text" /> : <Bookmark className="size-4" />}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-12 px-0"
          aria-label="Not for me"
          onClick={async () => {
            await patch({ status: "dismissed", feedback: -1 });
            router.push("/radar");
          }}
        >
          <ThumbsDown className="size-4" />
        </Button>
        <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "lg", "w-12 px-0")} aria-label="Open original listing">
          <ExternalLink className="size-4" />
        </a>
      </div>
      {starting ? <p className="text-xs text-muted">Drafting from your resume, then checking every claim. About 20 seconds.</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
