/**
 * Extract the Michigan DevFest 2025 program from the legacy site repo.
 *
 * Source: GDG-Detroit/devfest-website@2025 — src/data/2025/speakers.js, a plain
 * ESM module whose speaker records reference headshots through bundler-aliased
 * `import` statements (`@/assets/...`). It cannot be imported across repos as-is,
 * so it is parsed to an AST and read as data, rather than pattern-matching 130KB
 * of source or executing another repository's file.
 *
 * Output: a flat row per speaker-session pair, matching the column names
 * import-speakers.mjs already expects from the Google Sheet, so the same import
 * shape works for both sources.
 *
 * Usage:
 *   node scripts/sanity-import/extract-devfest-2025.mjs \
 *     --source=<path to legacy speakers.js> \
 *     --out=scripts/sanity-import/data/devfest-2025.json
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readExportedLiteral } from './lib/parse-static-module.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

/**
 * `import X from '@/assets/a/b.png'` resolves to the repo-relative path under
 * src/, which is what the extracted rows carry.
 */
function resolveImageImport(specifier) {
  return specifier.replace(/^@\/?/, '')
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

const BLANK_VARIANT = '|'

function variantKeyFor(session) {
  return `${session.time ?? ''}|${session.room ?? ''}`
}

/**
 * Sessions are keyed by title, so two genuinely different sessions that share a
 * title (a repeated "Welcome & Opening Remarks", say) would collapse into one
 * document. Disambiguate those by time and room.
 *
 * A record with neither time nor room is not a distinct session — it's a
 * panelist whose scheduling cells were left empty in the source. Fold those
 * into the scheduled variant instead of minting a phantom session.
 */
function buildSessionSlugs(speakers) {
  const byTitleSlug = new Map()

  for (const speaker of speakers) {
    const session = speaker.session
    if (!session?.title) continue

    const base = slugify(session.title)
    if (!byTitleSlug.has(base)) byTitleSlug.set(base, new Set())
    byTitleSlug.get(base).add(variantKeyFor(session))
  }

  const resolved = new Map()
  const merged = []

  for (const [base, variants] of byTitleSlug) {
    const scheduled = [...variants].filter((key) => key !== BLANK_VARIANT)
    const hasBlank = variants.has(BLANK_VARIANT)

    // One real sitting: every record for this title is the same session.
    if (scheduled.length <= 1) {
      for (const key of variants) resolved.set(`${base}|${key}`, base)
      if (hasBlank && scheduled.length === 1) merged.push(base)
      continue
    }

    scheduled.forEach((variantKey, index) => {
      const [time] = variantKey.split('|')
      resolved.set(
        `${base}|${variantKey}`,
        `${base}-${slugify(time) || `alt-${index + 1}`}`
      )
    })

    // Genuinely ambiguous: several sittings plus an unscheduled record.
    if (hasBlank) resolved.set(`${base}|${BLANK_VARIANT}`, null)
  }

  return { resolved, merged }
}

/**
 * The source mixes units: workshops carry `sessionDuration: 2` meaning two
 * hours, while the schema field is durationMinutes. Anything small enough to be
 * a nonsensical session length is an hours value.
 */
function toDurationMinutes(value) {
  if (value === '' || value == null) return ''
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return ''
  return n <= 8 ? n * 60 : n
}

/** A couple of records carry multiple URLs; the schema holds one. */
function firstUrl(value) {
  if (Array.isArray(value)) return value.find(Boolean) ?? ''
  return value ?? ''
}

function toRow(speaker, sessionSlug) {
  const session = speaker.session ?? {}
  const speakerSlug = slugify(speaker.name)
  const headshotPath = speaker.avatar ?? ''

  return {
    speaker_slug: speakerSlug,
    session_slug: sessionSlug,
    name: speaker.name,
    bio: speaker.bio ?? '',
    organization: speaker.organization ?? '',
    position: speaker.position ?? '',
    email: speaker.email ?? '',
    linkedIn: speaker.linkedIn ?? '',
    twitter: speaker.twitter ?? '',
    website: firstUrl(speaker.url),
    mastodon: speaker.mastodon ?? '',
    isWTM: Boolean(speaker.isWTM),
    isGDE: Boolean(speaker.isGDE),
    is_moderator: Boolean(speaker.isModerator),
    headshot_filename: headshotPath ? path.basename(headshotPath) : '',
    headshot_source_path: headshotPath,
    session_title: session.title ?? '',
    abstract: session.abstract ?? '',
    description: session.description ?? '',
    track: session.track ?? '',
    tags: Array.isArray(session.tags) ? session.tags.join(', ') : '',
    time: session.time ?? '',
    room: session.room ?? '',
    duration_minutes: toDurationMinutes(session.sessionDuration),
  }
}

export async function extract({ sourcePath, outPath }) {
  const source = await readFile(sourcePath, 'utf8')

  // Parsed, never executed — see lib/parse-static-module.mjs. This extractor is
  // pointed at *another repository's* data file, so evaluating it would run
  // that repo's code with the privileges of whoever is doing the migration.
  const SpeakersData = readExportedLiteral(source, 'SpeakersData', {
    resolveImport: resolveImageImport,
  })

  if (!Array.isArray(SpeakersData)) {
    throw new Error('Source module did not export a SpeakersData array')
  }

  const { resolved, merged } = buildSessionSlugs(SpeakersData)

  const rows = []
  const warnings = []

  for (const title of merged) {
    warnings.push(
      `${title}: folded an unscheduled record into the scheduled sitting`
    )
  }

  for (const speaker of SpeakersData) {
    if (!speaker?.name) {
      warnings.push(
        `Skipped record without a name: ${JSON.stringify(speaker).slice(0, 80)}`
      )
      continue
    }
    if (!speaker.session?.title) {
      warnings.push(`${speaker.name}: no session title, skipped`)
      continue
    }

    const base = slugify(speaker.session.title)
    const sessionSlug = resolved.get(
      `${base}|${variantKeyFor(speaker.session)}`
    )

    if (sessionSlug == null) {
      warnings.push(
        `${speaker.name}: "${speaker.session.title}" has several sittings and no time/room — assign one by hand`
      )
      continue
    }

    const row = toRow(speaker, sessionSlug)
    if (!row.headshot_filename) warnings.push(`${speaker.name}: no headshot`)
    rows.push(row)
  }

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')

  return { rows, warnings }
}

function parseArgs(argv) {
  const args = {}
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg)
    if (match) args[match[1]] = match[2]
  }
  return args
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  const args = parseArgs(process.argv.slice(2))
  const sourcePath = path.resolve(ROOT, args.source ?? '')
  const outPath = path.resolve(
    ROOT,
    args.out ?? 'scripts/sanity-import/data/devfest-2025.json'
  )

  if (!args.source) {
    console.error('Missing --source=<path to legacy speakers.js>')
    process.exit(1)
  }

  extract({ sourcePath, outPath })
    .then(({ rows, warnings }) => {
      const speakers = new Set(rows.map((r) => r.speaker_slug))
      const sessions = new Set(rows.map((r) => r.session_slug))
      const tracks = new Set(rows.map((r) => r.track).filter(Boolean))

      console.log(
        `Wrote ${rows.length} rows to ${path.relative(ROOT, outPath)}`
      )
      console.log(
        `  ${speakers.size} speakers, ${sessions.size} sessions, ${tracks.size} tracks`
      )
      for (const warning of warnings) console.warn(`  warn: ${warning}`)
    })
    .catch((error) => {
      console.error('Extraction failed:', error.message)
      process.exit(1)
    })
}
