/**
 * Extract a hand-authored team roster into a seed file for import-team.mjs.
 *
 * A source is a plain ESM module exporting `teamData`, whose headshots are
 * bundler-aliased `import` statements (`@/data/2026/assets/...`). Same approach
 * as extract-devfest-2025.mjs: parse to an AST and read the export as data,
 * rather than pattern-matching the source or executing it.
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
import { readExportedLiteral } from './lib/parse-static-module.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

const DEFAULT_OUT = 'scripts/sanity-import/data/team-2026.json'

/**
 * Headshots arrive as bundler-aliased image imports. The row wants the path,
 * so each import binding resolves to its specifier with the alias stripped —
 * what remains is relative to src/.
 */
function resolveImageImport(specifier) {
  return specifier.replace(/^@\//, '')
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

/**
 * `name`, `team` and `avatar` used to pass through raw while the social fields
 * went through cleanText. A roster is arbitrary literal data — the parser will
 * hand back whatever the source wrote — so a numeric name reached Sanity as a
 * number in a string field, and a non-string avatar crashed the importer on
 * `.trim()`. Every field now goes through the same coercion the social ones
 * always did.
 */
function buildRow(member, index, { name, teamGroup, role }) {
  return {
    slug: slugify(name),
    name,
    role,
    team_group: teamGroup,
    organization: cleanText(member.organization),
    university: cleanText(member.university),
    bio: cleanText(member.bio),
    commits: toCommitCount(member.commits),
    linkedin: cleanText(member.linkedin),
    twitter: cleanText(member.twitter),
    github: cleanText(member.github),
    // Source order is the intended display order within a group.
    sort_order: index,
    headshot_path: cleanText(member.avatar) ?? '',
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

  // Parsed, never executed — see lib/parse-static-module.mjs. A roster is data,
  // and running it would hand arbitrary top-level code the Node privileges of
  // whoever is doing the migration.
  const teamData = readExportedLiteral(source, 'teamData', {
    resolveImport: resolveImageImport,
  })

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
    // Truthiness is not enough: `name: 42` and `team: {}` are both truthy and
    // both produce a row the importer cannot use.
    const name = cleanText(member?.name)
    if (!name) {
      warnings.push(
        `Skipped record at index ${index}: name is missing or not a string`
      )
      return
    }

    const teamGroup = cleanText(member.team)
    if (!teamGroup) {
      warnings.push(`${name}: team group is missing or not a string, skipped`)
      return
    }

    // The schema marks role required and the card always renders it, so an
    // absent one used to be backfilled as "Organizer" downstream — inventing a
    // job title for a real person and publishing it. Skip instead: a missing
    // role is a gap in the source that someone has to fill in.
    const role = cleanText(member.role)
    if (!role) {
      warnings.push(`${name}: role is missing or blank, skipped`)
      return
    }

    // Not fatal — the member imports without a headshot rather than being
    // dropped — but silence here is how a bad path reaches the importer.
    if (member.avatar != null && cleanText(member.avatar) === undefined) {
      warnings.push(`${name}: avatar is not a string, ignored`)
    }

    const row = buildRow(member, index, { name, teamGroup, role })
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
