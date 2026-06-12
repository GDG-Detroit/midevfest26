# pridemi26 Sanity Studio

Content Studio for the Pride Innovation Summit site.

## Local setup

```bash
cd studio
npm install
cp .env.example .env
npm run dev
```

Studio reads `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` from `.env` (see `.env.example`).

**Default dataset is `development`** — not `production` — so local edits do not touch live content.

Create the dev dataset once if it does not exist:

```bash
npx sanity dataset create development
```

Copy production content into dev when you need a realistic sandbox:

```bash
npx sanity dataset copy production development --replace
```

## Production

- **Hosted Studio:** set `SANITY_STUDIO_DATASET=production` in [Sanity project settings](https://www.sanity.io/manage/project/b18a6pbd).
- **CLI deploy:** `SANITY_STUDIO_DATASET=production npm run deploy`
- **Schema deploy to production:** `SANITY_STUDIO_DATASET=production npx sanity schema deploy`

The Studio title shows the active dataset when not production (e.g. `pridemi26 (development)`).
