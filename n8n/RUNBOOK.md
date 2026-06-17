# Import pipeline runbook

Step-by-step reference for running the Google Sheets → Sanity import for each new event. Lives in every cloned repo so future teams have the full picture.

---

## What lives where

| Location | What belongs there | Notes |
|---|---|---|
| **Google Cloud Console** | Service account + JSON key | One-time; shared across all events |
| **n8n server `~/`** | `google-sa.json` | The downloaded key file, renamed. Shared across all events. |
| **n8n server `~/[event-repo]/`** | Cloned repo | One per event |
| **n8n server `~/[event-repo]/scripts/sanity-import/`** | `.env` file | One per event; gitignored, never in GitHub |
| **Docker container `/secrets/`** | `google-sa.json` | Mounted from server via docker-compose volume |
| **Docker container `/opt/[event-repo]/`** | Cloned repo | Mounted from server via docker-compose volume |
| **GitHub** | Public repo (source code only) | No secrets ever committed |
| **Google Drive** | Speaker sheet + headshots folder | Shared with service account email |
| **Sanity** | Project, datasets, Event document, API token | One Sanity project per event |
| **Vercel** | Deployed website + deploy hook URL | One Vercel project per event |
| **n8n UI** | One workflow per event | Duplicate previous event's workflow |

---

## First-time server setup (done once, shared by all events)

These steps only need to happen once when n8n is first set up. Skip this section for subsequent events.

### A. Create the Google Cloud service account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select or create a project
3. Go to **APIs & Services** → **Enable APIs** → enable:
   - Google Sheets API
   - Google Drive API
4. Go to **IAM & Admin** → **Service Accounts** → **Create Service Account**
   - Name it something like `n8n-import`
   - No special roles needed at the project level
5. Click the service account → **Keys** tab → **Add Key** → **Create new key** → **JSON**
6. A `.json` file downloads to your computer — this is your key file

### B. Place the key file on the n8n server

Rename the downloaded file to `google-sa.json` and copy it to the server:

```bash
# From your local machine:
scp ~/path/to/downloaded-key.json shrinkray@your-server:~/google-sa.json
```

Or paste the file contents via nano if scp is unavailable:
```bash
# On the server:
nano ~/google-sa.json
# Paste the full JSON content, save and exit
```

Lock down the file permissions:
```bash
chmod 600 ~/google-sa.json
```

### C. Add Docker volume mounts to `docker-compose.yml`

On the server, edit your n8n service to mount the key and future repos into the container:

```yaml
services:
  n8n:
    # ... existing config ...
    volumes:
      - n8n_data:/home/node/.n8n
      - /home/shrinkray/google-sa.json:/secrets/google-sa.json:ro
      - /home/shrinkray/[event-repo]:/opt/[event-repo]:ro
```

> For each new event repo, add another volume line following the same pattern.

Restart n8n after any changes:
```bash
docker compose down && docker compose up -d
```

### D. Install Node.js via NVM on the server

The server needs Node 20+ to run the import script manually (outside Docker):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
```

---

## Per-event setup (repeat for each new event)

### 1. Create the Google Sheet

- Use [`n8n/sheet-template-speakers.md`](./sheet-template-speakers.md) for the exact column spec
- Row 1 must match the header row exactly
- Open `~/google-sa.json` on the server → find the `"client_email"` field
- Share the sheet with that email → **Viewer**
- Get the Sheet ID from the URL:
  ```
  https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
  ```

### 2. Create the headshots folder in Google Drive

- Create a folder for this event's headshots
- Share it with the same `client_email` → **Viewer**
- Headshot filenames must match the `headshot_filename` column in the sheet exactly (case-sensitive, including extension)
- Get the folder ID from the URL:
  ```
  https://drive.google.com/drive/folders/THIS_IS_THE_FOLDER_ID
  ```

### 3. Create the Event document in Sanity Studio

- Open Sanity Studio → **Event** → **New Event**
- Set the **Year** field to the current event year
- Fill in any other required fields
- Click **Publish** — the script only finds published events

### 4. Generate a Sanity API token

1. Go to `sanity.io/manage` → your project → **API** → **Tokens**
2. Click **Add API token** → name it `n8n-import` → role: **Editor**
3. Copy the `sk-...` string immediately — it is only shown once

### 5. Clone the repo and create the `.env` file on the server

```bash
git clone https://github.com/Compass-Detroit/[this-repo].git ~/[this-repo]
cd ~/[this-repo]
nvm install && nvm use
npm ci
cp scripts/sanity-import/.env.example scripts/sanity-import/.env
nano scripts/sanity-import/.env
```

Fill in these values:

```bash
SANITY_PROJECT_ID=                           # from sanity.io/manage → project settings
SANITY_DATASET=development                   # use "production" for go-live
SANITY_API_TOKEN=sk-...                      # the token you just copied
SANITY_EVENT_YEAR=                           # e.g. 2027
GOOGLE_APPLICATION_CREDENTIALS=/home/shrinkray/google-sa.json   # server path for manual test
GOOGLE_SHEET_ID=                             # from Sheet URL
GOOGLE_SHEET_RANGE=Sheet1                    # tab name in the spreadsheet
GOOGLE_DRIVE_FOLDER_ID=                      # from Drive folder URL
```

### 6. Add the new repo volume to `docker-compose.yml`

```yaml
- /home/shrinkray/[this-repo]:/opt/[this-repo]:ro
```

Then restart n8n:
```bash
docker compose down && docker compose up -d
```

### 7. Test manually before using n8n

```bash
cd ~/[this-repo]
node --env-file=scripts/sanity-import/.env \
  scripts/sanity-import/import-speakers.mjs --dataset=development
```

Expected output:
```
Import complete: { speakers: N, sessions: N, unpublished: 0, dataset: 'development' }
```

Check Sanity Studio (development dataset) to confirm speakers and headshots appear correctly.

> Once the manual test passes, change `GOOGLE_APPLICATION_CREDENTIALS` in `.env` to `/secrets/google-sa.json` (the Docker container path) so n8n workflows use it correctly.

### 8. Create the n8n workflow

- Open n8n → duplicate the previous event's workflow
- Rename it (e.g. `Hispanic Heritage — Import speakers to Sanity`)
- Update the Execute Command node:
  - Working directory: `/opt/[this-repo]`
  - Arguments: `--env-file=scripts/sanity-import/.env scripts/sanity-import/import-speakers.mjs --dataset=development`
- Update the Vercel deploy hook URL if different
- Test via **Execute Workflow** → confirm exit code 0

### 9. Run for production

- Change `--dataset=development` to `--dataset=production` in the n8n workflow (or update `.env`)
- Execute the workflow
- Confirm the Vercel deploy hook fires and the site rebuilds

---

## Multi-event server layout reference

```
~/
  google-sa.json              ← shared service account key (all events)
  pridemi26/                  ← Pride Innovation Summit
    scripts/sanity-import/.env
  hispanicmi26/               ← Hispanic Heritage Summit
    scripts/sanity-import/.env
  [next-event]/
    scripts/sanity-import/.env
```

---

## Updating scripts after a bug fix

If a fix is made to the import scripts in one event's repo, apply it to other active repos:

```bash
cd ~/[other-event-repo]
git pull
```

---

## Troubleshooting

| Error | Fix |
|---|---|
| `No event document found for year XXXX` | Create and **Publish** the Event doc in Studio |
| `Unauthorized - Session not found` | API token is wrong — check you pasted `sk-...` not the token name |
| `Missing required column` | Sheet header row doesn't match the template |
| `Headshot not found in Drive` | Filename in sheet must match Drive file exactly (case-sensitive) |
| `Google 403` | Share the sheet and folder with the service account `client_email` |
| `Permission denied` cloning repo | Directory already exists — run `sudo rm -rf ~/[repo]` first |
| `ERR_MODULE_NOT_FOUND` | Run `npm ci` — node_modules missing |
| Node version error | Use NVM: `nvm install && nvm use` from the repo directory |
| Headshots not found in Shared Drive | Confirm `supportsAllDrives: true` fix is in `lib/google.mjs` |
