# Changelog

## 1.2.0 - 2026-10-20

- Preview annual and leap-day schedules across a bounded 100-year window without constructing a time-zone formatter for every minute.
- Match stepped wildcard day fields using the documented Vixie day rule, and reject impossible month/day combinations and invalid search arguments clearly.
- Require numeric positive steps while accepting steps larger than a field span, and reject aliases used as steps.
- Handle unavailable clipboard access with a manual-copy message.
- Add transition-reference, sparse-schedule and UI regression tests and documented browser/release acceptance.

## 1.1.0 - 2026-10-15

- Download the displayed preview as a local ICS calendar, with deterministic event identities and UTC instants across daylight-saving transitions.
- Escape and fold calendar text; block exports when the preview is invalid or stale.
- Correct preview date formatting so time-zone labels render in browsers that reject combining date styles with timeZoneName.

## 1.0.1 - 2026-09-22

- Corrected multi-value weekday explanations from “day of weeks” to “days of week”.
- Added regression coverage for the corrected explanation text without changing cron parsing or scheduling semantics.

## 1.0.0 - 2026-07-22

- Parse and explain standard five-field cron expressions offline.
- Preview runs in validated IANA time zones with Vixie day-field semantics.
- Provide an accessible static application, presets, copying, and explicit dialect warnings.
