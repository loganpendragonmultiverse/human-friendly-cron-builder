import assert from "node:assert/strict";
import test from "node:test";
import { escapeText, foldLine, previewCalendar } from "../src/calendar.js";
import { nextRuns } from "../src/cron.js";

test("exports exactly previewed UTC instants, including both repeated DST times", async () => {
  const expression = "30 1 * * *";
  const zone = "America/New_York";
  const runs = nextRuns(expression, { start: new Date("2026-11-01T04:00:00Z"), timeZone: zone, count: 2 });
  const text = await previewCalendar(expression, zone, runs);
  assert.deepEqual([...text.matchAll(/DTSTART:(.*)\r/g)].map((m) => m[1]), ["20261101T053000Z", "20261101T063000Z"]);
  const uids = [...text.replace(/\r\n /g, "").matchAll(/UID:(.*)\r/g)].map((m) => m[1]);
  assert.equal(new Set(uids).size, 2);
  assert.equal(text, await previewCalendar(expression, zone, runs));
  const single = await previewCalendar(" 30   1 * * * ", zone, [runs[1]]);
  assert.ok(single.replace(/\r\n /g, "").includes(uids[1]));
  assert.ok(!text.includes("RRULE") && !text.includes("VALARM"));
  assert.ok(text.endsWith("END:VCALENDAR\r\n"));
});

test("escapes property injection and folds at UTF-8 boundaries", () => {
  assert.equal(escapeText("a,b;c\\d\r\nEND:VEVENT"), "a\\,b\\;c\\\\d\\nEND:VEVENT");
  const line = "DESCRIPTION:" + "é😀".repeat(80);
  const folded = foldLine(line);
  assert.equal(folded.replace(/\r\n /g, ""), line);
  for (const part of folded.split("\r\n")) assert.ok(Buffer.byteLength(part) <= 75);
});

test("invalid expressions, zones, mismatching or unordered instants reject", async () => {
  const run = new Date("2026-01-01T00:00:00Z");
  for (const args of [["bad", "UTC", [run]], ["* * * * *", "invalid", [run]],
    ["* * * * *", "", [run]], ["* * * * *", "UTC", []],
    ["1 * * * *", "UTC", [run]], ["* * * * *", "UTC", [run, run]],
    ["* * * * *", "UTC", [new Date(NaN)]], ["* * * * *", "UTC", [new Date(run.getTime() + 1)]]]) {
    await assert.rejects(() => previewCalendar(...args));
  }
});
