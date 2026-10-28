import type { Metadata } from "next";
import { ButtonLink, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getPipeline } from "@/lib/queries";
import { Board } from "./board";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const { userId } = await requireUser();
  const items = await getPipeline(userId);
  return (
    <div>
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Pipeline</p>
        <h1 className="mt-1 font-display text-[34px] leading-[0.95] uppercase sm:text-[44px]">Where everything stands</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">Drag cards between columns as things move. Applications sent through Opurnos move on their own.</p>
      </header>
      <div className="mt-8">
        {items.length ? (
          <Board initial={items.map((i) => ({ ...i, deadline: i.deadline ? i.deadline.toISOString() : null }))} />
        ) : (
          <EmptyState
            title="Nothing in motion yet"
            body="Save opportunities from your radar (press S) and they'll show up here."
            action={<ButtonLink href="/radar">Open radar</ButtonLink>}
          />
        )}
      </div>
    </div>
  );
}
