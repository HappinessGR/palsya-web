import type { AbstractIntlMessages } from "next-intl";
import { namespaces, type Locale } from "./config";

/** The bundled messages for one locale: every namespace file under locales/<locale>/. */
export async function loadMessages(locale: Locale): Promise<AbstractIntlMessages> {
  const entries = await Promise.all(
    namespaces.map(async (ns) => {
      // A namespace file not yet translated for this locale falls back to English key by key.
      const messages = await import(`../locales/${locale}/${ns}.json`).then((m) => m.default).catch(() => ({}));
      return [ns, messages] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/**
 * Deep-merges `override` onto `base`, so a key missing from a translation
 * falls back to English. Missing keys are collected so development can warn.
 */
export function withFallback(
  base: AbstractIntlMessages,
  override: AbstractIntlMessages,
  missing: string[],
  path = "",
): AbstractIntlMessages {
  const out: AbstractIntlMessages = {};
  for (const [key, baseValue] of Object.entries(base)) {
    const value = override?.[key];
    const keyPath = path ? `${path}.${key}` : key;
    if (value === undefined) {
      missing.push(keyPath);
      out[key] = baseValue;
    } else if (baseValue && typeof baseValue === "object" && value && typeof value === "object") {
      out[key] = withFallback(baseValue as AbstractIntlMessages, value as AbstractIntlMessages, missing, keyPath);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** The string at a dotted path ("landing.hero.title"), or undefined. */
export function messageAt(messages: AbstractIntlMessages, key: string): string | undefined {
  let cur: unknown = messages;
  for (const part of key.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Every string message under `messages`, as [dotted key, text] pairs in file order. */
export function flattenMessages(messages: AbstractIntlMessages, prefix = ""): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(messages)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push([key, v]);
    else if (v && typeof v === "object") out.push(...flattenMessages(v as AbstractIntlMessages, key));
  }
  return out;
}

/**
 * Returns a copy of `messages` with each override written at its dotted key.
 * Only keys that already hold a string are replaced, so an override can never
 * add a key or turn a namespace object into a string.
 */
export function applyOverrides(messages: AbstractIntlMessages, overrides: { key: string; value: string }[]): AbstractIntlMessages {
  if (overrides.length === 0) return messages;
  const out = structuredClone(messages) as Record<string, unknown>;
  for (const { key, value } of overrides) {
    const parts = key.split(".");
    let parent: Record<string, unknown> | null = out;
    for (const part of parts.slice(0, -1)) {
      const next: unknown = parent?.[part];
      parent = next && typeof next === "object" ? (next as Record<string, unknown>) : null;
    }
    const last = parts[parts.length - 1];
    if (parent && typeof parent[last] === "string") parent[last] = value;
  }
  return out as AbstractIntlMessages;
}

/** Returns a copy of `messages` with `fn` applied to every string, given its dotted key. */
export function mapStrings(messages: AbstractIntlMessages, fn: (key: string, value: string) => string, prefix = ""): AbstractIntlMessages {
  const out: AbstractIntlMessages = {};
  for (const [k, v] of Object.entries(messages)) {
    const key = prefix ? `${prefix}.${k}` : k;
    out[k] = typeof v === "string" ? fn(key, v) : v && typeof v === "object" ? mapStrings(v as AbstractIntlMessages, fn, key) : v;
  }
  return out;
}
