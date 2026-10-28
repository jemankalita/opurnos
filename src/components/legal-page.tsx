import type { ReactNode } from "react";

/** Long-form policy text in the site's type, without a typography plugin. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="max-w-[70ch]">
      <p className="label">Policy</p>
      <h1 className="mt-3 font-display text-[40px] leading-[0.95] uppercase md:text-[52px]">{title}</h1>
      <p className="mt-3 font-mono text-[12px] text-faint">Last updated {updated}</p>
      <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-muted [&_a]:text-text [&_a]:underline [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-[22px] [&_h2]:uppercase [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
