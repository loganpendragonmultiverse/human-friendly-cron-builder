# Supported cron syntax

| Field | Range |
| --- | --- |
| Minute | 0-59 |
| Hour | 0-23 |
| Day of month | 1-31 |
| Month | 1-12 or JAN-DEC |
| Day of week | 0-7 or SUN-SAT |

Wildcards, lists, ascending ranges, and steps are supported. A step must follow a wildcard or range. Values that cannot occur in a real month may parse but will never appear in the preview.
