import { explainCron, nextRuns, parseCron, validateTimeZone } from "./cron.js";

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
  status.textContent = "";
  preview.replaceChildren();
  try {
    const value = expression.value.trim();
    parseCron(value);
    if (!validateTimeZone(timeZone.value.trim())) throw new Error("Enter a valid IANA time zone.");
    explanation.textContent = explainCron(value);
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone.value.trim(),
      dateStyle: "full",
      timeStyle: "short",
      timeZoneName: "short",
    });
    for (const run of nextRuns(value, { timeZone: timeZone.value.trim(), count: 8 })) {
      const item = document.createElement("li");
      item.textContent = formatter.format(run);
      preview.append(item);
    }
    status.textContent = timeZone.value.trim() === "UTC"
      ? "Valid five-field cron expression."
      : "Valid. Local clock changes can skip or repeat scheduled wall-clock times.";
    status.dataset.kind = "success";
    copy.disabled = false;
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
  await navigator.clipboard.writeText(expression.value.trim());
  copy.textContent = "Copied";
  setTimeout(() => {
    copy.textContent = "Copy expression";
  }, 1200);
});
render();
