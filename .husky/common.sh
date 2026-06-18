# Git GUI apps (e.g. GitHub Desktop) run hooks with a minimal PATH.
# Ensure node/npm/npx are available before running hook commands.

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

if ! command_exists npm; then
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi

if ! command_exists npm; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
  fi
fi

if ! command_exists npm && command_exists fnm; then
  eval "$(fnm env)"
fi
