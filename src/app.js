import { explainCron, nextRuns, parseCron, validateTimeZone } from "./cron.js";

import { previewCalendar } from "./calendar.js";

const calendar = document.querySelector("#calendar");
let displayed = null;

const form = document.querySelector("#cron-form");
const expression = document.querySelector("#expression");
const timeZone = document.querySelector("#timezone");
const explanation = document.querySelector("#explanation");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const copy = document.querySelector("#copy");
const presets = document.querySelectorAll("[data-cron]");

timeZone.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function render() {
  displayed = null;
  calendar.disabled = true;
  status.textContent = "";
  preview.replaceChildren();
  try {
    const value = expression.value.trim();
    parseCron(value);
    if (!validateTimeZone(timeZone.value.trim())) throw new Error("Enter a valid IANA time zone.");
    explanation.textContent = explainCron(value);
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone.value.trim(),
      year: "numeric", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit",
      timeZoneName: "short",
    });
    const runs = nextRuns(value, { timeZone: timeZone.value.trim(), count: 8 });
    for (const run of runs) {
      const item = document.createElement("li");
      item.textContent = formatter.format(run);
      preview.append(item);
    }
    status.textContent = timeZone.value.trim() === "UTC"
      ? "Valid five-field cron expression."
      : "Valid. Local clock changes can skip or repeat scheduled wall-clock times.";
    status.dataset.kind = "success";
    copy.disabled = false;
    displayed = { expression: value, timeZone: timeZone.value.trim(), runs, createdAt: new Date() };
    calendar.disabled = false;
  } catch (error) {
    explanation.textContent = "Fix the expression to see an explanation.";
    status.textContent = error.message;
    status.dataset.kind = "error";
    copy.disabled = true;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});
expression.addEventListener("input", render);
timeZone.addEventListener("input", render);
for (const button of presets) {
  button.addEventListener("click", () => {
    expression.value = button.dataset.cron;
    render();
  });
}
copy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(expression.value.trim());
  } catch {
    status.textContent = "Clipboard unavailable. Select and copy the expression manually.";
    status.dataset.kind = "error";
    return;
  }
  copy.textContent = "Copied";
  setTimeout(() => {
    copy.textContent = "Copy expression";
  }, 1200);
});
calendar.addEventListener("click", async () => {
  const snapshot = displayed;
  if (!snapshot || snapshot.expression !== expression.value.trim() || snapshot.timeZone !== timeZone.value.trim()) {
    render();
    return;
  }
  try {
    const data = await previewCalendar(snapshot.expression, snapshot.timeZone, snapshot.runs, snapshot.createdAt);
    if (displayed !== snapshot) return;
    const url = URL.createObjectURL(new Blob([data], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cron-preview.ics";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    status.textContent = error.message;
    status.dataset.kind = "error";
  }
});
render();
