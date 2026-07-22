import { cp, mkdir, rm } from "node:fs/promises";

const out = new URL("../dist/site/", import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(new URL("src/", out), { recursive: true });
await cp(new URL("../index.html", import.meta.url), new URL("index.html", out));
for (const name of ["app.js", "cron.js", "styles.css"]) {
  await cp(new URL("../src/" + name, import.meta.url), new URL("src/" + name, out));
}
console.log(out.pathname);
