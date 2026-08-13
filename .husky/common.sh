# Git GUI apps (e.g. GitHub Desktop, Cursor) run hooks with a minimal or stale PATH.
# Homebrew pnpm's shebang is `#!/usr/bin/env node`, so an old nvm Node still on
# PATH makes pnpm 11.21 refuse to start (needs >=22.13). Switch to .nvmrc when a
# trusted nvm/fnm install exists, then refuse to run below the engines floor.

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

hook_fail() {
  echo "husky: $1" >&2
  exit 1
}

# Never source nvm.sh from an inherited NVM_DIR — a crafted path would execute
# arbitrary code at hook start. Official nvm keeps versions in $HOME/.nvm;
# Homebrew nvm keeps the script in the Cellar and versions in $HOME/.nvm.
export NVM_DIR="$HOME/.nvm"
nvm_script=""
if [ -f "$NVM_DIR/nvm.sh" ]; then
  nvm_script="$NVM_DIR/nvm.sh"
elif [ -f /opt/homebrew/opt/nvm/nvm.sh ]; then
  nvm_script=/opt/homebrew/opt/nvm/nvm.sh
elif [ -f /usr/local/opt/nvm/nvm.sh ]; then
  nvm_script=/usr/local/opt/nvm/nvm.sh
fi

switched=0
if [ -n "$nvm_script" ]; then
  # shellcheck source=/dev/null
  . "$nvm_script"
  if nvm use --silent; then
    switched=1
  fi
fi

if [ "$switched" -eq 0 ] && command_exists fnm; then
  eval "$(fnm env)"
  if fnm use >/dev/null 2>&1; then
    switched=1
  fi
fi

if ! command_exists pnpm; then
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi

if ! command_exists node; then
  hook_fail "Node.js is not on PATH. Install the version in .nvmrc (nvm install && nvm use)."
fi

node scripts/check-node-version.mjs || exit 1

if ! command_exists pnpm; then
  hook_fail "pnpm is not on PATH. Enable corepack (corepack enable && corepack prepare pnpm@11.21.0 --activate)."
fi
