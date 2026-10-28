import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrgAvatar, TypePill } from "@/components/ui";
import { HttpError, requireUser } from "@/lib/auth";
import { getApplicationView } from "@/lib/apply/service";
import { ApplyStudio } from "./apply-studio";

export const metadata: Metadata = { title: "Apply Studio" };

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireUser();
  const { id } = await params;
  const view = await getApplicationView(userId, id).catch((err) => {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  });
  const { opp } = view;
  return (
    <div>
      <Link href={`/o/${opp.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Back to opportunity
      </Link>
      <header className="mt-6 flex items-center gap-4">
        <OrgAvatar org={opp.org} logo={opp.orgLogo} size={44} />
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Apply Studio</p>
          <h1 className="truncate font-serif text-2xl sm:text-3xl">{opp.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className="truncate">{opp.org}</span>
            <TypePill type={opp.type} />
          </div>
        </div>
      </header>
      <ApplyStudio applicationId={id} applyUrl={opp.applyUrl ?? opp.url} host={safeHost(opp.applyUrl ?? opp.url)} />
    </div>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "the application site";
  }
}
