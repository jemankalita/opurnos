import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";
import { BudgetExceededError } from "./ai/client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, init);
}

export function fail(status: number, error: string) {
  return NextResponse.json<ApiResult<never>>({ ok: false, error }, { status });
}

/** Wraps a route handler: maps known errors to clean JSON, logs the rest without leaking internals. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message);
      if (err instanceof BudgetExceededError) return fail(429, err.message);
      if (err instanceof ZodError) return fail(400, err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "));
      console.error("[api] unhandled", err);
      return fail(500, "Something went wrong on our side. Please try again.");
    }
  };
}

/** Constant-time-ish bearer check for cron/worker endpoints. */
export function bearerMatches(req: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}
