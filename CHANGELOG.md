# Changelog

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
