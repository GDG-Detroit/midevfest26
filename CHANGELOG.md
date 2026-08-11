# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `public/robots.txt` — crawler rules and sitemap reference
- `public/sitemap.xml` — static sitemap for public routes
- README: SEO & social sharing section, updated project structure, Studio/n8n doc links
- Navbar mobile menu: `.nav-menu-expanded` with `max-height: calc(100vh - 80px)`, `overflow-y: auto`, and `-webkit-overflow-scrolling: touch` so the menu never exceeds viewport height
- WCAG 1.4.10 Reflow: media query at `max-width: 480px` and `max-height: 400px` to un-stick the header (`position: absolute`) and reduce padding so content is not blocked at high zoom or small viewports
- `n8n/RUNBOOK.md` — step-by-step import pipeline runbook covering first-time server setup, per-event checklist, "what lives where" reference table, and troubleshooting guide; designed to travel with every cloned repo
- `.env.schema` — varlock schema documenting all import script environment variables with `@required` and `@sensitive` annotations
- `pnpm-workspace.yaml` (root and `studio/`) — all pnpm configuration, including the `@babel/core` override and the `allowBuilds` list of packages permitted to run install scripts
- `docker/nginx.conf` — static serving config with SPA fallback, immutable caching for hashed assets, and `no-cache` on `index.html`
- `CLAUDE.md` — working notes for AI coding agents: content data flow, generated-file rules, pnpm gotchas
- `.claude/settings.json` — shared agent permissions, with a deny list covering `scripts/sanity-import/.env`, service-account keys, and any `npm install`
- README **Getting access** section — what a new contributor needs to request, and what the clone alone can do without it
- `src/contexts/speakerContextCore.js` — bare speaker context, matching the existing `*ContextCore` pattern
- `package.json`: `packageManager` pinned to `pnpm@11.21.0`, and an `engines` floor of Node `>=22.12.0` — the strictest constraint in the locked graph, carried by `vite`, `rolldown`, and `@vitejs/plugin-react` (`^20.19.0 || >=22.12.0`)

### Changed

- **Hero background swap**: replaced the "pride trail" WebGL animation with a raymarched "Holo Blinds" shader (source concept: [Sabo Sugi](https://codepen.io/sabosugi/pen/azpNzMG)); `src/layouts/prideTrailScene.js` renamed to `heroScene.js`, `LandingSectionPride.jsx` renamed to `LandingSectionHero.jsx`; pause/play behavior unchanged; colors are placeholder pending brand palette; static poster fallback images still show the old effect and need regenerating
- **React 19 upgrade**:
  - `react` / `react-dom` 18.2 → 19.2
  - `vite` 4.4 → 8.1
  - swapped `@vitejs/plugin-react-swc` for `@vitejs/plugin-react`
  - `esbuild` 0.19 → 0.28
  - added `@babel/core` override (`^7.29.0`)
  - `vite.config.js`: enabled `legacy.inconsistentCjsInterop` (Rolldown's stricter CJS interop otherwise mis-imports `react-fast-marquee`)
  - `.eslintrc.cjs`: bumped React version setting to 19.2
- **Rebrand to Michigan DevFest**: repurposed from the Black History Month Innovation Summit to the Michigan DevFest; renamed the project/repository to `pridemi26` and updated README, CONTRIBUTING, ACCESSIBILITY, COLOR, and SECURITY docs accordingly
- **Theme system**: shipped four switchable color themes (Purple default, Blue, Green, Gold) via `iwd` Tailwind tokens and `data-theme`; updated `COLOR.MD` to match
- Open Graph and Twitter/X card meta tags in `index.html` — aligned to `pridemi26.vercel.app` (replaced legacy `iwdsummit.com` URLs)
- **Navbar**: Removed pathway/route-link logic; Navbar now only shows section (anchor) links; route links like Previous Events remain in Footer only
- **Migrated from npm to pnpm 11**: root and `studio/` remain two independent installs with separate lockfiles, deliberately not a workspace
  - both `package-lock.json` files replaced by `pnpm-lock.yaml`
  - pnpm 11 reads no configuration from `package.json`, so the `@babel/core` override moved to `pnpm-workspace.yaml`; left in place it is ignored silently ([pnpm#11536](https://github.com/pnpm/pnpm/issues/11536))
  - the orphaned `allowScripts` block — `@lavamoat/allow-scripts` syntax with lavamoat never installed, enforcing nothing — became a real `allowBuilds` list
  - dependency install scripts are now blocked by default, and `minimumReleaseAge` defaults to 24h, so freshly published versions cannot enter a build
  - husky hooks, CI, and all docs switched to `pnpm run`; note `pnpm run deploy` is required in `studio/`, since bare `pnpm deploy` hits pnpm's own built-in
  - a fresh resolution moved several ranges: `prettier` 3.1 → 3.9, `eslint-plugin-react-refresh` 0.4.4 → 0.4.26, `tailwindcss` 3.4.18 → 3.4.19
- **Docker image rebuilt as multi-stage**: runtime is now `nginx-unprivileged` serving static files instead of Node running `vite preview`. Removes the global `npm install -g serve@14`, which floated within 14.x and sat outside the audited lockfile graph even though `serve@14.2.6` was already pinned there
- **Prettier reformat** under 3.9, which changed how multi-value CSS declarations wrap; lockfiles added to `.prettierignore`
- `n8n/README.md` and `n8n/RUNBOOK.md`: added an explicit `corepack` step to provision pnpm 11 — `nvm` supplies node and npm only, and the `packageManager` field is metadata, not an installer

### Fixed

- **Deep links rendered a blank page.** `vite.config.js` used a relative `base: './'`, so `index.html` referenced `./assets/index-<hash>.js`. On a nested route such as `/previous-events/2025` the browser resolved that against the current path, requested `/previous-events/assets/index-<hash>.js`, and the SPA fallback returned `index.html` with `Content-Type: text/html` — which the browser refuses to execute as a module script. Client-side navigation masked it entirely; only direct visits, refreshes, and shared links broke. Now `base: '/'`. Affected every route below the root: `/past-events/:year`, `/previous-events/:year`, and the flat routes on refresh
- `package.json` — `import:speakers` and `import:team` never loaded `scripts/sanity-import/.env`, so both exited on the first `requireEnv()` call before importing anything. Both now pass `--env-file-if-exists`, which tolerates a missing file so the script's own error message survives
- `.eslintrc.cjs` — `settings.tailwindcss.config` is now an absolute path. `eslint-plugin-tailwindcss` derives its package-resolution directory from `dirname()` of that value, and the relative form yielded `'.'`, which resolved from the plugin's own nested location and failed with "Could not resolve tailwindcss"
- `src/components/speakers/SpeakerContext.jsx` — exported both a context and a component, which breaks Fast Refresh; the context moved to `src/contexts/speakerContextCore.js`
- `.husky/commit-msg` — dropped the npm-style `--` separator, which pnpm forwards rather than strips, causing commitlint to lint the entire commit history instead of the message being written
- `scripts/sanity-import/import-speakers.mjs` — corrected import paths from `./sanity-client.mjs` and `./google.mjs` to `./lib/sanity-client.mjs` and `./lib/google.mjs` (files live in `lib/` subdirectory)
- `scripts/sanity-import/lib/google.mjs` — added `supportsAllDrives: true` and `includeItemsFromAllDrives: true` to Drive API calls so the import works with Google Workspace Shared Drives, not just personal Drive

## [0.2.0] - 2026-02-13

### Changed

- **Fork & rebrand**: Repurposed from Compass Detroit / Michigan DevFest for the Black History Month Innovation Summit (BHM-website)
- Updated package.json: name to `bhm-website`, repository to `Compass-Detroit/BHM-website`, added description
- Updated README, CONTRIBUTING, ACCESSIBILITY docs for Black History Month Innovation Summit
- Updated Docker documentation and image naming to `bhm-website`
- Updated index.html metadata, site.webmanifest, and GitHub issue templates
- Updated CHANGELOG links to point to BHM-website repository

## [0.1.2] - 2026-02-01

### Added

- Hash-based smooth scroll: Navbar `useEffect` scrolls to section when navigating to `/#section-id` from any page (Navbar or Footer), with retry until the home section is in the DOM
- Add new tab in navigation, "Pathways"
- Careers Hub, Connections, and Media grouped under a single “Pathways” item with caret
- Golden (primary) underline on hover for Pathways subnav items (desktop)
- Mobile: active pathway page highlighted with yellow (primary) background; Pathways section auto-expands when on a pathway page

### Changed

- **Pathways dropdown accessibility**: Focus-based open/close (`onBlur` on container); keyboard support (Enter/Space toggle, Arrow Down/Up open and focus first/last item, Escape close and return focus to trigger, Arrow keys move between items); `aria-haspopup="menu"`; removed `preventDefault` from button click; mouse leave only closes when focus is outside the dropdown
- **Footer**: Section links always use `/#section-id`; removed Footer’s own scroll logic so smooth scrolling is handled by the Navbar’s hash-based effect for both Navbar and Footer links
- Navbar z-index raised (z-30) so it stays in front of LandingSection and other content
- Removed overflow-hidden from nav and inner grid so Pathways dropdown is no longer clipped
- Pathways trigger aligned with other nav items (items-baseline, inline-flex) so “Pathways” sits on the same line
- Pathways dropdown panel nudged up slightly (-mt-0.5) for cleaner alignment

## [0.1.1] - 2026-01-30

### Added

- New pages: Connections, Media, Careers Hub
- Media section and Connections page
- Community and membership content on home

### Changed

- Navigation and copyright updates; navbar items reorganized
- Home section and sub-sections restructured
- Broader description area on home
- Team section migrated to leadership with new tabs
- Partners section refactored
- Speakers section refactored
- Remove Past Events page and redirect to Previous Events page

## [0.1.0] - 2026-01-28

### Added

- Initial Compass Detroit website setup
- Yoda404 component with floating animation
- Custom Tailwind color palette (primary, charcoal, pumpkin, burnt, lime, indigo)
- Custom font families (Montserrat, BioRhyme, Orbitron, Asimovian)
- Accessibility documentation (ACCESSIBILITY.md, CONTRAST-ANALYSIS.md)
- Git hooks for linting, formatting, and commit message validation
- ESLint and Prettier configuration
- VS Code extension recommendations

### Fixed

- Fixed git remote configuration (origin now points to Compass-Detroit/compass-website)
- Fixed Montserrat font weight to use Medium (500) instead of Thin (100)
- Fixed incorrect variable name usage

[Unreleased]: https://github.com/GDG-Detroit/midevfest26/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/GDG-Detroit/midevfest26/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/GDG-Detroit/midevfest26/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/GDG-Detroit/midevfest26/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/GDG-Detroit/midevfest26/releases/tag/v0.1.0
