/**
 * Extract a hand-authored team roster into a seed file for import-team.mjs.
 *
 * A source is a plain ESM module exporting `teamData`, whose headshots are
 * bundler-aliased `import` statements (`@/data/2026/assets/...`). Same trick as
 * extract-devfest-2025.mjs: rewrite each image import into a path string, then
 * evaluate the module, rather than pattern-matching the source.
 *
 * `star` and `topContributor` are dropped: nothing under src/ reads either one.
 *
 * --source is REQUIRED and has no default on purpose. This is a one-shot
 * migration tool: it ran once against the 2026 roster to produce
 * data/team-2026.json, and then team.js became a passthrough for Sanity data.
 * Defaulting to team.js would mean the documented command could only ever fail,
 * so the path has to be named deliberately.
 *
 * The 2026 seed is already committed — you want this only when migrating a new
 * event's hand-authored roster, or rebuilding the seed from git history:
 *
 *   git show <pre-migration-ref>:src/data/2026/team.js > /tmp/team.js
 *   node scripts/sanity-import/extract-team.mjs \
 *     --source=/tmp/team.js \
 *     --out=scripts/sanity-import/data/team-2026.json
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

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

/**
 * team.js is a passthrough for Sanity-generated data now. Re-extracting it
 * would yield rows whose avatars are CDN URLs rather than files, and feeding
 * those to the importer would blank every headshot it "cannot find". Detect it
 * from the source text, before evaluation — the generated-JSON import is the
 * unambiguous signature, and inlineImageImports would otherwise mangle it into
 * a string and fail with something unhelpful.
 */
function assertNotGenerated(source, sourcePath) {
  if (!/from\s+'[^']*\.generated\.json'/.test(source)) return

  throw new Error(
    `${path.relative(ROOT, sourcePath)} already reads from Sanity — it is a ` +
      `passthrough for generated data.\n` +
      '  There is nothing to extract: the roster lives in the CMS. Edit it in ' +
      'Studio,\n  or point --source at a hand-authored roster from git history.'
  )
}

export async function extractTeam({ sourcePath, outPath }) {
  const source = await readFile(sourcePath, 'utf8')
  assertNotGenerated(source, sourcePath)

  // Evaluate from a data: URL so no rewritten file is left behind and no
  // bundler alias needs resolving.
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    inlineImageImports(source)
  ).toString('base64')}`
  const { teamData } = await import(moduleUrl)

  if (!Array.isArray(teamData)) {
    throw new Error('Source module did not export a teamData array')
  }

  // Second net, for a source that dodges the passthrough check above but still
  // carries Sanity URLs instead of file paths.
  if (teamData.some((member) => /^https?:\/\//i.test(member?.avatar ?? ''))) {
    throw new Error(
      `${path.relative(ROOT, sourcePath)} has CDN URLs for avatars, not file ` +
        `paths — it is already Sanity-sourced and cannot be extracted.`
    )
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

  if (!options.source) {
    throw new Error(
      'A --source is required; there is no default.\n' +
        '  This is a one-shot migration tool and the 2026 seed is already ' +
        'committed\n  at scripts/sanity-import/data/team-2026.json. Point ' +
        "--source at a hand-authored\n  roster — a new event's team.js, or " +
        "2026's from before the migration:\n\n" +
        '    git show <pre-migration-ref>:src/data/2026/team.js > /tmp/team.js\n' +
        '    node scripts/sanity-import/extract-team.mjs --source=/tmp/team.js'
    )
  }

  const sourcePath = path.resolve(ROOT, options.source)
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
