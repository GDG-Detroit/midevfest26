# Michigan DevFest 2026
# Build: docker build -t midevfest26 .
# Run:   docker run -p 3000:3000 midevfest26
#
# Multi-stage. The previous single-stage image ran
#   npm prune --omit=dev --include=dev vite
# to strip dev dependencies while keeping vite alive for `vite preview`.
# pnpm has no `--include` escape hatch on `pnpm prune --prod`, and serving a static
# build through a dev server was never the right shape anyway. The build stage now
# produces dist/ and the runtime stage carries only a static file server.

# ---- build ----------------------------------------------------------------
# Pinned to 22 to match .nvmrc. pnpm 11 requires Node 22+; the old `FROM node:alpine`
# floated to whatever was latest and would silently break on a Node major bump.
FROM node:22-alpine AS build

WORKDIR /app

# corepack reads the pinned `packageManager` field from package.json, so the pnpm
# version is defined in exactly one place across Docker, CI, and local dev.
RUN corepack enable

# Copy manifests first so the install layer caches independently of source changes.
# pnpm-workspace.yaml carries overrides/allowBuilds and MUST be present before
# install — without it the @babel/core override is silently dropped.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

# `prebuild` fetches published content from Sanity, so this needs network access at
# build time. It falls back to committed *.generated.json if the fetch is unavailable.
RUN pnpm run build

# ---- runtime --------------------------------------------------------------
# nginx, not Node. The previous runtime stage ran `npm install -g serve@14`, which
# had three problems: it floated within 14.x so a newly published release could
# reach production unreviewed, it lived outside the audited pnpm-lock.yaml graph so
# `pnpm audit` in CI never saw it, and `serve` without `-s` 404s on every
# BrowserRouter deep link. A static server with no package graph removes all three.
#
# nginx-unprivileged runs as UID 101 rather than root, preserving the non-root
# property of the previous image.
FROM nginxinc/nginx-unprivileged:alpine AS runtime

# Overwrites the image's default server block, which listens on 8080.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
