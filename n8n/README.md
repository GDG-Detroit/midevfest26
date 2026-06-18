# n8n import setup — Pride Innovation Summit

Orchestrates **Google Sheet + Drive → Sanity → optional Vercel redeploy**.

Heavy lifting lives in **`scripts/sanity-import/import-speakers.mjs`** (versioned, testable). n8n triggers it and handles notifications.

```text
[Manual / Webhook trigger]
        ↓
[Set variables: env file path (SANITY_DATASET in .env)]
        ↓
[Execute Command: npm run import:speakers]
        ↓
[IF success → HTTP Request: Vercel deploy hook]
        ↓
[IF failure → Email / Slack notification]
```

---

## Prerequisites

### 1. Sanity

- Project `b18a6pbd`, **`production`** dataset
- **2026 Event** document in Studio (year `2026`)
- Schema deployed: `cd studio && npx sanity schema deploy`
- API token with **Editor** (or custom role with write + assets):  
  [sanity.io/manage/project/b18a6pbd/api](https://www.sanity.io/manage/project/b18a6pbd/api)

### 2. Google Cloud (you have `n8n-Google-Sheets`)

Service account needs:

- **Google Sheets API** + **Google Drive API** enabled
- JSON key file saved on the n8n host
- **Share the runner sheet** with the service account email (Viewer)
- **Share the headshots Drive folder** with the same email (Viewer)

### 3. Repo on n8n host

Clone `pridemi26` where n8n can run shell commands, e.g. `/opt/pridemi26`:

```bash
git clone https://github.com/Compass-Detroit/pridemi26.git /opt/pridemi26
cd /opt/pridemi26
npm ci
cp scripts/sanity-import/.env.example scripts/sanity-import/.env
# Edit .env with real IDs and token
```

---

## Environment file

See `scripts/sanity-import/.env.example`. Minimum:

```bash
SANITY_PROJECT_ID=b18a6pbd
SANITY_DATASET=production
SANITY_API_TOKEN=sk...
SANITY_EVENT_YEAR=2026
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_SHEET_ID=1abc...
GOOGLE_SHEET_RANGE=Sheet1
GOOGLE_DRIVE_FOLDER_ID=1xyz...
```

Test locally before n8n:

```bash
npm run import:speakers
```

Sheet columns: [`n8n/sheet-template-speakers.md`](./sheet-template-speakers.md)

---

## n8n workflow (build in UI)

### Node 1 — Trigger

- **Manual Trigger** for testing
- Later: **Webhook** (password-protected) from an admin-only site button

### Node 2 — Set variables (optional)

Use **Edit Fields (Set)** only if you need to override paths or env file location for this host.

### Node 3 — Execute Command

| Setting           | Value                 |
| ----------------- | --------------------- |
| Command           | `npm`                 |
| Arguments         | `run import:speakers` |
| Working directory | `/opt/pridemi26`      |

Or call Node directly:

```bash
node --env-file=scripts/sanity-import/.env scripts/sanity-import/import-speakers.mjs
```

### Node 4 — IF (success)

- Condition: `$json.exitCode` equals `0` (depends on Execute Command node output)

### Node 5 — Vercel deploy hook (success branch)

- **HTTP Request** POST to your Vercel Deploy Hook URL (no body)
- Site rebuild fetches fresh Sanity content (once the Vite fetch layer exists)

### Node 6 — Notify on failure

- **Send Email** / **Slack** with `$json.stderr` or error message from Execute Command

---

## Workflow variants

### A. n8n only triggers script (recommended)

n8n does **not** read the sheet. The script uses the same service account as your existing Google Sheets node — one source of truth in code.

### B. n8n reads sheet, script receives JSON

Advanced: Google Sheets node → aggregate rows → write temp JSON → script reads file. Use only if the script cannot reach Google from the n8n host.

---

## Idempotency

Safe to run repeatedly:

- Speakers/sessions use stable IDs: `speaker-{slug}`, `session-{slug}`
- Same sheet → same result
- Rows removed from sheet → documents **unpublished** (not deleted)

---

## Import checklist

1. Create runner sheet from [`sheet-template-speakers.md`](./sheet-template-speakers.md)
2. Add rows + headshots in Drive
3. Run `npm run import:speakers` (or n8n workflow)
4. Verify in Studio (`pridemi26`)
5. Trigger Vercel deploy

---

## Team import (next)

Same pattern: `teamMember` schema + separate sheet tab + `import-team.mjs` (TODO). Reuse Google credentials and n8n Execute Command pattern.

---

## Troubleshooting

| Issue                                   | Fix                                                   |
| --------------------------------------- | ----------------------------------------------------- |
| `No event document found for year 2026` | Create Event in Studio                                |
| `Missing required column`               | Match sheet headers to template                       |
| Headshot warnings                       | Filename must match Drive exactly (`JennaRitten.jpg`) |
| Google 403                              | Share sheet/folder with service account email         |
| Sanity 403                              | Token needs write access to target dataset            |

---

## Files in this repo

| Path                                         | Purpose                   |
| -------------------------------------------- | ------------------------- |
| `scripts/sanity-import/import-speakers.mjs`  | Import engine             |
| `scripts/sanity-import/.env.example`         | Env template              |
| `n8n/sheet-template-speakers.md`             | Sheet column spec         |
| `n8n/workflows/speakers-import.example.json` | Optional workflow starter |
