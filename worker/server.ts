/**
 * Apply worker: runs the browser agent outside the web tier (serverless functions can't hold a
 * Chrome session open between "fill" and "submit"). Must run as a single instance, because live
 * browser sessions are kept in memory between the two phases.
 *
 *   APPLY_WORKER_SECRET=... DATABASE_URL=... npx tsx worker/server.ts
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import { runPhase } from "@/lib/apply/service";
import { env } from "@/lib/env";

const PORT = Number(process.env.PORT ?? 8787);
const MAX_BODY_BYTES = 4096;
const Job = z.object({ applicationId: z.string().min(1).max(64), phase: z.enum(["fill", "submit"]) });

if (!env.APPLY_WORKER_SECRET) throw new Error("APPLY_WORKER_SECRET is required to run the worker.");
if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required: the worker and the web app must share one Postgres.");

let running = 0;

function authorized(req: IncomingMessage) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const secret = env.APPLY_WORKER_SECRET ?? "";
  if (token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

async function readBody(req: IncomingMessage): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error("Body too large");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true, running });
  if (req.method !== "POST" || req.url !== "/run") return send(res, 404, { ok: false, error: "Not found" });
  if (!authorized(req)) return send(res, 401, { ok: false, error: "Unauthorized" });
  try {
    const job = Job.parse(JSON.parse(await readBody(req)));
    running++;
    // Acknowledge immediately; the web app follows progress through run_steps.
    void runPhase(job.applicationId, job.phase)
      .catch((err) => console.error(`[worker] ${job.phase} ${job.applicationId} crashed:`, err))
      .finally(() => running--);
    return send(res, 202, { ok: true });
  } catch (err) {
    return send(res, 400, { ok: false, error: err instanceof Error ? err.message : "Bad request" });
  }
});

server.listen(PORT, () => console.log(`[worker] listening on :${PORT}`));
