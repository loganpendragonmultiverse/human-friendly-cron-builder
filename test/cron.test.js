import assert from "node:assert/strict";
import test from "node:test";

import { dateParts, explainCron, matchesCron, nextRuns, parseCron, parseField, validateTimeZone } from "../src/cron.js";

test("parses wildcards, lists, ranges, steps, and aliases", () => {
  const parsed = parseCron("*/15 8-10 1,15 JAN,MAR MON-FRI");
  assert.deepEqual(parsed.fields[0], [0, 15, 30, 45]);
  assert.deepEqual(parsed.fields[1], [8, 9, 10]);
  assert.deepEqual(parsed.fields[3], [1, 3]);
  assert.deepEqual(parsed.fields[4], [1, 2, 3, 4, 5]);
});

test("normalizes Sunday 7 to 0 and deduplicates", () => {
  assert.deepEqual(parseCron("0 0 * * 0,7,SUN").fields[4], [0]);
});

test("rejects malformed and unsupported fields", () => {
  assert.throws(() => parseCron("* * * *"), /five fields/);
  assert.throws(() => parseCron("60 * * * *"), /outside/);
  assert.throws(() => parseCron("*/0 * * * *"), /step/);
  assert.throws(() => parseCron("1/2 * * * *"), /requires/);
  assert.throws(() => parseCron("5-1 * * * *"), /wraparound/);
  assert.throws(() => parseCron("? * * * *"), /unsupported/);
});

test("uses Vixie OR behavior when both day fields are restricted", () => {
  const parsed = parseCron("0 0 13 * FRI");
  assert.equal(matchesCron(parsed, { minute: 0, hour: 0, day: 13, month: 2, weekday: 2 }), true);
  assert.equal(matchesCron(parsed, { minute: 0, hour: 0, day: 12, month: 2, weekday: 5 }), true);
  assert.equal(matchesCron(parsed, { minute: 0, hour: 0, day: 12, month: 2, weekday: 2 }), false);
});

test("requires the restricted day field when the other is wildcard", () => {
  assert.equal(matchesCron(parseCron("0 0 13 * *"), { minute: 0, hour: 0, day: 12, month: 2, weekday: 5 }), false);
  assert.equal(matchesCron(parseCron("0 0 * * FRI"), { minute: 0, hour: 0, day: 12, month: 2, weekday: 5 }), true);
});

test("previews future runs exclusively from the supplied instant", () => {
  const runs = nextRuns("*/15 * * * *", {
    start: new Date("2026-01-01T00:00:00Z"),
    timeZone: "UTC",
    count: 3,
  });
  assert.deepEqual(runs.map((date) => date.toISOString()), [
    "2026-01-01T00:15:00.000Z",
    "2026-01-01T00:30:00.000Z",
    "2026-01-01T00:45:00.000Z",
  ]);
});

test("applies an IANA time zone to matching", () => {
  const runs = nextRuns("0 9 * * *", {
    start: new Date("2026-07-22T12:30:00Z"),
    timeZone: "America/New_York",
    count: 1,
  });
  assert.equal(runs[0].toISOString(), "2026-07-22T13:00:00.000Z");
});

test("validates time zones and preview limits", () => {
  assert.equal(validateTimeZone("UTC"), true);
  assert.equal(validateTimeZone("Not/AZone"), false);
  assert.throws(() => nextRuns("* * * * *", { timeZone: "Not/AZone" }), /Unknown/);
  assert.throws(() => nextRuns("* * * * *", { count: 0 }), /between/);
  assert.throws(() => nextRuns("0 0 1 1 *", { count: 2, maxMinutes: 1 }), /preview window/);
});

test("extracts stable calendar parts", () => {
  assert.deepEqual(dateParts(new Date("2026-07-22T13:05:00Z"), "UTC"), {
    year: 2026,
    month: 7,
    day: 22,
    hour: 13,
    minute: 5,
    weekday: 3,
  });
});

test("produces a deterministic field explanation", () => {
  assert.equal(
    explainCron("0 9 * * MON-FRI"),
    "minute 0; hour 9; every day of month; every month; days of week 1, 2, 3, 4, 5",
  );
});

test("parseField rejects empty list entries and malformed steps", () => {
  const spec = { name: "minute", min: 0, max: 59 };
  assert.throws(() => parseField("1,", spec), /empty list/);
  assert.throws(() => parseField("*/2/3", spec), /step syntax/);
});


test("wildcard day steps retain Vixie AND behavior", () => {
  const parsed = parseCron("0 0 */2 * FRI");
  assert.equal(matchesCron(parsed, { minute: 0, hour: 0, day: 3, month: 2, weekday: 2 }), false);
  assert.equal(matchesCron(parsed, { minute: 0, hour: 0, day: 4, month: 2, weekday: 5 }), false);
  assert.equal(matchesCron(parsed, { minute: 0, hour: 0, day: 3, month: 2, weekday: 5 }), true);
});

test("annual and leap-day schedules return eight future runs", () => {
  const annual = nextRuns("0 9 1 JAN *", { start: new Date("2026-01-01T09:00:00Z"), count: 8 });
  assert.deepEqual(annual.map((run) => run.getUTCFullYear()), [2027,2028,2029,2030,2031,2032,2033,2034]);
  const leap = nextRuns("0 0 29 FEB *", { start: new Date("2026-01-01T00:00:00Z"), count: 8 });
  assert.deepEqual(leap.map((run) => run.getUTCFullYear()), [2028,2032,2036,2040,2044,2048,2052,2056]);
});

test("impossible calendar dates and invalid search arguments fail clearly", () => {
  assert.throws(() => nextRuns("0 0 30 FEB *"), /calendar days/);
  assert.throws(() => nextRuns("* * * * *", {start: new Date(NaN)}), /valid start/);
  for (const maxMinutes of [0, -1, NaN, Infinity, 1.5, 52704001]) {
    assert.throws(() => nextRuns("* * * * *", {maxMinutes}), /Preview window/);
  }
  for (const value of [null, undefined, 3, {}]) assert.throws(() => parseCron(value), /must be text/);
});

test("hour search agrees with exhaustive minute matching through clock transitions", () => {
  for (const [zone, start] of [["UTC", "2026-01-01T00:17:23Z"],
    ["America/New_York", "2026-03-08T05:17:00Z"],
    ["America/New_York", "2026-11-01T04:17:00Z"],
    ["Australia/Lord_Howe", "2026-04-04T13:17:00Z"],
    ["Australia/Lord_Howe", "2026-10-03T13:17:00Z"],
    ["Asia/Kathmandu", "2026-01-01T00:17:00Z"]]) {
    const expression = "5,17,30,45 0-23 * * *";
    const parsed = parseCron(expression);
    const cursor = new Date(start);
    cursor.setUTCSeconds(0,0); cursor.setUTCMinutes(cursor.getUTCMinutes()+1);
    const expected = [];
    while (expected.length < 20) {
      if (matchesCron(parsed, dateParts(cursor, zone))) expected.push(cursor.toISOString());
      cursor.setUTCMinutes(cursor.getUTCMinutes()+1);
    }
    assert.deepEqual(nextRuns(expression, {start: new Date(start), timeZone: zone, count: 20}).map((run) => run.toISOString()), expected, zone + start);
  }
});


test("sparse day skipping preserves non-UTC dates and clock changes", () => {
  assert.deepEqual(nextRuns("0 9 1 JAN *", {start: new Date("2026-01-01T14:00:00Z"), timeZone: "America/New_York", count: 2}).map((run) => run.toISOString()), ["2027-01-01T14:00:00.000Z", "2028-01-01T14:00:00.000Z"]);
  assert.equal(nextRuns("30 2 * * SUN", {start: new Date("2026-03-08T05:00:00Z"), timeZone: "America/New_York", count: 1})[0].toISOString(), "2026-03-15T06:30:00.000Z");
  assert.deepEqual(nextRuns("30 1 * * SUN", {start: new Date("2026-11-01T04:00:00Z"), timeZone: "America/New_York", count: 2}).map((run) => run.toISOString()), ["2026-11-01T05:30:00.000Z", "2026-11-01T06:30:00.000Z"]);
});


test("steps accept positive decimal integers without field alias or value limits", () => {
  for (const expression of ["* * * */FEB *", "* * * * */MON", "*/1.5 * * * *", "*/9007199254740992 * * * *", "*/ * * * *"]) assert.throws(() => parseCron(expression), /step/);
  assert.deepEqual(parseCron("*/60 * * * *").fields[0], [0]);
  assert.deepEqual(parseCron("0 0 1-31/100 */13 */8").fields.slice(2), [[1], [1], [0]]);
});
