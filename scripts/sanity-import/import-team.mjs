/**
 * Import team members (organizers, dev team, facilitators) into Sanity.
 *
 * Same contract as import-static-program.mjs: deterministic document IDs,
 * createOrReplace mutations, and soft-unpublish (never delete) for anyone
 * scoped to the target event who is missing from the source.
 *
 * Source rows come from scripts/sanity-import/data/team-2026.json, produced by
 * extract-team.mjs. Headshots are repo-relative paths under src/ carried on each
 * row, so no separate assets directory is needed — the images already live in
 * this repo.
 *
 * Usage:
 *   # See what would happen — no writes, no uploads
 *   node --env-file=scripts/sanity-import/.env \
 *     scripts/sanity-import/import-team.mjs --dry-run
 *
 *   # Load the roster against the 2026 event
 *   node --env-file=scripts/sanity-import/.env \
 *     scripts/sanity-import/import-team.mjs --event-year=2026
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createSanityClient,
  imageFieldFromAsset,
  teamMemberDocId,
  uploadImage,
} from './lib/sanity-client.mjs'
import { TEAM_GROUPS, isKnownTeamGroup } from './lib/team-groups.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

const DEFAULT_ROWS = 'scripts/sanity-import/data/team-2026.json'
/** Headshot paths on each row are relative to this. */
const ASSET_BASE = 'src'

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

/**
 * A row whose headshot is already a URL came from generated data, not from the
 * hand-authored roster — team.js is a passthrough now, so re-extracting it
 * yields CDN links. Those are not filesystem paths and must never be fed to
 * readFile; the asset they name is already in Sanity.
 */
function isRemoteAsset(value) {
  return /^https?:\/\//i.test(value)
}

/** Fields that must be a non-empty string for a row to be usable. */
const REQUIRED_STRINGS = ['slug', 'name', 'team_group']
/** Fields that may be absent, but must be strings when present. */
const OPTIONAL_STRINGS = [
  'role',
  'organization',
  'university',
  'bio',
  'linkedin',
  'twitter',
  'github',
  'headshot_path',
]

/**
 * Reject rows the schema would not accept.
 *
 * Two failure modes, both reached from the same place. Sanity's `options.list`
 * only constrains the Studio dropdown — the write API stores anything — so a
 * typo'd group lands in the dataset and then vanishes from the site with no
 * error at any layer. And the content lake is schemaless at the API level, so a
 * numeric `name` is stored as a number in a string field; the Studio flags it
 * only after the fact, and the site renders it.
 *
 * The seed JSON is committed and hand-editable, so validating during extraction
 * is not enough — rows can arrive here without passing through that script at
 * all. This is the last gate before the mutation.
 */
function assertValidRows(rows) {
  const problems = []

  rows.forEach((row, index) => {
    const label = typeof row?.name === 'string' ? row.name : `row ${index}`

    if (row == null || typeof row !== 'object') {
      problems.push(`row ${index}: not an object`)
      return
    }

    for (const field of REQUIRED_STRINGS) {
      const value = row[field]
      if (typeof value !== 'string' || value.trim() === '') {
        problems.push(
          `${label}: "${field}" must be a non-empty string, got ` +
            `${JSON.stringify(value)}`
        )
      }
    }

    for (const field of OPTIONAL_STRINGS) {
      const value = row[field]
      if (value != null && typeof value !== 'string') {
        problems.push(
          `${label}: "${field}" must be a string when present, got ` +
            `${JSON.stringify(value)}`
        )
      }
    }

    if (row.commits != null && !Number.isFinite(row.commits)) {
      problems.push(
        `${label}: "commits" must be a number, got ${JSON.stringify(
          row.commits
        )}`
      )
    }

    if (
      typeof row.team_group === 'string' &&
      !isKnownTeamGroup(row.team_group)
    ) {
      problems.push(
        `${label}: team group "${row.team_group}" is not one of ` +
          TEAM_GROUPS.join(', ')
      )
    }
  })

  if (problems.length === 0) return

  throw new Error(
    `${problems.length} problem(s) in the source rows:\n` +
      problems.map((p) => `    ${p}`).join('\n')
  )
}

/**
 * `existing` carries the document's current headshot and filename. These are
 * mutations by createOrReplace, so every field the replacement omits is
 * destroyed — a row whose local image is missing must inherit what is already
 * in Sanity rather than silently blanking it.
 */
function buildTeamMemberPatch(
  row,
  eventRef,
  headshotField,
  namespace,
  existing
) {
  const localFilename =
    row.headshot_path && !isRemoteAsset(row.headshot_path)
      ? path.basename(row.headshot_path)
      : undefined

  const patch = {
    _id: teamMemberDocId(row.slug, namespace),
    _type: 'teamMember',
    event: eventRef,
    name: row.name,
    slug: { _type: 'slug', current: row.slug },
    role: row.role || 'Organizer',
    teamGroup: row.team_group,
    sortOrder: row.sort_order ?? 0,
    published: true,
    importKey: row.slug,
    headshotFilename: localFilename ?? existing?.headshotFilename ?? '',
  }

  if (row.organization) patch.organization = row.organization
  if (row.university) patch.university = row.university
  if (row.bio) patch.bio = row.bio
  if (row.commits != null) patch.commits = row.commits
  if (row.linkedin) patch.linkedIn = row.linkedin
  if (row.twitter) patch.twitter = row.twitter
  if (row.github) patch.github = row.github
  if (headshotField) patch.headshot = headshotField

  return patch
}

async function resolveEventRef(client, { eventId, eventYear }) {
  if (eventId) return { _type: 'reference', _ref: eventId }

  if (!eventYear)
    throw new Error('Set --event-year, SANITY_EVENT_ID, or SANITY_EVENT_YEAR')

  const year = Number(eventYear)
  const existing = await client.fetch(
    `*[_type == "event" && year == $year][0]._id`,
    { year }
  )

  if (!existing) {
    throw new Error(
      `No event document for year ${year}. Create it in Studio first.`
    )
  }

  return { _type: 'reference', _ref: existing }
}

export async function importTeam(options = {}) {
  const {
    rowsPath = DEFAULT_ROWS,
    namespace,
    dryRun = false,
    strict = false,
  } = options

  const projectId = options.projectId ?? requireEnv('SANITY_PROJECT_ID')
  const dataset = options.dataset ?? requireEnv('SANITY_DATASET')
  const token = options.token ?? requireEnv('SANITY_API_TOKEN')

  const client = createSanityClient({ projectId, dataset, token })

  const rows = JSON.parse(await readFile(path.resolve(ROOT, rowsPath), 'utf8'))
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No rows found in ${rowsPath}`)
  }

  // Before anything touches the dataset: malformed rows are a source-data
  // problem, and importing half a roster before noticing helps nobody.
  assertValidRows(rows)

  const eventRef = await resolveEventRef(client, {
    eventId: options.eventId,
    eventYear: options.eventYear ?? process.env.SANITY_EVENT_YEAR,
  })

  const memberIds = rows.map((row) => teamMemberDocId(row.slug, namespace))

  // What is already stored, so a replacement can inherit assets it cannot
  // resolve locally instead of wiping them.
  const existingDocs = await client.fetch(
    `*[_id in $ids]{_id, headshot, headshotFilename}`,
    { ids: memberIds }
  )
  const existingById = new Map(existingDocs.map((doc) => [doc._id, doc]))

  const missingHeadshots = []
  const preservedHeadshots = []
  const imageCache = new Map()
  const mutations = []

  for (const row of rows) {
    const docId = teamMemberDocId(row.slug, namespace)
    const existing = existingById.get(docId)
    const assetPath = row.headshot_path?.trim()

    let headshotField = existing?.headshot ?? null

    if (assetPath && isRemoteAsset(assetPath)) {
      // Already a Sanity asset; keep whatever the document has.
      preservedHeadshots.push(`${row.name} (remote URL in source)`)
    } else if (assetPath) {
      const absolute = path.resolve(ROOT, ASSET_BASE, assetPath)
      const filename = path.basename(assetPath)

      if (!imageCache.has(assetPath)) {
        const buffer = await readFile(absolute).catch(() => null)
        if (!buffer) {
          imageCache.set(assetPath, { missing: true })
        } else if (dryRun) {
          imageCache.set(assetPath, { resolved: true })
        } else {
          imageCache.set(assetPath, {
            asset: await uploadImage(client, buffer, filename),
          })
        }
      }

      const cached = imageCache.get(assetPath)
      if (cached.missing) {
        missingHeadshots.push(`${row.name} (${assetPath})`)
        if (existing?.headshot) {
          preservedHeadshots.push(`${row.name} (local file missing)`)
        }
      } else if (cached.asset) {
        headshotField = imageFieldFromAsset(cached.asset)
      }
    }

    mutations.push({
      createOrReplace: buildTeamMemberPatch(
        row,
        eventRef,
        headshotField,
        namespace,
        existing
      ),
    })
  }

  if (strict && missingHeadshots.length > 0) {
    throw new Error(
      `${missingHeadshots.length} headshot file(s) could not be read ` +
        `(--strict):\n` +
        missingHeadshots.map((m) => `    ${m}`).join('\n')
    )
  }

  const stale = await client.fetch(
    `*[_type == "teamMember" && event._ref == $eventId && !(_id in $ids) && published == true]{_id, name}`,
    { eventId: eventRef._ref, ids: memberIds }
  )

  const groups = new Map()
  for (const row of rows) {
    groups.set(row.team_group, (groups.get(row.team_group) ?? 0) + 1)
  }

  const result = {
    dataset,
    eventId: eventRef._ref,
    members: rows.length,
    groups: [...groups].map(([group, count]) => `${group}: ${count}`),
    headshots: [...imageCache.values()].filter((v) => v.asset).length,
    missingHeadshots,
    preservedHeadshots,
    willUnpublish: stale.map((doc) => `teamMember: ${doc.name}`),
  }

  if (dryRun) return { ...result, dryRun: true }

  await client.mutate(mutations, { visibility: 'sync' })

  const unpublish = stale.map((doc) => ({
    patch: { id: doc._id, set: { published: false } },
  }))
  if (unpublish.length > 0) await client.mutate(unpublish)

  return result
}

function parseArgs(argv) {
  const args = { flags: new Set() }
  for (const arg of argv) {
    const withValue = /^--([^=]+)=(.*)$/.exec(arg)
    if (withValue) args[withValue[1]] = withValue[2]
    else if (arg.startsWith('--')) args.flags.add(arg.slice(2))
  }
  return args
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  const args = parseArgs(process.argv.slice(2))

  importTeam({
    rowsPath: args.rows,
    eventYear: args['event-year'],
    namespace: args['id-namespace'],
    dryRun: args.flags.has('dry-run'),
    strict: args.flags.has('strict'),
  })
    .then((result) => {
      const label = result.dryRun ? 'Dry run' : 'Import complete'
      console.log(
        `\n${label} — dataset ${result.dataset}, event ${result.eventId}`
      )
      console.log(
        `  team members: ${result.members} (${result.groups.join(', ')})`
      )
      if (!result.dryRun)
        console.log(`  headshots uploaded: ${result.headshots}`)

      if (result.missingHeadshots.length > 0) {
        console.warn(
          `  missing headshot files (${result.missingHeadshots.length}):`
        )
        for (const m of result.missingHeadshots) console.warn(`    ${m}`)
      }
      if (result.preservedHeadshots.length > 0) {
        console.log(
          `  kept the stored headshot for ${result.preservedHeadshots.length}:`
        )
        for (const p of result.preservedHeadshots) console.log(`    ${p}`)
      }
      if (result.willUnpublish.length > 0) {
        const verb = result.dryRun ? 'would be unpublished' : 'unpublished'
        console.log(`  ${result.willUnpublish.length} existing docs ${verb}:`)
        for (const d of result.willUnpublish) console.log(`    ${d}`)
      }
    })
    .catch((error) => {
      console.error('Import failed:', error.message)
      process.exit(1)
    })
}
