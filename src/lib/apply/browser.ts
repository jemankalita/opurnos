import type { Browser, Page } from "playwright-core";
import { env } from "../env";

export type FormField = {
  id: string;
  tag: string;
  type: string;
  role: string;
  label: string;
  required: boolean;
  value: string;
  options?: string[];
  text?: string;
};

export type Action =
  | { kind: "fill"; id: string; value: string }
  | { kind: "select"; id: string; option: string }
  | { kind: "check"; id: string; checked: boolean }
  | { kind: "upload"; id: string }
  | { kind: "click"; id: string }
  | { kind: "click_xy"; x: number; y: number }
  | { kind: "scroll"; dy: number }
  | { kind: "press"; key: string };

export const SUBMIT_RE = /\b(submit|send application|apply now|finish application|complete application)\b/i;
const CONFIRM_RE = /(thank you|thanks for applying|application (has been )?(received|submitted)|we('| ha)ve received|successfully submitted)/i;
const VIEWPORT = { width: 1280, height: 900 };

export async function launchBrowser(): Promise<{ browser: Browser; page: Page }> {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    headless: env.BROWSER_HEADLESS === "true",
    ...(env.BROWSER_EXECUTABLE ? { executablePath: env.BROWSER_EXECUTABLE } : { channel: env.BROWSER_CHANNEL }),
    args: ["--disable-blink-features=AutomationControlled"],
  });
  // Fresh, isolated context per application: no cookies or storage leak between users.
  const context = await browser.newContext({ viewport: VIEWPORT, locale: "en-US" });
  // tsx/esbuild (keepNames) wraps functions in __name(); evaluate() ships them to the page, so define it there.
  await context.addInitScript({ content: "globalThis.__name ??= (fn) => fn;" });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  return { browser, page };
}

export async function screenshot(page: Page): Promise<string> {
  const buf = await page.screenshot({ type: "jpeg", quality: 55 });
  return buf.toString("base64");
}

/** Tags interactive elements with data-op-id and returns a compact description of each. */
export async function snapshotFields(page: Page): Promise<FormField[]> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const s = getComputedStyle(el as HTMLElement);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const clean = (t: string | null | undefined) => (t ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
    // "Select...", "Choose one", "--" and empty-value options are placeholders, not answers.
    const selectValue = (sel: HTMLSelectElement) => {
      const opt = sel.selectedOptions[0];
      if (!opt || opt.value === "" || /^(select|choose|please select|--)/i.test(opt.text.trim())) return "";
      return clean(opt.text);
    };
    const labelFor = (el: HTMLElement): string => {
      if (el.id) {
        const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`) as HTMLElement | null;
        if (l?.innerText) return clean(l.innerText);
      }
      const aria = el.getAttribute("aria-label");
      if (aria) return clean(aria);
      const by = el.getAttribute("aria-labelledby");
      if (by) return clean(by.split(/\s+/).map((id) => document.getElementById(id)?.innerText ?? "").join(" "));
      const wrap = el.closest("label") as HTMLElement | null;
      if (wrap?.innerText) return clean(wrap.innerText);
      let p = el.parentElement;
      for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
        const t = p.querySelector("label, legend, [class*='label']") as HTMLElement | null;
        if (t?.innerText && !t.contains(el)) return clean(t.innerText);
      }
      return clean(el.getAttribute("placeholder") || el.getAttribute("name") || "");
    };
    const nodes = Array.from(
      document.querySelectorAll(
        "input, textarea, select, button, [role=button], [role=combobox], [role=checkbox], [role=radio], a[href*='apply']",
      ),
    ) as HTMLElement[];
    const out: Array<Record<string, unknown>> = [];
    let n = 0;
    for (const el of nodes) {
      const input = el as HTMLInputElement;
      const type = (input.type || "").toLowerCase();
      if (type === "hidden") continue;
      // File inputs are often visually hidden behind an "Attach" button; keep them.
      if (type !== "file" && !visible(el)) continue;
      if (out.length >= 160) break;
      const id = `f${n++}`;
      el.setAttribute("data-op-id", id);
      const tag = el.tagName.toLowerCase();
      const field: Record<string, unknown> = {
        id,
        tag,
        type,
        role: el.getAttribute("role") ?? "",
        label: labelFor(el),
        required: input.required || el.getAttribute("aria-required") === "true" || /\*\s*$/.test(labelFor(el)),
        value: tag === "select" ? selectValue(el as HTMLSelectElement) : type === "checkbox" || type === "radio" ? String(input.checked) : clean(input.value),
      };
      if (tag === "select") field.options = Array.from((el as HTMLSelectElement).options).map((o) => clean(o.text)).slice(0, 40);
      if (tag === "button" || el.getAttribute("role") === "button" || tag === "a" || type === "submit") field.text = clean(el.innerText || input.value);
      out.push(field);
    }
    return out;
  }) as Promise<FormField[]>;
}

/**
 * Executes one action. Clicking anything that looks like a submit button is refused unless
 * allowSubmit is true: only the user's explicit approval can submit an application.
 */
export async function act(page: Page, action: Action, opts: { allowSubmit: boolean; resumePath: string | null }): Promise<string> {
  const loc = "id" in action ? page.locator(`[data-op-id="${action.id}"]`) : null;
  switch (action.kind) {
    case "fill": {
      await loc!.scrollIntoViewIfNeeded();
      await loc!.fill(action.value);
      const role = await loc!.getAttribute("role");
      if (role === "combobox") {
        await page.waitForTimeout(400);
        await page.keyboard.press("Enter");
      }
      return `Filled ${action.id}.`;
    }
    case "select": {
      try {
        await loc!.selectOption({ label: action.option });
      } catch {
        await loc!.selectOption(action.option);
      }
      return `Selected "${action.option}" in ${action.id}.`;
    }
    case "check":
      await loc!.setChecked(action.checked);
      return `${action.checked ? "Checked" : "Unchecked"} ${action.id}.`;
    case "upload":
      if (!opts.resumePath) return "No resume file on record; skipped upload.";
      await loc!.setInputFiles(opts.resumePath);
      return `Uploaded resume to ${action.id}.`;
    case "click": {
      const text = ((await loc!.innerText().catch(() => "")) || (await loc!.getAttribute("value")) || "").trim();
      const type = (await loc!.getAttribute("type")) ?? "";
      if (!opts.allowSubmit && (SUBMIT_RE.test(text) || type === "submit")) {
        return "BLOCKED: that would submit the application. Submitting needs the user's approval, so call request_review instead.";
      }
      await loc!.scrollIntoViewIfNeeded();
      await loc!.click();
      await page.waitForTimeout(600);
      return `Clicked ${action.id}${text ? ` ("${text.slice(0, 40)}")` : ""}.`;
    }
    case "click_xy":
      if (!opts.allowSubmit) {
        const text = await page.evaluate(
          ([x, y]) => (document.elementFromPoint(x, y) as HTMLElement | null)?.innerText ?? "",
          [action.x, action.y] as const,
        );
        if (SUBMIT_RE.test(text)) return "BLOCKED: that point is a submit control. Call request_review instead.";
      }
      await page.mouse.click(action.x, action.y);
      await page.waitForTimeout(600);
      return `Clicked at (${action.x}, ${action.y}).`;
    case "scroll":
      await page.mouse.wheel(0, action.dy);
      await page.waitForTimeout(300);
      return `Scrolled ${action.dy > 0 ? "down" : "up"}.`;
    case "press":
      await page.keyboard.press(action.key);
      return `Pressed ${action.key}.`;
  }
}

/** Clicks the form's submit control and reports whether a confirmation page appeared. */
export async function submitForm(page: Page): Promise<{ ok: boolean; message: string }> {
  const fields = await snapshotFields(page);
  const candidates = fields.filter((f) => f.type === "submit" || SUBMIT_RE.test(f.text ?? ""));
  const target = candidates.find((f) => f.type === "submit") ?? candidates[candidates.length - 1];
  if (!target) return { ok: false, message: "Couldn't find a submit button on the page." };
  const before = page.url();
  await act(page, { kind: "click", id: target.id }, { allowSubmit: true, resumePath: null });
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  const body = await page.evaluate(() => document.body.innerText.slice(0, 5000));
  if (CONFIRM_RE.test(body)) return { ok: true, message: "The site confirmed your application was received." };
  if (/(is required|can't be blank|please (fill|complete)|invalid)/i.test(body)) {
    return { ok: false, message: "The form reported missing or invalid fields. Open the page to finish it." };
  }
  // Only claim success when something observable happened; otherwise hand back to the user.
  if (page.url() !== before) return { ok: true, message: "Submitted. The site didn't show a confirmation message, so check your email for a receipt." };
  return { ok: false, message: "We clicked submit but the page didn't change. Open the form to check and finish it yourself." };
}

// ---------- Live sessions kept open between "awaiting approval" and "submit" ----------

type Live = { browser: Browser; page: Page; timer: NodeJS.Timeout; onClose?: () => void };
const SESSION_TTL_MS = 20 * 60_000;
const g = globalThis as unknown as { __opurnosLive?: Map<string, Live> };
const live = (g.__opurnosLive ??= new Map());

/** onClose runs however the session ends (submit, cancel or TTL), e.g. to delete temp files. */
export function keepSession(applicationId: string, browser: Browser, page: Page, onClose?: () => void) {
  closeSession(applicationId);
  const timer = setTimeout(() => closeSession(applicationId), SESSION_TTL_MS);
  live.set(applicationId, { browser, page, timer, onClose });
}

export function getSession(applicationId: string): Page | null {
  return live.get(applicationId)?.page ?? null;
}

export function closeSession(applicationId: string) {
  const s = live.get(applicationId);
  if (!s) return;
  clearTimeout(s.timer);
  live.delete(applicationId);
  s.browser.close().catch(() => undefined);
  s.onClose?.();
}
