import assert from "node:assert/strict";
import test from "node:test";

test("UI exports its displayed snapshot and disables export on invalid edits", async () => {
  class Element {
    value = ""; textContent = ""; dataset = {}; children = []; handlers = {}; disabled = false;
    addEventListener(name, handler) { this.handlers[name] = handler; }
    replaceChildren() { this.children = []; }
    append(item) { this.children.push(item); }
    click() { this.clicked = true; }
  }
  const elements = Object.fromEntries(["cron-form", "expression", "timezone", "explanation", "preview", "status", "copy", "calendar"].map((key) => [key, new Element()]));
  elements.expression.value = "* * * * *";
  let download;
  globalThis.document = {
    querySelector: (selector) => elements[selector.slice(1)],
    querySelectorAll: () => [],
    createElement: (name) => { const element = new Element(); if (name === "a") download = element; return element; },
  };
  let blob;
  const create = URL.createObjectURL;
  URL.createObjectURL = (value) => { blob = value; return "blob:local-preview"; };
  const revoke = URL.revokeObjectURL;
  URL.revokeObjectURL = () => {};
  try {
    await import("../src/app.js");
    assert.equal(elements.calendar.disabled, false);
    assert.equal(elements.preview.children.length, 8);
    assert.equal(elements.status.dataset.kind, "success");
    await elements.calendar.handlers.click();
    assert.equal(download.download, "cron-preview.ics");
    assert.equal(download.clicked, true);
    assert.equal((await blob.text()).match(/BEGIN:VEVENT/g).length, 8);
    elements.expression.value = "invalid";
    elements.expression.handlers.input();
    assert.equal(elements.calendar.disabled, true);
    download = null;
    await elements.calendar.handlers.click();
    assert.equal(download, null);
    elements.expression.value = "* * * * *";
    elements.timezone.value = "invalid/zone";
    elements.timezone.handlers.input();
    assert.equal(elements.calendar.disabled, true);
  } finally {
    delete globalThis.document;
    // The app revokes object URLs asynchronously after the download.
    setTimeout(() => { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }, 1100);
  }
});
