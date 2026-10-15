import { dateParts, matchesCron, parseCron, validateTimeZone } from "./cron.js";

export function escapeText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;").replace(/,/g, "\\,");
}

// RFC 5545 folds at 75 UTF-8 octets, without splitting a code point.
export function foldLine(line) {
  const encoder = new TextEncoder();
  let result = "";
  let length = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (length + size > 75) { result += "\r\n "; length = 1; }
    result += character;
    length += size;
  }
  return result;
}

export async function previewCalendar(expression, timeZone, runs, createdAt = new Date()) {
  if (!(createdAt instanceof Date) || !Number.isFinite(createdAt.getTime()) ||
      createdAt.getUTCFullYear() < 1 || createdAt.getUTCFullYear() > 9999) {
    throw new Error("Export requires a valid creation timestamp.");
  }
  const stamp = createdAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const parsed = parseCron(expression);
  if (!timeZone || !validateTimeZone(timeZone)) throw new Error("Unknown IANA time zone.");
  if (!Array.isArray(runs) || runs.length < 1 || runs.length > 20) {
    throw new Error("Export requires 1 to 20 previewed runs.");
  }
  let previous = -Infinity;
  const instants = runs.map((run) => {
    if (!(run instanceof Date) || !Number.isFinite(run.getTime()) ||
        run.getTime() % 60000 !== 0 || run.getTime() <= previous ||
        run.getUTCFullYear() < 1 || run.getUTCFullYear() > 9999 ||
        !matchesCron(parsed, dateParts(run, timeZone))) {
      throw new Error("Export requires ordered, distinct preview instants matching the expression.");
    }
    previous = run.getTime();
    return run.toISOString().replace(/[-:]/g, "").replace(/\.000Z$/, "Z");
  });
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Human-Friendly Cron Builder//Preview calendar//EN", "CALSCALE:GREGORIAN"];
  for (const instant of instants) {
    const identity = JSON.stringify([parsed.expression, timeZone, instant]);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
    const uid = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    lines.push("BEGIN:VEVENT", `UID:${uid}@human-friendly-cron-builder`,
      `DTSTAMP:${stamp}`, `DTSTART:${instant}`,
      `SUMMARY:${escapeText("Cron preview: " + parsed.expression)}`,
      `DESCRIPTION:${escapeText("Preview only. Time zone: " + timeZone + ". Confirm in your scheduler. This calendar contains only the displayed instants; it does not schedule jobs.")}`,
      "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
