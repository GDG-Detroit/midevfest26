/**
 * Extract the hand-authored team roster into a seed file for import-team.mjs.
 *
 * Source: src/data/2026/team.js — a plain ESM module whose headshots are
 * bundler-aliased `import` statements (`@/data/2026/assets/...`). Same trick as
 * extract-devfest-2025.mjs: rewrite each image import into a path string, then
 * evaluate the module, rather than pattern-matching the source.
 *
 * Run this once, before team.js becomes a passthrough for the generated JSON —
 * afterwards the seed file, not team.js, is what import-team.mjs reads, so the
 * import stays re-runnable against an empty dataset.
 *
 * `star` and `topContributor` are dropped: nothing under src/ reads either one.
 *
 * Usage:
 *   node scripts/sanity-import/extract-team.mjs
 *   node scripts/sanity-import/extract-team.mjs --source=... --out=...
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

const DEFAULT_SOURCE = 'src/data/2026/team.js'
const DEFAULT_OUT = 'scripts/sanity-import/data/team-2026.json'

const IMPORT_RE = /^import\s+(\w+)\s+from\s+'([^']+)'\s*$/gm

/** Rewrite `import X from '@/data/...webp'` into `const X = 'data/...webp'`. */
function inlineImageImports(source) {
  return source.replace(IMPORT_RE, (_match, binding, importPath) => {
    // Strip the bundler alias; what remains is relative to src/.
    const srcRelative = importPath.replace(/^@\//, '')
    return `const ${binding} = ${JSON.stringify(srcRelative)}`
  })
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Trim the tab/newline padding the hand-authored bios carry. */
function cleanText(value) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

/** commits is authored as a string ('150') but the schema wants a number. */
function toCommitCount(value) {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined
}

function buildRow(member, index) {
  return {
    slug: slugify(member.name),
    name: member.name,
    role: member.role ?? '',
    team_group: member.team ?? '',
    organization: cleanText(member.organization),
    university: cleanText(member.university),
    bio: cleanText(member.bio),
    commits: toCommitCount(member.commits),
    linkedin: cleanText(member.linkedin),
    twitter: cleanText(member.twitter),
    github: cleanText(member.github),
    // Source order is the intended display order within a group.
    sort_order: index,
    headshot_path: member.avatar,
  }
}

function parseArgs(argv) {
  const options = {}
  for (const arg of argv.slice(2)) {
    const match = /^--([^=]+)=(.*)$/.exec(arg)
    if (match) options[match[1]] = match[2]
  }
  return options
}

export async function extractTeam({ sourcePath, outPath }) {
  const source = await readFile(sourcePath, 'utf8')

  // Evaluate from a data: URL so no rewritten file is left behind and no
  // bundler alias needs resolving.
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    inlineImageImports(source)
  ).toString('base64')}`
  const { teamData } = await import(moduleUrl)

  if (!Array.isArray(teamData)) {
    throw new Error('Source module did not export a teamData array')
  }

  const rows = []
  const warnings = []
  const seen = new Set()

  teamData.forEach((member, index) => {
    if (!member?.name) {
      warnings.push(`Skipped record without a name at index ${index}`)
      return
    }
    if (!member.team) {
      warnings.push(`${member.name}: no team group, skipped`)
      return
    }

    const row = buildRow(member, index)
    if (seen.has(row.slug)) {
      warnings.push(`${member.name}: duplicate slug "${row.slug}", skipped`)
      return
    }

    seen.add(row.slug)
    rows.push(row)
  })

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')

  return { rows, warnings }
}

async function main() {
  const options = parseArgs(process.argv)
  const sourcePath = path.resolve(ROOT, options.source ?? DEFAULT_SOURCE)
  const outPath = path.resolve(ROOT, options.out ?? DEFAULT_OUT)

  const { rows, warnings } = await extractTeam({ sourcePath, outPath })

  for (const warning of warnings) console.warn(`  warning: ${warning}`)

  const groups = new Map()
  for (const row of rows) {
    groups.set(row.team_group, (groups.get(row.team_group) ?? 0) + 1)
  }
  const breakdown = [...groups]
    .map(([group, count]) => `${group}: ${count}`)
    .join(', ')

  console.log(
    `Extracted ${rows.length} team members (${breakdown}) -> ` +
      `${path.relative(ROOT, outPath)}`
  )
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((error) => {
    console.error('extract-team failed:', error.message)
    process.exit(1)
  })
}
