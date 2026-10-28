"use client";

import { SectionLabel } from "@/components/ui";
import type { Profile } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Education = Profile["education"][number];

// Class 10 and 12 live as high-school education entries, so the eligibility check reads them
// the same way whether the resume parser found them or the student typed them in.
const SCHOOL = {
  12: { label: "Class 12", re: /\b(12(th)?|xii|hsc|higher secondary|intermediate|puc)\b/i },
  10: { label: "Class 10", re: /\b(10(th)?|x|ssc|secondary|matric(ulation)?)\b/i },
} as const;

function schoolEntry(profile: Profile, cls: 10 | 12): Education | undefined {
  return profile.education.find((e) => e.level === "high_school" && SCHOOL[cls].re.test(e.degree));
}

function withSchoolMarks(profile: Profile, cls: 10 | 12, gpa: string): Profile {
  const existing = schoolEntry(profile, cls);
  const value = gpa.trim() || null;
  if (existing) return { ...profile, education: profile.education.map((e) => (e === existing ? { ...e, gpa: value } : e)) };
  if (!value) return profile;
  const entry: Education = { school: "", degree: SCHOOL[cls].label, level: "high_school", field: null, gradYear: null, gpa: value };
  return { ...profile, education: [...profile.education, entry] };
}

export function AcademicsFields({ profile, onChange, field }: { profile: Profile; onChange: (p: Profile) => void; field: string }) {
  const degree = profile.education.find((e) => e.level !== "high_school");
  const setDegree = (patch: Partial<Education>) =>
    onChange({ ...profile, education: profile.education.map((e) => (e === degree ? { ...e, ...patch } : e)) });

  return (
    <div className="p-5 sm:p-7">
      <SectionLabel className="mb-1">Academics</SectionLabel>
      <p className="mb-4 text-[13px] text-muted">
        Indian hiring drives and scholarships cut on these, e.g. &ldquo;60% throughout&rdquo; or &ldquo;no active backlogs&rdquo;. Write marks as they appear: 8.2/10 or 85%.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[13px] text-muted">Degree marks (CGPA or %)</span>
          <input
            className={cn(field, "font-mono tabular")}
            placeholder="8.2/10"
            value={degree?.gpa ?? ""}
            disabled={!degree}
            onChange={(e) => setDegree({ gpa: e.target.value || null })}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[13px] text-muted">Branch</span>
          <input
            className={field}
            placeholder="Computer Science"
            value={degree?.field ?? ""}
            disabled={!degree}
            onChange={(e) => setDegree({ field: e.target.value || null })}
          />
        </label>
        {([12, 10] as const).map((cls) => (
          <label key={cls} className="block">
            <span className="mb-2 block text-[13px] text-muted">{SCHOOL[cls].label} marks</span>
            <input
              className={cn(field, "font-mono tabular")}
              placeholder={cls === 12 ? "88%" : "92%"}
              value={schoolEntry(profile, cls)?.gpa ?? ""}
              onChange={(e) => onChange(withSchoolMarks(profile, cls, e.target.value))}
            />
          </label>
        ))}
        <label className="block">
          <span className="mb-2 block text-[13px] text-muted">Active backlogs</span>
          <input
            className={cn(field, "font-mono tabular")}
            inputMode="numeric"
            placeholder="0"
            value={profile.activeBacklogs ?? ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
              onChange({ ...profile, activeBacklogs: digits ? Number(digits) : null });
            }}
          />
        </label>
      </div>
    </div>
  );
}
