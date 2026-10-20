const FIELD_SPECS = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  {
    name: "month",
    min: 1,
    max: 12,
    aliases: { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 },
  },
  {
    name: "day of week",
    min: 0,
    max: 7,
    aliases: { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 },
    normalize: (value) => (value === 7 ? 0 : value),
  },
];

export function parseCron(expression) {
  if (typeof expression !== "string") throw new Error("A cron expression must be text.");
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error("A cron expression must contain exactly five fields.");
  }
  const fields = parts.map((part, index) => parseField(part, FIELD_SPECS[index]));
  return { expression: parts.join(" "), fields, restricted: parts.map((part) => !part.startsWith("*")) };
}

export function parseField(source, spec) {
  const values = new Set();
  if (!source || source.includes("?")) throw new Error(spec.name + ": unsupported or empty value.");
  for (const item of source.toUpperCase().split(",")) {
    if (!item) throw new Error(spec.name + ": empty list item.");
    const stepParts = item.split("/");
    if (stepParts.length > 2) throw new Error(spec.name + ": invalid step syntax.");
    const step = stepParts.length === 2 && /^\d+$/.test(stepParts[1]) ? Number(stepParts[1]) : stepParts.length === 1 ? 1 : NaN;
    if (!Number.isSafeInteger(step) || step < 1) throw new Error(spec.name + ": step must be a positive decimal integer.");
    const base = stepParts[0];
    let start;
    let end;
    if (base === "*") {
      start = spec.min;
      end = spec.max;
    } else if (base.includes("-")) {
      const range = base.split("-");
      if (range.length !== 2) throw new Error(spec.name + ": invalid range.");
      start = parseNumber(range[0], spec);
      end = parseNumber(range[1], spec);
      if (start > end) throw new Error(spec.name + ": wraparound ranges are not supported.");
    } else {
      if (stepParts.length === 2) throw new Error(spec.name + ": a step requires * or a range.");
      start = parseNumber(base, spec);
      end = start;
    }
    for (let value = start; value <= end; value += step) {
      values.add(spec.normalize ? spec.normalize(value) : value);
    }
  }
  return [...values].sort((a, b) => a - b);
}

function parseNumber(value, spec) {
  const aliased = spec.aliases?.[value];
  const number = aliased ?? (/^\d+$/.test(value) ? Number(value) : Number.NaN);
  if (!Number.isInteger(number) || number < spec.min || number > spec.max) {
    throw new Error(spec.name + ": " + value + " is outside " + spec.min + "-" + spec.max + ".");
  }
  return number;
}

export function matchesCron(parsed, parts) {
  const [minutes, hours, days, months, weekdays] = parsed.fields;
  if (!minutes.includes(parts.minute) || !hours.includes(parts.hour) || !months.includes(parts.month)) return false;
  const dayMatches = days.includes(parts.day);
  const weekdayMatches = weekdays.includes(parts.weekday);
  const dayRestricted = parsed.restricted[2];
  const weekdayRestricted = parsed.restricted[4];
  if (dayRestricted && weekdayRestricted) return dayMatches || weekdayMatches;
  return dayMatches && weekdayMatches;
}

function partsFormatter(timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    weekday: "short",
  });
}

function formattedParts(date, formatter) {
  const values = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: weekdays[values.weekday],
  };
}

export function dateParts(date, timeZone) {
  return formattedParts(date, partsFormatter(timeZone));
}

export function validateTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function nextRuns(expression, options = {}) {
  const { start = new Date(), timeZone = "UTC", count = 5, maxMinutes = 52704000 } = options;
  if (!validateTimeZone(timeZone)) throw new Error("Unknown IANA time zone.");
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("Preview count must be between 1 and 20.");
  if (!Number.isSafeInteger(maxMinutes) || maxMinutes < 1 || maxMinutes > 52704000) {
    throw new Error("Preview window must be between 1 and 52704000 minutes.");
  }
  const parsed = parseCron(expression);
  const cursor = new Date(start);
  if (!Number.isFinite(cursor.getTime()) || cursor.getUTCFullYear() < 1 || cursor.getUTCFullYear() > 9899) {
    throw new Error("Preview requires a valid start date between years 1 and 9899.");
  }
  // A leap year provides the largest possible number of days in each month.
  // A restricted weekday can independently match under the OR day rule.
  if (!(parsed.restricted[2] && parsed.restricted[4]) &&
      !parsed.fields[3].some((month) => parsed.fields[2].some((day) =>
        day <= new Date(Date.UTC(2000, month, 0)).getUTCDate()))) {
    throw new Error("The selected months contain none of the selected calendar days.");
  }
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  const formatter = partsFormatter(timeZone);
  const read = (instant) => formattedParts(instant, formatter);
  const results = [];
  let checked = 0;
  while (checked < maxMinutes && results.length < count) {
    const first = read(cursor);
    const calendarMatches = matchesCron(parsed, {
      ...first, minute: parsed.fields[0][0], hour: parsed.fields[1][0],
    });
    if (!calendarMatches) {
      const dayLength = Math.min(1440 - first.hour * 60 - first.minute, maxMinutes - checked);
      const dayEnd = read(new Date(cursor.getTime() + (dayLength - 1) * 60000));
      const stableDay = first.year === dayEnd.year && first.month === dayEnd.month &&
        first.day === dayEnd.day && (dayEnd.hour - first.hour) * 60 + dayEnd.minute - first.minute === dayLength - 1;
      if (stableDay) {
        checked += dayLength;
        cursor.setUTCMinutes(cursor.getUTCMinutes() + dayLength);
        continue;
      }
    }
    // Search UTC hours, retaining UTC order across repeated local DST hours.
    const length = Math.min(60 - cursor.getUTCMinutes(), maxMinutes - checked);
    const last = read(new Date(cursor.getTime() + (length - 1) * 60000));
    const stable = first.year === last.year && first.month === last.month &&
      first.day === last.day && first.hour === last.hour && last.minute - first.minute === length - 1;
    if (stable) {
      for (const minute of parsed.fields[0]) {
        const offset = minute - first.minute;
        if (offset >= 0 && offset < length && matchesCron(parsed, { ...first, minute })) {
          results.push(new Date(cursor.getTime() + offset * 60000));
          if (results.length === count) break;
        }
      }
    } else {
      // Offset transitions and non-whole-hour zones keep exact minute matching.
      for (let offset = 0; offset < length && results.length < count; offset += 1) {
        const instant = new Date(cursor.getTime() + offset * 60000);
        if (matchesCron(parsed, read(instant))) results.push(instant);
      }
    }
    checked += length;
    cursor.setUTCMinutes(cursor.getUTCMinutes() + length);
  }
  if (results.length < count) throw new Error("Not enough runs were found inside the preview window.");
  return results;
}

export function explainCron(expression) {
  const parsed = parseCron(expression);
  const sources = parsed.expression.split(" ");
  const describe = (values, spec, source) => {
    if (source === "*") return "every " + spec.name;
    if (values.length === 1) return spec.name + " " + values[0];
    const pluralName = spec.name === "day of week" ? "days of week" : spec.name + "s";
    return pluralName + " " + values.join(", ");
  };
  return parsed.fields.map((values, index) => describe(values, FIELD_SPECS[index], sources[index])).join("; ");
}
