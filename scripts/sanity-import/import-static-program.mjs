/**
 * Import a program from a static rows file (rather than the Google Sheet) into
 * Sanity — speakers, sessions, and headshots.
 *
 * Same contract as import-speakers.mjs: deterministic document IDs,
 * createOrReplace mutations, and soft-unpublish (never delete) for anything
 * scoped to the target event that is missing from the source. The differences
 * are the source (a JSON file from extract-devfest-2025.mjs, not Sheets) and the
 * headshots (a local directory, not Drive).
 *
 * Rows are the same flat shape the Sheet produces, so both paths converge here.
 *
 * Usage:
 *   # See what would happen — no writes, no uploads
 *   node --env-file=scripts/sanity-import/.env \
 *     scripts/sanity-import/import-static-program.mjs --dry-run
 *
 *   # Load the 2025 program as the 2026 placeholder program
 *   node --env-file=scripts/sanity-import/.env \
 *     scripts/sanity-import/import-static-program.mjs --event-year=2026 --clear-room
 *
 *   # Load the same program as the 2025 archive, venue details intact
 *   node --env-file=scripts/sanity-import/.env \
 *     scripts/sanity-import/import-static-program.mjs \
 *     --event-year=2025 --id-namespace=2025 --create-event="Michigan DevFest 2025"
 */
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createSanityClient,
  fetchStoredHeadshots,
  imageFieldFromAsset,
  parseTags,
  sessionDocId,
  slugRef,
  speakerDocId,
  uploadImage,
} from './lib/sanity-client.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

const DEFAULT_ROWS = 'scripts/sanity-import/data/devfest-2025.json'
const DEFAULT_ASSETS = 'scripts/sanity-import/assets/2025'

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function rowKey(row) {
  return `${row.speaker_slug}::${row.session_slug}`
}

/**
 * `existing` is the stored headshot for this document. createOrReplace drops
 * every omitted field, so a source image that cannot be read must inherit the
 * stored asset rather than blanking it.
 */
function buildSpeakerPatch(row, eventRef, headshotAsset, options) {
  const { namespace, includeEmail, existing } = options

  const patch = {
    _id: speakerDocId(row.speaker_slug, namespace),
    _type: 'speaker',
    event: eventRef,
    name: row.name,
    slug: { _type: 'slug', current: row.speaker_slug },
    bio: row.bio || `${row.name} spoke at Michigan DevFest.`,
    organization: row.organization || 'TBD',
    position: row.position || 'Speaker',
    isWTM: Boolean(row.isWTM),
    isGDE: Boolean(row.isGDE),
    published: true,
    importKey: rowKey(row),
    headshotFilename: row.headshot_filename || existing?.headshotFilename || '',
  }

  if (row.linkedIn) patch.linkedIn = row.linkedIn
  if (row.twitter) patch.twitter = row.twitter
  if (row.github) patch.github = row.github
  if (row.mastodon) patch.mastodon = row.mastodon
  if (row.website) patch.website = row.website
  if (includeEmail && row.email) patch.email = row.email

  const headshot = headshotAsset
    ? imageFieldFromAsset(headshotAsset)
    : existing?.headshot
  if (headshot) patch.headshot = headshot

  return patch
}

function buildSessionPatch(slug, rows, eventRef, options) {
  const { namespace, clearRoom } = options
  const primary = rows[0]
  const participantSlugs = [...new Set(rows.map((r) => r.speaker_slug))]
  const moderatorBySlug = new Map(
    rows.map((row) => [row.speaker_slug, Boolean(row.is_moderator)])
  )

  const patch = {
    _id: sessionDocId(slug, namespace),
    _type: 'session',
    event: eventRef,
    title: primary.session_title,
    slug: { _type: 'slug', current: slug },
    abstract: primary.abstract || undefined,
    description: primary.description || undefined,
    track: primary.track || undefined,
    tags: parseTags(primary.tags),
    durationMinutes: Number(primary.duration_minutes) || 60,
    isPanel: participantSlugs.length > 1,
    published: true,
    importKey: rowKey(primary),
    participants: participantSlugs.map((speakerSlug, index) => ({
      _key: speakerSlug,
      _type: 'sessionParticipant',
      speaker: slugRef('speaker', speakerSlug, speakerDocId, namespace),
      sortOrder: index,
      isModerator: moderatorBySlug.get(speakerSlug) ?? false,
    })),
  }

  // Start times travel with the program — a schedule with every slot at "TBA"
  // tells a visitor nothing. Rooms do not: MotorCity Casino's MCC1-4 under a
  // page whose location section says LCRC reads as an error rather than as
  // last year's detail.
  patch.startTime = primary.time || undefined
  if (!clearRoom) patch.room = primary.room || undefined

  return patch
}

async function resolveEventRef(
  client,
  { eventId, eventYear, createTitle, dryRun }
) {
  if (eventId) return { _type: 'reference', _ref: eventId }

  if (!eventYear)
    throw new Error('Set --event-year, SANITY_EVENT_ID, or SANITY_EVENT_YEAR')

  const year = Number(eventYear)
  const existing = await client.fetch(
    `*[_type == "event" && year == $year][0]._id`,
    { year }
  )
  if (existing) return { _type: 'reference', _ref: existing }

  if (!createTitle) {
    throw new Error(
      `No event document for year ${year}. Create it in Studio, or pass --create-event="<title>".`
    )
  }

  const slug = createTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const doc = {
    _id: `event-${year}`,
    _type: 'event',
    title: createTitle,
    year,
    slug: { _type: 'slug', current: slug },
    timezone: 'America/Detroit',
  }

  if (dryRun) {
    console.log(`  would create event: ${createTitle} (${year}) as ${doc._id}`)
    return { _type: 'reference', _ref: doc._id }
  }

  await client.createOrReplace(doc)
  console.log(`  created event: ${createTitle} (${year}) as ${doc._id}`)
  return { _type: 'reference', _ref: doc._id }
}

export async function importStaticProgram(options = {}) {
  const {
    rowsPath = DEFAULT_ROWS,
    assetsDir = DEFAULT_ASSETS,
    namespace,
    clearRoom = false,
    includeEmail = false,
    createTitle,
    dryRun = false,
  } = options

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
    createTitle,
    dryRun,
  })

  const assetsPath = path.resolve(ROOT, assetsDir)
  const availableAssets = new Set(await readdir(assetsPath).catch(() => []))

  const speakersBySlug = new Map()
  const sessionsBySlug = new Map()
  for (const row of rows) {
    if (!speakersBySlug.has(row.speaker_slug)) {
      speakersBySlug.set(row.speaker_slug, row)
    }
    if (!sessionsBySlug.has(row.session_slug)) {
      sessionsBySlug.set(row.session_slug, [])
    }
    sessionsBySlug.get(row.session_slug).push(row)
  }

  const missingHeadshots = []
  const preservedHeadshots = []
  const imageCache = new Map()
  const mutations = []

  // Stored headshots for everyone about to be replaced, so a missing source
  // file falls back to the existing asset rather than deleting it.
  const storedHeadshots = await fetchStoredHeadshots(
    client,
    [...speakersBySlug.keys()].map((slug) => speakerDocId(slug, namespace))
  )

  for (const row of speakersBySlug.values()) {
    let headshotAsset = null
    const filename = row.headshot_filename?.trim()
    const existing = storedHeadshots.get(
      speakerDocId(row.speaker_slug, namespace)
    )

    // Whether a fresh asset is obtainable, independent of whether this run
    // uploads it. A dry run resolves nothing, so asking `headshotAsset` here
    // would report every speaker as preserved and tell you nothing.
    const willResolve = Boolean(filename && availableAssets.has(filename))

    if (filename) {
      if (!willResolve) {
        missingHeadshots.push(`${row.name} (${filename})`)
      } else if (!dryRun) {
        if (!imageCache.has(filename)) {
          const buffer = await readFile(path.join(assetsPath, filename))
          imageCache.set(filename, await uploadImage(client, buffer, filename))
        }
        headshotAsset = imageCache.get(filename)
      }
    }

    if (!willResolve && existing?.headshot) {
      preservedHeadshots.push(row.name)
    }

    mutations.push({
      createOrReplace: buildSpeakerPatch(row, eventRef, headshotAsset, {
        namespace,
        includeEmail,
        existing,
      }),
    })
  }

  for (const [slug, sessionRows] of sessionsBySlug) {
    mutations.push({
      createOrReplace: buildSessionPatch(slug, sessionRows, eventRef, {
        namespace,
        clearRoom,
      }),
    })
  }

  const speakerIds = [...speakersBySlug.keys()].map((s) =>
    speakerDocId(s, namespace)
  )
  const sessionIds = [...sessionsBySlug.keys()].map((s) =>
    sessionDocId(s, namespace)
  )

  const staleSpeakers = await client.fetch(
    `*[_type == "speaker" && event._ref == $eventId && !(_id in $ids) && published == true]{_id, name}`,
    { eventId: eventRef._ref, ids: speakerIds }
  )
  const staleSessions = await client.fetch(
    `*[_type == "session" && event._ref == $eventId && !(_id in $ids) && published == true]{_id, title}`,
    { eventId: eventRef._ref, ids: sessionIds }
  )

  const result = {
    dataset,
    eventId: eventRef._ref,
    speakers: speakersBySlug.size,
    sessions: sessionsBySlug.size,
    headshots: imageCache.size,
    missingHeadshots,
    preservedHeadshots,
    willUnpublish: [
      ...staleSpeakers.map((d) => `speaker: ${d.name}`),
      ...staleSessions.map((d) => `session: ${d.title}`),
    ],
  }

  if (dryRun) return { ...result, dryRun: true }

  await client.mutate(mutations, { visibility: 'sync' })

  const unpublish = [...staleSpeakers, ...staleSessions].map((doc) => ({
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

  importStaticProgram({
    rowsPath: args.rows,
    assetsDir: args['assets-dir'],
    eventYear: args['event-year'],
    namespace: args['id-namespace'],
    createTitle: args['create-event'],
    clearRoom: args.flags.has('clear-room'),
    includeEmail: args.flags.has('include-email'),
    dryRun: args.flags.has('dry-run'),
  })
    .then((result) => {
      const label = result.dryRun ? 'Dry run' : 'Import complete'
      console.log(
        `\n${label} — dataset ${result.dataset}, event ${result.eventId}`
      )
      console.log(`  speakers: ${result.speakers}`)
      console.log(`  sessions: ${result.sessions}`)
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
