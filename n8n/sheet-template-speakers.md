# Runner sheet — speakers import

One row = **one speaker on one session**. Same person on two talks = two rows (same `speaker_slug`, different `session_slug`).

Panel: use the **same** `session_title` and `session_slug` on every panelist row.

## Required columns

| Column          | Example                     | Notes              |
| --------------- | --------------------------- | ------------------ |
| `speaker_slug`  | `jenna-ritten`              | Stable upsert key  |
| `session_slug`  | `opening-remarks`           | Stable session key |
| `session_title` | `Welcome & Opening Remarks` | Display title      |
| `name`          | `Jenna Ritten`              |                    |

## Speaker fields

| Column              | Example                       | Required                        |
| ------------------- | ----------------------------- | ------------------------------- |
| `bio`               | …                             | Recommended                     |
| `organization`      | `IBM Research`                | Defaults to `TBD`               |
| `position`          | `Chief Developer Advocate`    | Defaults to `Speaker`           |
| `linkedIn`          | `https://linkedin.com/in/...` | Optional                        |
| `twitter`           | `handle`                      | Optional                        |
| `github`            | `https://github.com/...`      | Optional                        |
| `isWTM`             | `TRUE` / `FALSE`              | Optional                        |
| `isGDE`             | `TRUE` / `FALSE`              | Optional                        |
| `headshot_filename` | `JennaRitten.jpg`             | Must match file in Drive folder |

## Session fields (per row — merged by `session_slug`)

| Column             | Example               |
| ------------------ | --------------------- |
| `track`            | `Level Up`            |
| `time`             | `09:00`               |
| `room`             | `Main Hall`           |
| `duration_minutes` | `30`                  |
| `description`      | Full session text     |
| `abstract`         | Short blurb           |
| `tags`             | `In-person, Level Up` |

## Rules

- Rows **not** on the sheet are **unpublished** in Sanity on import (not deleted).
- First row wins for speaker profile fields when the same `speaker_slug` appears multiple times.
- Session fields come from the first row for that `session_slug`; all rows add participants.

## Header row

Copy this into row 1 of your Google Sheet:

```text
speaker_slug	session_slug	session_title	name	bio	organization	position	linkedIn	twitter	github	isWTM	isGDE	headshot_filename	track	time	room	duration_minutes	description	abstract	tags
```

(Tab-separated — paste into Sheets as one row.)
