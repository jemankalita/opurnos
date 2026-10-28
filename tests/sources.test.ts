import { afterEach, describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";
import { HttpError } from "@/lib/auth";
import { BudgetExceededError } from "@/lib/ai/client";
import { ashby, greenhouse, lever } from "@/lib/connectors/ats";
import { devpost, hackclub, unstop } from "@/lib/connectors/hackathons";
import { allConnectors } from "@/lib/connectors";
import { simplify } from "@/lib/connectors/simplify";
import { fetchJson } from "@/lib/connectors/types";
import { mapLimit } from "@/lib/concurrency";
import { bearerMatches, fail, handle, ok } from "@/lib/http";

type Route = (url: string) => unknown;

function stubFetch(route: Route) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      const body = route(url);
      if (body instanceof Response) return body;
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchJson", () => {
  it("sends a descriptive user agent and parses JSON", async () => {
    stubFetch(() => ({ hello: "world" }));
    expect(await fetchJson("https://x.test/a")).toEqual({ hello: "world" });
    const init = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1];
    expect((init.headers as Record<string, string>)["user-agent"]).toMatch(/OpurnosBot/);
  });

  it("does not retry 404s", async () => {
    const calls = stubFetch(() => new Response("nope", { status: 404 }));
    await expect(fetchJson("https://x.test/missing")).rejects.toThrow(/404/);
    expect(calls).toHaveLength(1);
  });

  it("sends a JSON POST when given a body", async () => {
    stubFetch(() => ({ ok: true }));
    await fetchJson("https://x.test/search", { body: { q: 1 } });
    const init = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"q":1}');
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
  });

  it("retries server errors and then gives up", async () => {
    const calls = stubFetch(() => new Response("boom", { status: 503 }));
    await expect(fetchJson("https://x.test/flaky", { retries: 1 })).rejects.toThrow(/HTTP 503/);
    expect(calls).toHaveLength(2);
  });
});

describe("connectors fetch + map", () => {
  it("greenhouse, lever and ashby hit their public board APIs", async () => {
    const calls = stubFetch((url) => {
      if (url.includes("greenhouse")) return { jobs: [{ id: 1, title: "SWE Intern", absolute_url: "https://g/1", location: { name: "Remote" }, content: "x" }] };
      if (url.includes("lever")) return [{ id: "l", text: "Engineer", hostedUrl: "https://l", applyUrl: "https://l/apply" }];
      return { jobs: [{ id: "a", title: "PM", jobUrl: "https://a", applyUrl: "https://a/apply", isListed: true }, { id: "b", title: "Hidden", jobUrl: "https://b", applyUrl: "https://b", isListed: false }] };
    });
    expect(await greenhouse("stripe", "Stripe").fetch()).toHaveLength(1);
    expect(await lever("palantir", "Palantir").fetch()).toHaveLength(1);
    expect(await ashby("openai", "OpenAI").fetch()).toHaveLength(1);
    expect(calls[0]).toContain("boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true");
    expect(calls[2]).toContain("includeCompensation=true");
  });

  it("hack club maps the upcoming list", async () => {
    stubFetch(() => [{ id: "h", name: "Hack", website: "https://h", start: "2099-01-01", end: "2099-01-02", virtual: true }]);
    const out = await hackclub.fetch();
    expect(out[0].type).toBe("hackathon");
  });

  it("devpost pages until empty and drops invite-only events", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 500 });
    const calls = stubFetch((url) =>
      url.endsWith("page=1")
        ? { hackathons: [{ id: 1, title: "Open", url: "https://d/1" }, { id: 2, title: "Private", url: "https://d/2", invite_only: true }] }
        : { hackathons: [] },
    );
    const out = await devpost.fetch();
    expect(out.map((o) => o.title)).toEqual(["Open"]);
    expect(calls).toHaveLength(2);
  });

  it("unstop stops at the last page", async () => {
    const calls = stubFetch(() => ({ data: { last_page: 1, data: [{ id: 1, title: "Sprint", type: "hackathons", seo_url: "https://u/1" }] } }));
    const out = await unstop("hackathons").fetch();
    expect(out).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });

  it("simplify keeps only active, visible, recent listings", async () => {
    const now = Date.now() / 1000;
    stubFetch(() => [
      { id: "1", company_name: "A", title: "Intern", url: "https://a", active: true, is_visible: true, date_updated: now },
      { id: "2", company_name: "B", title: "Intern", url: "https://b", active: false, is_visible: true, date_updated: now },
      { id: "3", company_name: "C", title: "Intern", url: "https://c", active: true, is_visible: true, date_updated: now - 400 * 86_400 },
    ]);
    const out = await simplify("internships").fetch();
    expect(out.map((o) => o.org)).toEqual(["A"]);
  });

  it("registers every source with a unique id", () => {
    const ids = allConnectors().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["devpost", "hackclub", "simplify:internships", "greenhouse:anthropic"]));
  });
});

describe("mapLimit", () => {
  it("preserves order and bounds concurrency", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([5, 1, 3, 2], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, n));
      active--;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 30, 20]);
    expect(peak).toBe(2);
  });
});

describe("http helpers", () => {
  const read = async (res: Response) => ({ status: res.status, body: await res.json() });

  it("wraps data and errors in the API envelope", async () => {
    expect(await read(ok({ a: 1 }))).toEqual({ status: 200, body: { ok: true, data: { a: 1 } } });
    expect(await read(fail(418, "teapot"))).toEqual({ status: 418, body: { ok: false, error: "teapot" } });
  });

  it("maps known errors and hides internals", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const run = (err: unknown) => handle(async () => Promise.reject(err))();
    expect(await read(await run(new HttpError(404, "gone")))).toEqual({ status: 404, body: { ok: false, error: "gone" } });
    expect((await run(new BudgetExceededError())).status).toBe(429);
    const zodErr = (() => {
      try {
        z.object({ email: z.string() }).parse({});
      } catch (e) {
        return e as ZodError;
      }
    })();
    const zodRes = await read(await run(zodErr));
    expect(zodRes.status).toBe(400);
    expect(zodRes.body.error).toContain("email");
    const crash = await read(await run(new Error("db password leaked")));
    expect(crash.status).toBe(500);
    expect(crash.body.error).not.toContain("password");
    spy.mockRestore();
  });

  it("checks bearer secrets", () => {
    const req = (h?: string) => new Request("https://x", { headers: h ? { authorization: h } : {} });
    expect(bearerMatches(req("Bearer s3cret"), "s3cret")).toBe(true);
    expect(bearerMatches(req("Bearer s3creT"), "s3cret")).toBe(false);
    expect(bearerMatches(req("Bearer short"), "s3cret")).toBe(false);
    expect(bearerMatches(req(), "s3cret")).toBe(false);
    expect(bearerMatches(req("Bearer anything"), undefined)).toBe(false);
  });
});
