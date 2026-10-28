"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, FileText, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PrefsEditor, TagInput } from "@/components/prefs-editor";
import { Art, Button, Panel, SectionLabel, Spinner } from "@/components/ui";
import type { Preferences, Profile } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { AcademicsFields } from "./academics-fields";

type Step = "resume" | "parsing" | "profile" | "prefs" | "scanning";

const HEADING = "font-display text-[40px] leading-[0.95] text-balance uppercase sm:text-[54px]";

const PARSE_LINES = [
  "Reading layout and sections",
  "Extracting education and graduation year",
  "Pulling experience bullets verbatim",
  "Collecting skills and projects",
  "Inferring the domains you're drawn to",
];

const SCAN_LINES = [
  "Pulling live listings from Devpost, Unstop, Hack Club, SimplifyJobs and company boards",
  "Discarding anything closed or clearly off-profile",
  "Extracting eligibility rules from each listing",
  "Checking every requirement against your profile",
  "Ranking by fit, eligibility, urgency and value",
];

export function Onboarding({
  initialProfile,
  initialPrefs,
  onboarded,
  resumeName,
}: {
  initialProfile: Profile | null;
  initialPrefs: Preferences;
  onboarded: boolean;
  resumeName: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialProfile ? "profile" : "resume");
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [prefs, setPrefs] = useState<Preferences>(() => ({
    ...initialPrefs,
    timezone: initialPrefs.timezone === "UTC" && typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : initialPrefs.timezone,
  }));
  const [error, setError] = useState<string | null>(null);
  const [parsedBy, setParsedBy] = useState<string | null>(null);

  async function upload(form: FormData) {
    setError(null);
    setStep("parsing");
    try {
      const res = await fetch("/api/profile/resume", { method: "POST", body: form });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setProfile(json.data.profile);
      setPrefs((p) => ({ ...p, ...json.data.prefs, timezone: p.timezone }));
      setParsedBy(json.data.parsedBy);
      setStep("profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStep("resume");
    }
  }

  async function finish() {
    if (!profile) return;
    setError(null);
    setStep("scanning");
    try {
      const save = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parsed: profile, prefs, onboarded: true }),
      }).then((r) => r.json());
      if (!save.ok) throw new Error(save.error);
      const match = await fetch("/api/match", { method: "POST" }).then((r) => r.json());
      if (!match.ok) throw new Error(match.error);
      router.push("/radar");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("prefs");
    }
  }

  const stepIndex = { resume: 0, parsing: 0, profile: 1, prefs: 2, scanning: 3 }[step];

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-12 grid grid-cols-4 border-t border-text/80" aria-label="Setup progress">
        {["Resume", "Profile", "Preferences", "Sweep"].map((label, i) => (
          <li
            key={label}
            aria-current={i === stepIndex ? "step" : undefined}
            className={cn("-mt-px border-t-2 pt-3", i === stepIndex ? "border-text" : i < stepIndex ? "border-text/40" : "border-transparent")}
          >
            <span className={cn("font-mono text-[11px] tabular", i <= stepIndex ? "text-label" : "text-faint")}>{String(i + 1).padStart(2, "0")}</span>
            <span className={cn("ml-2 hidden text-[14px] sm:inline", i === stepIndex ? "text-text" : "text-muted")}>{label}</span>
          </li>
        ))}
      </ol>

      {error ? (
        <p role="alert" className="mb-6 border-l-2 border-danger py-1 pl-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === "resume" && <ResumeStep onSubmit={upload} existing={resumeName} onCancel={profile ? () => setStep("profile") : undefined} />}
          {step === "parsing" && <Theatre title="Reading your resume" lines={PARSE_LINES} />}
          {step === "profile" && profile && (
            <ProfileStep profile={profile} onChange={setProfile} parsedBy={parsedBy} onReupload={() => setStep("resume")} onNext={() => setStep("prefs")} />
          )}
          {step === "prefs" && (
            <div>
              <h1 className={HEADING}>
                What are you <em className="font-serif normal-case italic">hunting</em> for?
              </h1>
              <p className="mt-4 text-[16px] text-muted">This decides what we watch and how strictly we judge eligibility. You can change it any time.</p>
              <Panel className="mt-8 p-5 sm:p-7">
                <PrefsEditor prefs={prefs} onChange={setPrefs} />
              </Panel>
              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep("profile")}>
                  Back
                </Button>
                <Button size="lg" onClick={finish}>
                  {onboarded ? "Save & rescan" : "Start my radar"} <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
          {step === "scanning" && <Theatre title="Sweeping the web" lines={SCAN_LINES} radar slow />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ResumeStep({ onSubmit, existing, onCancel }: { onSubmit: (f: FormData) => void; existing: string | null; onCancel?: () => void }) {
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(
    (file: File) => {
      const f = new FormData();
      f.set("file", file);
      onSubmit(f);
    },
    [onSubmit],
  );

  return (
    <div>
      <h1 className={HEADING}>
        Start with <em className="font-serif normal-case italic">your</em> resume
      </h1>
      <p className="mt-4 max-w-xl text-[16px] text-muted">
        The model reads it once, including layout, tables and columns. Every claim we make later is checked against it, so nothing gets invented.
      </p>
      {!paste ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const file = e.dataTransfer.files[0];
            if (file) send(file);
          }}
          className={cn(
            "group relative mt-8 flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-14 text-center transition-colors",
            drag ? "border-text bg-sage/30" : "border-text/35 bg-surface hover:border-text/60",
          )}
        >
          <motion.div animate={drag ? { y: -6, rotate: -4 } : { y: 0, rotate: 0 }}>
            <Art name="inkwell" className="h-24 w-16" />
          </motion.div>
          <p className="mt-5 font-serif text-[22px]">Drop your resume PDF here</p>
          <p className="mt-1 text-sm text-muted">or</p>
          <Button className="mt-3" variant="secondary" onClick={() => inputRef.current?.click()}>
            Choose a file
          </Button>
          <p className="mt-4 font-mono text-[11px] text-faint">PDF · up to 5 MB · stored privately, deletable any time</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) send(file);
            }}
          />
        </div>
      ) : (
        <div className="mt-8">
          <label htmlFor="resume-text" className="sr-only">
            Resume text
          </label>
          <textarea
            id="resume-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            placeholder="Paste the full text of your resume…"
            className="w-full rounded-md border border-text/30 bg-surface p-5 text-[15px] leading-relaxed placeholder:text-faint focus:border-text focus:outline-none"
          />
          <div className="mt-3 flex justify-end">
            <Button
              disabled={text.trim().length < 80}
              onClick={() => {
                const f = new FormData();
                f.set("text", text);
                onSubmit(f);
              }}
            >
              Read it <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
        <button type="button" onClick={() => setPaste(!paste)} className="inline-flex items-center gap-1.5 text-muted underline-offset-4 hover:text-text hover:underline">
          <FileText className="size-4" />
          {paste ? "Upload a PDF instead" : "No PDF? Paste text"}
        </button>
        {existing ? <span className="font-mono text-xs text-faint">Current: {existing}</span> : null}
        {onCancel ? (
          <button type="button" onClick={onCancel} className="text-muted hover:text-text">
            Keep current profile
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Theatre({ title, lines, radar, slow }: { title: string; lines: string[]; radar?: boolean; slow?: boolean }) {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setShown((n) => Math.min(lines.length, n + 1)), slow ? 2600 : 1400);
    return () => clearInterval(id);
  }, [lines.length, slow]);
  return (
    <div className="flex flex-col items-center py-10 text-center" aria-live="polite">
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
        {radar ? <Art name="lighthouse" className="h-44 w-32" /> : <Art name="microscope" className="h-44 w-20" />}
      </motion.div>
      <h2 className="mt-8 font-display text-[34px] uppercase">{title}</h2>
      <ul className="mt-6 space-y-2.5 text-left text-sm">
        {lines.map((l, i) => (
          <motion.li key={l} initial={{ opacity: 0, x: -6 }} animate={{ opacity: i < shown ? 1 : 0.25, x: 0 }} className="flex items-center gap-3">
            {i < shown - 1 ? (
              <span className="grid size-4 place-items-center rounded-full bg-eligible/20 text-[10px] text-eligible">✓</span>
            ) : i === shown - 1 ? (
              <Spinner className="size-4" />
            ) : (
              <span className="size-4 rounded-full border border-border-strong" />
            )}
            <span className={i < shown ? "text-text" : "text-faint"}>{l}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function ProfileStep({
  profile,
  onChange,
  parsedBy,
  onReupload,
  onNext,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  parsedBy: string | null;
  onReupload: () => void;
  onNext: () => void;
}) {
  const edu = profile.education[0];
  const setEdu = (patch: Partial<NonNullable<typeof edu>>) =>
    onChange({ ...profile, education: edu ? [{ ...edu, ...patch }, ...profile.education.slice(1)] : profile.education });
  const field = "h-11 w-full rounded-md border border-text/25 bg-surface px-3.5 text-[15px] focus:border-text focus:outline-none disabled:opacity-50";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={HEADING}>
            Is this <em className="font-serif normal-case italic">you</em>?
          </h1>
          <p className="mt-4 text-[16px] text-muted">Fix anything we got wrong. Eligibility checks depend on these facts.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReupload}>
          <RotateCcw className="size-3.5" /> Re-upload
        </Button>
      </div>
      {parsedBy === "rules" ? (
        <p className="mt-5 border-l-2 border-signal py-1 pl-3 text-[13px] text-muted">
          Parsed with offline rules because no OpenAI key is set on this server. With one, the model reads the PDF directly and gets much more right.
        </p>
      ) : null}

      <Panel className="mt-8 divide-y divide-border">
        <motion.div
          className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          {[
            <label key="name" className="block">
              <SectionLabel className="mb-2">Name</SectionLabel>
              <input className={field} value={profile.name} onChange={(e) => onChange({ ...profile, name: e.target.value })} />
            </label>,
            <label key="country" className="block">
              <SectionLabel className="mb-2">Country (ISO code)</SectionLabel>
              <input className={field} value={profile.country ?? ""} maxLength={2} onChange={(e) => onChange({ ...profile, country: e.target.value.toUpperCase() || null })} />
            </label>,
            <label key="headline" className="block sm:col-span-2">
              <SectionLabel className="mb-2">Headline</SectionLabel>
              <input className={field} value={profile.headline} onChange={(e) => onChange({ ...profile, headline: e.target.value })} />
            </label>,
            <label key="school" className="block">
              <SectionLabel className="mb-2">School</SectionLabel>
              <input className={field} value={edu?.school ?? ""} disabled={!edu} onChange={(e) => setEdu({ school: e.target.value })} />
            </label>,
            <label key="grad" className="block">
              <SectionLabel className="mb-2">Graduation year</SectionLabel>
              <input
                className={cn(field, "font-mono tabular")}
                inputMode="numeric"
                value={edu?.gradYear ?? ""}
                disabled={!edu}
                onChange={(e) => setEdu({ gradYear: Number(e.target.value.replace(/\D/g, "").slice(0, 4)) || null })}
              />
            </label>,
          ].map((child, i) => (
            <motion.div key={i} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className={i === 2 ? "sm:col-span-2" : undefined}>
              {child}
            </motion.div>
          ))}
        </motion.div>
        <div className="space-y-6 p-5 sm:p-7">
          <TagInput label="Skills" values={profile.skills} onChange={(skills) => onChange({ ...profile, skills })} placeholder="Add a skill" />
          <TagInput label="Interests" values={profile.interests} onChange={(interests) => onChange({ ...profile, interests })} placeholder="Add an interest" />
        </div>
        <AcademicsFields profile={profile} onChange={onChange} field={field} />
        {profile.experience.length ? (
          <div className="p-5 sm:p-7">
            <SectionLabel className="mb-3">Experience we found</SectionLabel>
            <ul className="space-y-3">
              {profile.experience.map((x, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{x.title}</span>
                  <span className="text-muted"> · {x.org}</span>
                  {x.bullets[0] ? <p className="mt-1 line-clamp-2 text-muted">{x.bullets[0]}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>
      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={onNext}>
          Looks right <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
