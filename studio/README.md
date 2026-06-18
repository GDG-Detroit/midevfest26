# pridemi26 Sanity Studio

TypeScript [Sanity Studio](https://www.sanity.io/docs/sanity-studio) for the [Detroit Pride Innovation Summit](https://pridemi26.vercel.app/) site. It lives in `/studio` beside the Vite/React app and is **not** bundled into the public website.

Organizers and developers manage event content here. The live site reads from Sanity at **build time** (planned). Bulk speaker imports run through **n8n** from the runner’s Google Sheet + Drive headshots.

|                |                                                                                    |
| -------------- | ---------------------------------------------------------------------------------- |
| **Project**    | `pridemi26`                                                                        |
| **Project ID** | `b18a6pbd`                                                                         |
| **Manage**     | [sanity.io/manage/project/b18a6pbd](https://www.sanity.io/manage/project/b18a6pbd) |

---

## Prerequisites

- Node.js 22+
- Access to the Sanity project (invite from a project admin)
- Sanity CLI login: `npx sanity login`

---

## Quick start

```bash
cd studio
npm install
cp .env.example .env
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:3333`).

The Studio title shows the active dataset:

- `pridemi26` — production (default)
- `pridemi26 (<name>)` — if you override `SANITY_STUDIO_DATASET`

---

## Dataset

We use the **`production`** dataset for local Studio, hosted Studio, imports, and the live site.

Configuration is in `env.ts`, overridden by `.env`.

---

## Environment variables

Copy `.env.example` to `.env` (gitignored):

```bash
SANITY_STUDIO_PROJECT_ID=b18a6pbd
SANITY_STUDIO_DATASET=production
```

| Variable                   | Description                            |
| -------------------------- | -------------------------------------- |
| `SANITY_STUDIO_PROJECT_ID` | Sanity project ID                      |
| `SANITY_STUDIO_DATASET`    | Target dataset (default: `production`) |

---

## Content model

Schemas live in `schemaTypes/`:

| Document         | Description                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **`event`**      | One per summit year (e.g. Detroit Pride Innovation Summit 2026). Anchors speakers and sessions. |
| **`speaker`**    | Person: name, bio, org, headshot, badges (WTM/GDE), optional social links.                      |
| **`session`**    | Talk or panel: title, track, time, room, description, `participants[]` → speaker refs.          |
| **`teamMember`** | Organizers and dev team: headshot, role, org, bio, `teamGroup` (`compass`, `devteam`, etc.).    |

**Panels:** multiple speakers on one session card share the same session title. The runner sheet uses one row per speaker per session; n8n groups by title.

**Speaker grid:** one card per person. If someone has multiple sessions, the site uses the first session unless `featuredSession` is set on the speaker.

**Team sections:** filter by `teamGroup` — `compass` for organizers, `devteam` for the site dev team (matches `team.js` today).

Create an **Event** document before adding speakers, sessions, or team members.

---

## Common commands

Run from `/studio`:

| Command                                                     | Description                                            |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                                               | Local Studio (hot reload)                              |
| `npm run build`                                             | Production build of Studio                             |
| `npm run deploy`                                            | Deploy hosted Studio to `*.sanity.studio`              |
| `npx sanity schema deploy`                                  | Push schema to the Content Lake (required for API/MCP) |
| `npx sanity dataset list`                                   | List datasets                                          |
| `npx sanity documents query '*[_type == "speaker"][0...5]'` | Sample GROQ query                                      |

---

## Import workflow (n8n)

Content is **not** edited in `src/data/` long term. Planned flow:

```text
Runner Google Sheet + Drive headshots
        ↓
n8n import → production dataset
        ↓
Vercel redeploy → site build fetches Sanity
```

- **Imports** → `production` dataset, verify in Studio
- **Urgent fixes** → edit in Studio between imports
- **Speaker drops** → remove from sheet on next import, or unpublish in Studio

Headshots are uploaded to Sanity assets during import (not hotlinked from Drive or Cloudinary).

**n8n + import script:** see [`/n8n/README.md`](../n8n/README.md) and `npm run import:speakers`.

---

## Project layout

```text
studio/
├── schemaTypes/     # event, speaker, session schemas (TypeScript)
├── env.ts           # projectId / dataset from env vars
├── sanity.config.ts # Studio config
├── sanity.cli.ts    # CLI config (schema deploy, deploy, etc.)
├── structure.ts     # Studio sidebar structure
└── .env.example     # Local env template
```

The main site (`/src`) will add a Sanity client and fetch layer separately. Studio and the site share the same Sanity **project** but are separate apps.

---

## Code style

Studio uses its own Prettier config (`.prettierrc`). Root CI runs `prettier --check .` across the repo; generated paths (`dist/`, `.sanity/`) are ignored via the root `.prettierignore`.

---

## Related docs

- [Sanity getting started](https://www.sanity.io/docs/sanity-studio)
- [Environment variables in Studio](https://www.sanity.io/docs/studio/environment-variables)
- [Schema deploy](https://www.sanity.io/docs/cli-reference/schema)
