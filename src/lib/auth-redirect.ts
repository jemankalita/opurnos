/** Only a path on this site. Rejects protocol-relative and backslash tricks. */
export function safeNext(next: unknown, fallback = "/radar"): string {
  if (typeof next !== "string" || next.length > 500) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.includes("://")) return fallback;
  return next;
}
