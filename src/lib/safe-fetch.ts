import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetching URLs that users type in. Without these checks a user could point the server at
// localhost, the cloud metadata endpoint or the private network (SSRF).
// Residual risk: fetch() resolves DNS again after our check, so a hostile DNS server could
// rebind between the two lookups. Pinning the resolved IP needs a custom dispatcher; do that
// before exposing this beyond trusted users at scale.

const UA = "OpurnosBot/0.1 (+https://github.com/jemankalita/opurnos; opportunity discovery for students)";
const MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 3_000_000;
const DEFAULT_TIMEOUT_MS = 20_000;
// Some sites answer robots.txt very slowly (luma.com takes ~12 s); treat that like a missing file.
const ROBOTS_TIMEOUT_MS = 5_000;

export class UnsafeUrlError extends Error {}

function ipv4Parts(ip: string): number[] | null {
  const parts = ip.split(".").map(Number);
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? parts : null;
}

/** Loopback, private, link-local, CGNAT, multicast and other non-public ranges. */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ipv4Parts(ip);
  if (v4) {
    const [a, b] = v4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  return /^(fc|fd|fe[89ab]|ff)/.test(v6) || v6.startsWith("64:ff9b:");
}

/** Throws unless the URL is plain http(s) on a default port and every address it resolves to is public. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new UnsafeUrlError("Only http and https links are supported.");
  if (url.username || url.password) throw new UnsafeUrlError("Links with a username or password aren't supported.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("Only standard web ports are supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) throw new UnsafeUrlError("That address isn't on the public internet.");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) throw new UnsafeUrlError(`Couldn't find ${host}. Check the address.`);
  if (addresses.some(isPrivateAddress)) throw new UnsafeUrlError("That address isn't on the public internet.");
  return url;
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("The page is too large to read.");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export type SafeResponse = { url: string; status: number; contentType: string; body: string };

/** GET a user-supplied URL, re-checking every redirect hop. Never throws on 4xx/5xx; the caller decides. */
export async function safeFetch(
  raw: string,
  { maxBytes = DEFAULT_MAX_BYTES, timeoutMs = DEFAULT_TIMEOUT_MS, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" } = {},
): Promise<SafeResponse> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA, accept }, signal: controller.signal });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, url).toString();
        continue;
      }
      return { url: url.toString(), status: res.status, contentType: res.headers.get("content-type") ?? "", body: await readCapped(res, maxBytes) };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw new Error("The site took too long to respond.");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects.");
}

// ---------- robots.txt ----------

/** Longest matching Allow/Disallow rule wins (RFC 9309). Groups for "*" and for our bot both apply. */
export function robotsAllows(robotsTxt: string, path: string, agent = "opurnosbot"): boolean {
  const rules: { allow: boolean; prefix: string }[] = [];
  let groupApplies = false;
  let lastWasAgent = false;
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      const matches = value === "*" || agent.includes(value.toLowerCase());
      // Consecutive User-agent lines share one group.
      groupApplies = lastWasAgent ? groupApplies || matches : matches;
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!groupApplies || (key !== "allow" && key !== "disallow") || !value) continue;
    rules.push({ allow: key === "allow", prefix: value.replace(/\*$/, "") });
  }
  const best = rules.filter((r) => path.startsWith(r.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return best ? best.allow : true;
}

/** A missing or unreadable robots.txt means no restrictions. */
export async function isAllowedByRobots(raw: string): Promise<boolean> {
  const url = new URL(raw);
  const robots = await safeFetch(`${url.origin}/robots.txt`, { maxBytes: 500_000, accept: "text/plain", timeoutMs: ROBOTS_TIMEOUT_MS }).catch(() => null);
  if (!robots || robots.status >= 400) return true;
  return robotsAllows(robots.body, url.pathname + url.search);
}
