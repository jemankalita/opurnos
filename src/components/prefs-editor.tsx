"use client";

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { OPPORTUNITY_TYPES, type Preferences } from "@/lib/schemas";
import { cn, TYPE_LABEL } from "@/lib/utils";

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
        active ? "border-text bg-sage/30 text-text" : "border-border-strong text-muted hover:border-text/25 hover:text-text",
      )}
    >
      {active ? <Check className="size-3.5 text-text" /> : null}
      {children}
    </button>
  );
}

export function TagInput({
  label,
  values,
  onChange,
  placeholder,
  transform = (v) => v,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  transform?: (v: string) => string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = transform(draft.trim());
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{label}</div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-border-strong bg-surface p-1.5 focus-within:border-text">
        {values.map((v) => (
          <span key={v} className="inline-flex h-7 items-center gap-1 rounded-full bg-elevated pl-2.5 pr-1 text-[13px]">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="grid size-5 place-items-center rounded-full text-muted hover:bg-border hover:text-text" aria-label={`Remove ${v}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={add}
          placeholder={values.length ? "" : placeholder}
          aria-label={label}
          className="h-7 min-w-32 flex-1 bg-transparent px-1.5 text-sm placeholder:text-faint focus:outline-none"
        />
        {draft ? (
          <button type="button" onClick={add} className="grid size-7 place-items-center rounded-full text-muted hover:text-text" aria-label="Add">
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-border p-3.5">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-border-strong")}
      >
        <span className={cn("absolute top-0.5 left-0 size-5 rounded-full bg-bg transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

export function PrefsEditor({ prefs, onChange }: { prefs: Preferences; onChange: (p: Preferences) => void }) {
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => onChange({ ...prefs, [k]: v });
  const toggleType = (t: (typeof OPPORTUNITY_TYPES)[number]) => {
    const next = prefs.types.includes(t) ? prefs.types.filter((x) => x !== t) : [...prefs.types, t];
    if (next.length) set("types", next);
  };
  return (
    <div className="space-y-7">
      <div>
        <div className="mb-2 text-sm font-medium">What should we watch for?</div>
        <div className="flex flex-wrap gap-2">
          {OPPORTUNITY_TYPES.map((t) => (
            <Chip key={t} active={prefs.types.includes(t)} onClick={() => toggleType(t)}>
              {TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </div>
      <TagInput label="Roles & topics" values={prefs.roles} onChange={(v) => set("roles", v)} placeholder="e.g. software engineering, ML research, robotics" />
      <TagInput label="Preferred locations" values={prefs.locations} onChange={(v) => set("locations", v)} placeholder="e.g. Bangalore, London, San Francisco" />
      <TagInput
        label="Where can you work without a visa? (country codes)"
        values={prefs.workAuth}
        onChange={(v) => set("workAuth", v)}
        placeholder="e.g. IN, US"
        transform={(v) => v.toUpperCase().slice(0, 2)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle checked={prefs.remoteOk} onChange={(v) => set("remoteOk", v)} label="Remote is fine" hint="Include online hackathons and remote roles" />
        <Toggle checked={prefs.needsSponsorship} onChange={(v) => set("needsSponsorship", v)} label="I need visa sponsorship" hint="Hides roles that say they can't sponsor" />
      </div>
      <div>
        <div className="mb-2 text-sm font-medium">Email digest</div>
        <div className="inline-flex rounded-md border border-border-strong p-1" role="radiogroup" aria-label="Email digest frequency">
          {(["daily", "weekly", "off"] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={prefs.digest === d}
              onClick={() => set("digest", d)}
              className={cn("h-8 rounded-md px-4 text-sm capitalize transition-colors", prefs.digest === d ? "bg-elevated text-text" : "text-muted hover:text-text")}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
