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

function buildTeamMemberPatch(row, eventRef, headshotAsset, namespace) {
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
    headshotFilename: row.headshot_path ? path.basename(row.headshot_path) : '',
  }

  if (row.organization) patch.organization = row.organization
  if (row.university) patch.university = row.university
  if (row.bio) patch.bio = row.bio
  if (row.commits != null) patch.commits = row.commits
  if (row.linkedin) patch.linkedIn = row.linkedin
  if (row.twitter) patch.twitter = row.twitter
  if (row.github) patch.github = row.github
  if (headshotAsset) patch.headshot = imageFieldFromAsset(headshotAsset)

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
  const { rowsPath = DEFAULT_ROWS, namespace, dryRun = false } = options

  const projectId = options.projectId ?? requireEnv('SANITY_PROJECT_ID')
  const dataset = options.dataset ?? requireEnv('SANITY_DATASET')
  const token = options.token ?? requireEnv('SANITY_API_TOKEN')

  const client = createSanityClient({ projectId, dataset, token })

  const rows = JSON.parse(await readFile(path.resolve(ROOT, rowsPath), 'utf8'))
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No rows found in ${rowsPath}`)
  }

  const eventRef = await resolveEventRef(client, {
    eventId: options.eventId,
    eventYear: options.eventYear ?? process.env.SANITY_EVENT_YEAR,
  })

  const missingHeadshots = []
  const imageCache = new Map()
  const mutations = []

  for (const row of rows) {
    let headshotAsset = null
    const assetPath = row.headshot_path?.trim()

    if (assetPath) {
      const absolute = path.resolve(ROOT, ASSET_BASE, assetPath)
      const filename = path.basename(assetPath)

      if (!imageCache.has(assetPath)) {
        const buffer = await readFile(absolute).catch(() => null)
        if (!buffer) {
          missingHeadshots.push(`${row.name} (${assetPath})`)
          imageCache.set(assetPath, null)
        } else if (dryRun) {
          imageCache.set(assetPath, null)
        } else {
          imageCache.set(assetPath, await uploadImage(client, buffer, filename))
        }
      }
      headshotAsset = imageCache.get(assetPath)
    }

    mutations.push({
      createOrReplace: buildTeamMemberPatch(
        row,
        eventRef,
        headshotAsset,
        namespace
      ),
    })
  }

  const memberIds = rows.map((row) => teamMemberDocId(row.slug, namespace))

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
    headshots: [...imageCache.values()].filter(Boolean).length,
    missingHeadshots,
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
