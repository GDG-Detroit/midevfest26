#!/usr/bin/env node
/**
 * Fail if the running Node is below package.json's engines.node floor.
 * pnpm 11.21 also refuses to start below 22.13, so this is the check that can
 * still run when an older Node is on PATH (git hooks, Docker, n8n).
 */
const MIN = [22, 13, 0]
const current = process.versions.node.split('.').map(Number)
const ok =
  current[0] > MIN[0] ||
  (current[0] === MIN[0] &&
    (current[1] > MIN[1] || (current[1] === MIN[1] && current[2] >= MIN[2])))

if (!ok) {
  console.error(
    `This repo requires Node >=${MIN.join('.')} (found ${process.version}).\n` +
      'Install the version in .nvmrc: nvm install && nvm use'
  )
  process.exit(1)
}
