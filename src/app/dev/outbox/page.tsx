import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { isDev } from "@/lib/env";

export const metadata: Metadata = { title: "Dev outbox" };

/** Local-only inbox: every email we "sent" without a provider, rendered as the recipient would see it. */
export default async function OutboxPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (!isDev) notFound();
  const { email } = await requireUser();
  const { id } = await searchParams;
  const db = await getDb();
  const mails = await db.select().from(schema.outbox).where(eq(schema.outbox.to, email)).orderBy(desc(schema.outbox.createdAt)).limit(30);
  const current = mails.find((m) => m.id === id) ?? mails[0];

  return (
    <div className="grid min-h-dvh md:grid-cols-[300px_1fr]">
      <aside className="border-b border-border p-4 md:border-r md:border-b-0">
        <Link href="/radar" className="text-sm text-muted hover:text-text">
          ← Back to app
        </Link>
        <h1 className="mt-4 font-serif text-2xl">Dev outbox</h1>
        <p className="mt-1 text-xs text-muted">Emails to {email}. Shown only in development.</p>
        <ul className="mt-4 space-y-1">
          {mails.map((m) => (
            <li key={m.id}>
              <Link
                href={`/dev/outbox?id=${m.id}`}
                className={`block rounded-md px-3 py-2 text-sm ${m.id === current?.id ? "bg-elevated text-text" : "text-muted hover:bg-elevated/60"}`}
              >
                <div className="truncate">{m.subject}</div>
                <div className="font-mono text-[10px] text-faint">
                  {m.provider} · {m.createdAt.toLocaleString()}
                </div>
              </Link>
            </li>
          ))}
          {!mails.length ? <li className="text-sm text-muted">No emails yet.</li> : null}
        </ul>
      </aside>
      <main className="bg-sunken">
        {current ? <iframe title={current.subject} srcDoc={current.html} sandbox="allow-popups allow-popups-to-escape-sandbox" className="h-dvh w-full border-0" /> : null}
      </main>
    </div>
  );
}
