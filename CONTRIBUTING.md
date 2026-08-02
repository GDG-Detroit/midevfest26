# Working on this repo

Notes for whoever is working on `midevfest26` — currently a two-person team, so this
is a working reference rather than an onboarding guide.

## Setup

Node 22+ and npm.

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:cms      # pull content from Sanity first, then dev
npm run studio:dev   # Sanity Studio
```

## Before pushing

```bash
npm run lint          # ESLint, includes jsx-a11y rules
npm run format:check  # Prettier
npm run build         # runs fetch-event-data via prebuild
```

`pre-commit` runs lint-staged (ESLint + Prettier on staged files). CI runs lint,
format check, build, an axe accessibility pass against the built site, and an npm
audit.

## Commits

Conventional commits, enforced by commitlint on `commit-msg`.

```
type(scope): description
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`,
`perf`, `revert`. Subject in lower case, no trailing period, 100 chars max.

```bash
git commit -m "feat(speakers): add speaker bio modal"
git commit -m "fix(navbar): resolve mobile menu focus trap"
```

This feeds `CHANGELOG.md` — keep it accurate.

## Accessibility

The `jsx-a11y` rules live in `.eslintrc.cjs` and run as part of `npm run lint`, so
accessibility failures surface as lint errors rather than a separate step. CI runs
axe against the built site on every PR.

`ACCESSIBILITY.md` documents the decisions behind the current implementation, and
`CONTRAST-ANALYSIS.md` covers the palette. Read those before changing colors or
interaction patterns — a lot of the current markup is deliberate.

## Content vs. code

Event content (speakers, sessions, team) lives in Sanity and is pulled into
`src/data/<year>/speakers.generated.json` at build time by
`scripts/fetch-event-data.mjs`. Don't hand-edit generated files.

Static content still in JS — partners, job board, navigation, venues, activities —
lives in `src/data/<year>/`. See the `sanity-content-migration` skill in
`.claude/skills/` for how to move a type into the CMS.

## GitHub Desktop pushes to the wrong repo

If Push or Create Pull Request targets the wrong org, the remote is stale:

```bash
git remote -v            # confirm origin points where you expect
git remote set-url origin <correct-url>
```

Then in GitHub Desktop: **File → Remove repository** (list only, files stay), then
**File → Add Local Repository** and re-select the folder.

## Skills

`.claude/skills/` holds repo-specific playbooks — event rebrands, React/Vite major
upgrades, Sanity migration, the multi-year archive, track and venue config, and
speaker intake. Check there before rediscovering something the hard way.
