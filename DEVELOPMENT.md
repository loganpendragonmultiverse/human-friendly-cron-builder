# Development scope

Version 1.0.1 preserves the Version 1 behavior and corrects the plural wording used for multi-value weekday explanations. It implements transparent, test-backed five-field cron parsing and time-zone-aware previews in a static browser application.

It does not execute jobs, connect to servers, persist schedules, emulate every cron dialect, or claim that a preview overrides the documentation of the target scheduler.

## 1.1.0 calendar export

Export exactly the cached preview instants as RFC 5545 UTC events, with SHA-256 identities from expression, zone and instant. Validate before export, escape text, and fold UTF-8 lines at 75 octets. No recurrence, storage, accounts or scheduler integration. Explicit date-format fields allow the preview to include a zone label.

## 1.2.0 completion pass

Keep the original offline five-field scope. Previews traverse UTC hours using a
single formatter, skip nonmatching calendar days only when their local clock advances without an offset change, enumerate matching minutes only when the local hour is stable,
and inspect each minute at local-hour/offset transitions. Preserve explicit bounded
searches, UTC ordering and both instants of repeated wall times. The default horizon
is 100 years to support eight leap-day runs. Impossible month/day combinations fail
before searching. Day matching follows Vixie cron's leading-asterisk rule; the source
reference is https://github.com/vixie/cron/blob/master/cron.c and entry.c.

Clipboard refusal reports a useful manual-copy fallback. No persistent browser
storage, network access, scheduler integration or background work is added.

## 1.2.1 distribution completion

Ship README, DEVELOPMENT, TESTING, CHANGELOG and LICENSE alongside index.html and
all four runtime source files. The 1.2.0 tag is an immutable unpublished candidate;
only the completed 1.2.1 distribution is intended for public release. Verify each
ZIP member against the reviewed tagged source and repeat installed browser flows.

The release ZIP contains a directly openable `index.html`: CSS and the dependency-free
application modules are inlined at build time, with readable source and license/docs
also included. Extract the ZIP and open index.html while offline. Browser storage and
clipboard access still follow browser policy; if your browser blocks file-origin
storage, serve the extracted folder locally with `python -m http.server 8000` and open
`http://localhost:8000/`. This local server works without an Internet connection.
Release acceptance exercises the actual ZIP's file-protocol entry point and local HTTP
flows, including keyboard controls and exported files.
