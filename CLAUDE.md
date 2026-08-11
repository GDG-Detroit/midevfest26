# CLAUDE.md

Guidance for Claude Code working in this repo. `README.md` covers setup and scripts —
this file covers what is easy to get wrong.

## What this is

Michigan DevFest 2026 marketing site. Vite + React 19 + Tailwind 3, **plain JavaScript
(JSX), not TypeScript**. Deployed on Vercel. A separate Sanity Studio lives in `studio/`
as its own pnpm project with its own `package.json` and `node_modules` — it is
TypeScript, and it does _not_ share the root install.

This codebase is a template that has been forked and rebranded several times
(Compass Detroit → BHM → pridemi26 → midevfest26). Prefer changes that keep it
re-brandable over changes that hardcode this event.

## Content data flow — read this before touching `src/data/`

Content moves in one direction:

```
Google Sheet / prior-year repo
  → scripts/sanity-import/*.mjs   (one-time / occasional imports, writes to Sanity)
    → Sanity (project 5qtiaw9u, dataset `production`)
      → scripts/fetch-event-data.mjs   (runs on `prebuild` and `pnpm run fetch:event-data`)
        → src/data/<year>/*.generated.json
          → src/data/<year>/*.js       (hand-authored wrappers that consume the JSON)
            → components
```

**Never hand-edit `*.generated.json`.** These are committed build artifacts, not source:

- `src/data/<year>/speakers.generated.json`
- `src/data/2026/team.generated.json`
- `src/data/events.generated.json` — the archive-year manifest; a new year appearing in
  Sanity shows up here without a code edit

To change their contents, change the data in Sanity and re-run `pnpm run fetch:event-data`.
Editing them directly produces a change that the next build silently reverts.

Everything else in `src/data/2026/` (`partners.js`, `venues.js`, `schedules.js`,
`jobboard.js`, `navigation.js`, `community.js`, `conferenceActivities.js`,
`inspirationalQuotes.js`) is still hand-authored static data. Moving more of it into
Sanity is active work — see the `sanity-content-migration` skill before starting.

## Commands

**This repo uses pnpm 11, not npm.** Never run `npm install` here — it would generate a
competing `package-lock.json` and bypass every setting in `pnpm-workspace.yaml`.

Root and `studio/` are two independent pnpm installs with separate lockfiles, not a
workspace. `pnpm run studio:dev` proxies into the studio via `pnpm --dir studio run dev`.

- `pnpm run dev` — Vite dev server, port 5173
- `pnpm run dev:cms` — fetch from Sanity first, then dev
- `pnpm run build` — `prebuild` fetches from Sanity, then `vite build`
- `pnpm run lint` — ESLint, `--max-warnings 0`. Includes `jsx-a11y` and Tailwind class order.
- `pnpm run format` / `format:check` — Prettier

Always write `pnpm run <script>`, never the bare `pnpm <script>` shorthand. pnpm has
built-in subcommands named `deploy`, `build`, `start`, `setup`, and `rebuild`, which
shadow same-named package scripts. `cd studio && pnpm deploy` runs pnpm's own deploy
command, not Sanity's — it must be `pnpm run deploy`.

There is **no test suite** in this repo. Do not claim a change is verified because it
builds. Verify by running `pnpm run lint`, `pnpm run build`, and checking the affected
route in the dev server.

## Conventions

- **Node 22** (`.nvmrc`). ESLint is pinned to `react: { version: '19.2' }` in
  `.eslintrc.cjs` — bump it when React majors change or rules misfire.
- **Path aliases**, declared in both `vite.config.js` (build) and `jsconfig.json`
  (editor) — change one, change the other: `@` → `src`, `@assets` → `src/assets`,
  `@components` → `src/components`. Use them; avoid `../../..`. In practice the codebase
  uses `@/` almost exclusively (~170 imports); `@assets` and `@components` are declared
  but currently unused, so prefer `@/components/...` for consistency with what's there.
- **Commits are gated.** Husky runs `lint-staged` (ESLint + Prettier) on pre-commit and
  `commitlint` with `config-conventional` on commit-msg. Commit messages must be
  Conventional Commits (`fix(sanity): ...`) or the commit is rejected.
- **Theming** is CSS custom properties in `src/index.css`, driven by
  `src/constants/ui.js` and `ThemeContext.jsx`. Four themes. Add colors as variables,
  not as literal Tailwind values, or you break the switcher. See `COLOR.MD`.
- **Accessibility is a gate, not a nice-to-have.** `eslint-plugin-jsx-a11y` runs on every
  commit and `ACCESSIBILITY.md` / `CONTRAST-ANALYSIS.md` record decisions already made.
  Check contrast against those docs before introducing a color pairing.

## Gotchas

- **pnpm 11 reads no settings from `package.json`.** Overrides, allowed build scripts,
  and everything else live in `pnpm-workspace.yaml`. A setting left in `package.json`
  under a `pnpm` key is ignored _silently_, with no warning
  ([pnpm#11536](https://github.com/pnpm/pnpm/issues/11536)). The `@babel/core` override
  is load-bearing — if an `ERESOLVE`-style Babel conflict reappears, check that file first.
- Dependency install scripts are blocked by default and `strictDepBuilds` defaults to
  true, so a package wanting to build fails the install with `ERR_PNPM_IGNORED_BUILDS`.
  Add it to `allowBuilds` in `pnpm-workspace.yaml`; don't disable the check.
- `minimumReleaseAge` defaults to 1440 minutes, so versions published in the last 24h
  won't resolve. Because the default is not set explicitly, `minimumReleaseAgeStrict`
  stays false and resolution falls back to an older version rather than failing — but
  `trustLockfile` also defaults to false, so `--frozen-lockfile` in CI re-verifies every
  locked entry against that age. Odd resolution results right after a dependency bump
  are usually this. Wait it out rather than setting `trustLockfile`.
- `vite.config.js` sets `legacy.inconsistentCjsInterop: true` purely for
  `react-fast-marquee`, which is untagged CJS. Don't remove it without replacing that
  dependency; the failure is a runtime "component is not a function", not a build error.
- `three` and `react-vendor` are manually chunked in the Vite build config. Adding a
  large dependency may need a new `manualChunks` entry to stay under the 600 kB warning.
- Import scripts under `scripts/sanity-import/` read `scripts/sanity-import/.env`
  (gitignored; schema documented in `.env.schema`). They write to real Sanity.
  **Always run them with `--dry-run` first** and show the diff before writing.
- `scripts/sanity-import/assets/` is gitignored — staged headshots are transient. Once
  uploaded, Sanity's CDN is the source of truth for images.
- Several files are 400–900 lines (`InspirationalHero.jsx`, `SessionsSection.jsx`,
  `SpeakerDetails.jsx`, `Navbar.jsx`). Read the specific region rather than the whole file.

## Skills

Repo-specific skills live in `.claude/skills/`. Note this directory is **gitignored**, so
they exist only locally — they are not shared with collaborators or CI.

- `event-rebrand` — pointing this template at a new event/brand/domain
- `sanity-content-migration` — new Sanity instance, new content types, historical imports
- `react-vite-major-upgrade` — React/Vite major bumps
- `tracks-and-venue-config` — tracks and rooms, which span four files that must agree
- `speaker-intake-and-media` — speaker forms, headshots, bio/abstract limits
- `multi-year-event-archive` — `/previous-events/:year` and past-year data sourcing
- `npm-supply-chain-triage` — IoC sweep when npm compromise news breaks, or after an
  install during an active window
