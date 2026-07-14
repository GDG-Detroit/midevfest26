# Migration Playbook

Steps for cloning this repo forward to the next event site. See README's
**Project Lineage** section for the history this repo already carries
(Compass Detroit → BHM-website → pridemi26 → midevfest26).

Do infrastructure/dependency work first, content rebrand second — don't mix
them in one PR.

## 1. Repo & Git

- [ ] Create the new repo under the target org
- [ ] `git remote set-url origin <new-repo-url>`
- [ ] Update local folder name to match
- [ ] Confirm: `git remote -v`

## 2. Global Rename Sweep

- [ ] `grep -rniI "<old-slug>" . --exclude-dir={node_modules,.git,dist}`
- [ ] Replace paired `org/repo` references first, then bare slug
- [ ] Check these specifically:
  - `package.json` + `package-lock.json` (root **and** `studio/`)
  - `studio/sanity.cli.ts` (`studioHost`), `studio/env.ts` (`studioTitle`)
  - `index.html` (canonical, OG, Twitter meta)
  - `public/robots.txt`, `public/sitemap.xml`
  - `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/config.yml`
  - `Dockerfile` + Docker commands in README
  - localStorage keys (e.g. `ScheduleContext.jsx` — new key, not a rename;
    don't migrate old event's saved data into a new event's dataset)
- [ ] Leave `CHANGELOG.md` historical narrative alone — only update the
      compare-links block at the bottom

## 3. Sanity CMS

- [ ] Create a new Sanity project + dataset (don't reuse the old one)
- [ ] Update `studio/sanity.cli.ts`: `projectId`, `studioHost`, `appId`
- [ ] Update `studio/env.ts` default project/dataset
- [ ] Redeploy studio: `cd studio && npm run deploy`
- [ ] Re-point env vars in `scripts/sanity-import/.env` and `n8n/`

## 4. Infra & Deploy

- [ ] New Vercel project, domain, env vars
- [ ] Docker image/container naming (`Dockerfile`, README command table)
- [ ] New OG/social card image, canonical URLs, sitemap domain

## 5. Content & Branding

- [ ] Event name, dates, venue, partners
- [ ] Theme colors (`COLOR.MD` / `iwd` tokens) if the visual identity changes
- [ ] Speakers/sessions data source
- [ ] Hero animation/assets if changing

## 6. Dependencies

- [ ] Check for stale major versions (React, Vite, etc.) before rebrand work
      starts — upgrade first
- [ ] `npm outdated`, `npm audit`

## 7. Docs to Update

- [ ] README: add a new entry to **Project Lineage** (source + what this
      fork gained)
- [ ] CHANGELOG: new `[Unreleased]` entry describing the fork
- [ ] CONTRIBUTING, SECURITY: repo/org references

## 8. Verify

- [ ] `npm run build` succeeds
- [ ] `npm run lint` / `npm run lint:a11y` clean
- [ ] Spot-check rewritten URLs resolve
- [ ] `git remote -v` points to the new repo
