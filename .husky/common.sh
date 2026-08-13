# Git GUI apps (e.g. GitHub Desktop, Cursor) run hooks with a minimal or stale PATH.
# Finding Homebrew pnpm is not enough: its shebang is `#!/usr/bin/env node`, so an
# old nvm Node still on PATH makes pnpm 11.21 refuse to start (needs >=22.13).
# Always honor .nvmrc when nvm is available.

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  # Bare "22" in .nvmrc → latest installed 22.x. --silent keeps hook output clean.
  nvm use --silent 2>/dev/null || true
fi

if ! command_exists pnpm && command_exists fnm; then
  eval "$(fnm env)"
fi

if ! command_exists pnpm; then
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi
