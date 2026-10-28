"use client";

import { Globe, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Deadline, Panel, SectionLabel, Spinner, TypePill } from "@/components/ui";

type Site = { id: string; label: string; url: string; lastCount: number };
type Preview = { url: string; methods: string[]; count: number; sample: { title: string; org: string; type: string; deadline: string | null }[] };

const METHOD_LABEL: Record<string, string> = {
  "structured data": "listings embedded in the page",
  "job board": "the job board it links to",
  feed: "its RSS feed",
};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const json = await fetch(url, init).then((r) => r.json());
  if (!json.ok) throw new Error(json.error);
  return json.data as T;
}

export function WatchWebsite({ mySites }: { mySites: Site[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "previewing" | "saving">("idle");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const post = (save: boolean) => call<Preview>("/api/sources", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, save }) });

  async function onPreview(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setState("previewing");
    setError(null);
    setPreview(null);
    try {
      setPreview(await post(false));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setState("idle");
    }
  }

  async function onWatch() {
    setState("saving");
    setError(null);
    try {
      await post(true);
      // Score the new listings against this profile straight away.
      await call("/api/match", { method: "POST" }).catch(() => undefined);
      setUrl("");
      setPreview(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setState("idle");
    }
  }

  async function onRemove(id: string) {
    setRemoving(id);
    try {
      await call(`/api/sources/${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Panel className="p-5 sm:p-6">
      <SectionLabel>Watch a website</SectionLabel>
      <p className="mt-2 text-sm text-muted">
        Paste a careers page, an events page or a fellowships feed. We read the listings it publishes for search engines, the job board it links to, or its RSS
        feed, and check it again on every scan.
      </p>
      <form onSubmit={onPreview} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="watch-url" className="sr-only">
          Website address
        </label>
        <input
          id="watch-url"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setPreview(null);
          }}
          placeholder="https://example.com/careers"
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-sunken px-3 text-sm placeholder:text-faint focus:border-border-strong focus:outline-none"
        />
        <Button type="submit" variant="secondary" disabled={state !== "idle" || !url.trim()}>
          {state === "previewing" ? <Spinner /> : null}
          {state === "previewing" ? "Reading…" : "Preview"}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="mt-4 rounded-lg border border-border bg-sunken p-4" aria-live="polite">
          {preview.count ? (
            <>
              <p className="text-sm">
                Found <span className="font-mono tabular">{preview.count}</span> listing{preview.count === 1 ? "" : "s"} from{" "}
                {preview.methods.map((m) => METHOD_LABEL[m] ?? m).join(" and ")}.
              </p>
              <ul className="mt-3 space-y-2">
                {preview.sample.map((s) => (
                  <li key={`${s.title}-${s.org}`} className="flex flex-wrap items-center gap-2 text-sm">
                    <TypePill type={s.type} />
                    <span className="min-w-0 truncate">{s.title}</span>
                    <span className="text-xs text-faint">{s.org}</span>
                    {s.deadline ? <Deadline deadline={s.deadline} className="ml-auto" /> : null}
                  </li>
                ))}
              </ul>
              <Button className="mt-4" onClick={onWatch} disabled={state !== "idle"}>
                {state === "saving" ? <Spinner /> : null}
                {state === "saving" ? "Adding…" : "Watch this site"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted">We read the page but found no listings on it. Try the page that lists the openings, or the site&apos;s RSS feed.</p>
          )}
        </div>
      ) : null}

      {mySites.length ? (
        <ul className="mt-5 divide-y divide-border border-t border-border" aria-label="Websites you watch">
          {mySites.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
              <Globe className="size-4 shrink-0 text-faint" aria-hidden />
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate hover:underline">
                {s.label}
              </a>
              <span className="ml-auto font-mono text-xs tabular text-faint">{s.lastCount}</span>
              <Button variant="ghost" size="sm" onClick={() => onRemove(s.id)} disabled={removing === s.id} aria-label={`Stop watching ${s.label}`}>
                {removing === s.id ? <Spinner /> : <Trash2 className="size-4" />}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
