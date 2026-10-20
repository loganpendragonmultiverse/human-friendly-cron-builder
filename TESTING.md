# Testing

Use Node.js 20 or newer. The browser app has no runtime dependencies.

```sh
npm test
npm run check
npm run build
```

Tests cover five-field parsing and Vixie day matching, annual and leap-day previews,
invalid dates and bounded searches, and exact UTC order through New York and Lord
Howe daylight-saving changes and Kathmandu's quarter-hour offset. Optimized preview
results are compared against exhaustive minute matching. Calendar tests validate
UTC instants, deterministic UIDs, text escaping and UTF-8 folding. UI tests cover
invalid edits, snapshot export and clipboard failure.

For browser acceptance, serve `dist/site` over loopback HTTP and exercise Chromium,
Firefox and WebKit at desktop and narrow widths: edit the expression and zone,
use all presets, check eight runs, download and inspect the ICS, and verify invalid
input disables copying/export. No job scheduler, account or real calendar is used.
Verify the release ZIP contains the same static app and rerun these flows from it.
