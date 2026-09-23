# Human-Friendly Cron Builder

Human-Friendly Cron Builder is a dependency-free offline web application for constructing and checking standard five-field cron expressions. It validates ranges, lists, steps, month and weekday names, explains each field with clearer weekday wording, and previews upcoming runs in an IANA time zone.

Use the [live application](https://loganpendragonmultiverse.github.io/human-friendly-cron-builder/) or download the ZIP from the [v1.0.1 release](https://github.com/loganpendragonmultiverse/human-friendly-cron-builder/releases/tag/v1.0.1).

## Three-minute use

1. Enter a five-field expression such as “0 9 * * MON-FRI”.
2. Enter an IANA time zone such as “America/New_York”.
3. Read the field explanation and inspect the next eight runs.
4. Copy the expression and confirm it in the scheduler that will execute it.

Everything runs inside the browser. There are no accounts, analytics, storage, cookies, or network requests.

## Supported semantics

- Five fields: minute, hour, day of month, month, and day of week.
- Wildcards, comma lists, ascending ranges, and steps on wildcards or ranges.
- Three-letter English month and weekday aliases.
- Sunday may be 0 or 7.
- When day of month and day of week are both restricted, Vixie-style OR behavior is used.

Quartz syntax, seconds, years, L, W, #, ?, nicknames such as @daily, and wraparound ranges are deliberately rejected. Daylight-saving transitions can skip or repeat local wall-clock times. Cron implementations differ, so the preview is a review aid rather than a production guarantee.

## Development

    npm test
    npm run check
    npm run build

Node.js 20 or newer is required for development only. The deployed application has no runtime dependencies. Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md), security reports follow [SECURITY.md](SECURITY.md), and the code uses the [MIT License](LICENSE).

## More open-source projects

This project is part of the [Logan Pendragon Forge open-source collection](https://www.loganpendragonforge.com/open-source/). Browse the catalog for other released tools, source repositories, live demos, and downloads.
