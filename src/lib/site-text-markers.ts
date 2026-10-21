/**
 * Invisible markers for on-page text editing. While an admin is in edit mode,
 * i18n/request.ts appends a marker to every message: START, the message's id
 * in binary as zero-width characters, END. The browser (app/components/edit-mode)
 * finds the markers in the rendered page, removes them, and knows which
 * message each piece of text came from. Nobody else ever receives markers.
 */
const START = "⁢";
const END = "⁣";
const ZERO = "​";
const ONE = "‌";

export const MARKER_RE = /⁢([​‌]+)⁣/g;

export function encodeMarker(id: number): string {
  return START + id.toString(2).replace(/0/g, ZERO).replace(/1/g, ONE) + END;
}

export function decodeMarker(bits: string): number {
  return parseInt(bits.replace(new RegExp(ZERO, "g"), "0").replace(new RegExp(ONE, "g"), "1"), 2);
}

export const hasMarker = (s: string) => s.includes(START);

/** Removes every marker from a string. */
export const stripMarkers = (s: string) => s.replace(MARKER_RE, "");
