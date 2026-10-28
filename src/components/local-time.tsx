"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * A timestamp in the viewer's own locale and timezone. The server can't know either, so it renders
 * a fixed UTC form and the client swaps in the local one after hydration (no mismatch warning).
 */
export function LocalTime({ value, options }: { value: string | Date; options?: Intl.DateTimeFormatOptions }) {
  const date = new Date(value);
  const opts = options ?? { dateStyle: "medium", timeStyle: "short" };
  const text = useSyncExternalStore(
    noopSubscribe,
    () => date.toLocaleString(undefined, opts),
    () => `${date.toLocaleString("en-US", { ...opts, timeZone: "UTC" })} UTC`,
  );
  return <time dateTime={date.toISOString()}>{text}</time>;
}
