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
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error("A cron expression must contain exactly five fields.");
  }
  const fields = parts.map((part, index) => parseField(part, FIELD_SPECS[index]));
  return { expression: parts.join(" "), fields, restricted: parts.map((part) => part !== "*") };
}

export function parseField(source, spec) {
  const values = new Set();
  if (!source || source.includes("?")) throw new Error(spec.name + ": unsupported or empty value.");
  for (const item of source.toUpperCase().split(",")) {
    if (!item) throw new Error(spec.name + ": empty list item.");
    const stepParts = item.split("/");
    if (stepParts.length > 2) throw new Error(spec.name + ": invalid step syntax.");
    const step = stepParts.length === 2 ? parseNumber(stepParts[1], spec) : 1;
    if (step < 1) throw new Error(spec.name + ": step must be at least 1.");
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
  if (dayRestricted) return dayMatches;
  if (weekdayRestricted) return weekdayMatches;
  return true;
}

export function dateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    weekday: "short",
  });
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

export function validateTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function nextRuns(expression, options = {}) {
  const { start = new Date(), timeZone = "UTC", count = 5, maxMinutes = 1100000 } = options;
  if (!validateTimeZone(timeZone)) throw new Error("Unknown IANA time zone.");
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("Preview count must be between 1 and 20.");
  const parsed = parseCron(expression);
  const cursor = new Date(start);
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  const results = [];
  for (let checked = 0; checked < maxMinutes && results.length < count; checked += 1) {
    if (matchesCron(parsed, dateParts(cursor, timeZone))) results.push(new Date(cursor));
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
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
    return spec.name + "s " + values.join(", ");
  };
  return parsed.fields.map((values, index) => describe(values, FIELD_SPECS[index], sources[index])).join("; ");
}
