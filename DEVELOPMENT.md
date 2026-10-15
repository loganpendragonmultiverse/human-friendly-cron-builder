# Development scope

Version 1.0.1 preserves the Version 1 behavior and corrects the plural wording used for multi-value weekday explanations. It implements transparent, test-backed five-field cron parsing and time-zone-aware previews in a static browser application.

It does not execute jobs, connect to servers, persist schedules, emulate every cron dialect, or claim that a preview overrides the documentation of the target scheduler.

## 1.1.0 calendar export

Export exactly the cached preview instants as RFC 5545 UTC events, with SHA-256 identities from expression, zone and instant. Validate before export, escape text, and fold UTF-8 lines at 75 octets. No recurrence, storage, accounts or scheduler integration. Explicit date-format fields allow the preview to include a zone label.
