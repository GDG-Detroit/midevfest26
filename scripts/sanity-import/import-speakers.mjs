import { fileURLToPath } from 'url'
import {
  createSanityClient,
  imageFieldFromAsset,
  parseBoolean,
  parseNumber,
  parseTags,
  sessionDocId,
  slugRef,
  speakerDocId,
  uploadImage,
} from './lib/sanity-client.mjs'
import {
  createGoogleClients,
  downloadFileByName,
  readSheetRows,
} from './lib/google.mjs'

const REQUIRED_COLUMNS = [
  'speaker_slug',
  'session_slug',
  'session_title',
  'name',
]

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function rowKey(row) {
  return `${row.speaker_slug}::${row.session_slug}`
}

function validateRow(row, index) {
  for (const col of REQUIRED_COLUMNS) {
    if (!row[col]) {
      throw new Error(`Row ${index + 2}: missing required column "${col}"`)
    }
  }
}

function buildSpeakerPatch(row, eventRef, headshotAsset) {
  const patch = {
    _id: speakerDocId(row.speaker_slug),
    _type: 'speaker',
    event: eventRef,
    name: row.name,
    slug: { _type: 'slug', current: row.speaker_slug },
    bio: row.bio || `${row.name} is a confirmed speaker.`,
    organization: row.organization || 'TBD',
    position: row.position || 'Speaker',
    isWTM: parseBoolean(row.isWTM),
    isGDE: parseBoolean(row.isGDE),
    published: true,
    importKey: rowKey(row),
    headshotFilename: row.headshot_filename || '',
  }

  if (row.linkedIn) patch.linkedIn = row.linkedIn
  if (row.twitter) patch.twitter = row.twitter
  if (row.github) patch.github = row.github
  if (headshotAsset) patch.headshot = imageFieldFromAsset(headshotAsset)

  return patch
}

function buildSessionPatch(slug, rows, eventRef) {
  const primary = rows[0]
  const participantSlugs = [...new Set(rows.map((r) => r.speaker_slug))]
  const moderatorBySlug = new Map(
    rows.map((row) => [row.speaker_slug, parseBoolean(row.is_moderator)])
  )

  return {
    _id: sessionDocId(slug),
    _type: 'session',
    event: eventRef,
    title: primary.session_title,
    slug: { _type: 'slug', current: slug },
    abstract: primary.abstract || undefined,
    description: primary.description || undefined,
    track: primary.track || undefined,
    tags: parseTags(primary.tags),
    startTime: primary.time || undefined,
    room: primary.room || undefined,
    durationMinutes: parseNumber(primary.duration_minutes) ?? 60,
    isPanel: participantSlugs.length > 1,
    published: true,
    participants: participantSlugs.map((speakerSlug, index) => ({
      _key: speakerSlug,
      _type: 'sessionParticipant',
      speaker: slugRef('speaker', speakerSlug, speakerDocId),
      sortOrder: index,
      isModerator: moderatorBySlug.get(speakerSlug) ?? false,
    })),
  }
}

async function resolveEventRef(client, { eventId, eventYear }) {
  if (eventId) {
    return { _type: 'reference', _ref: eventId }
  }

  if (!eventYear) {
    throw new Error('Set SANITY_EVENT_ID or SANITY_EVENT_YEAR')
  }

  const query = `*[_type == "event" && year == $year][0]._id`
  const id = await client.fetch(query, { year: Number(eventYear) })
  if (!id) {
    throw new Error(
      `No event document found for year ${eventYear}. Create it in Studio first.`
    )
  }
  return { _type: 'reference', _ref: id }
}

export async function importSpeakersFromSheet(options = {}) {
  const projectId = options.projectId ?? requireEnv('SANITY_PROJECT_ID')
  const dataset = options.dataset ?? requireEnv('SANITY_DATASET')
  const token = options.token ?? requireEnv('SANITY_API_TOKEN')
  const spreadsheetId = options.spreadsheetId ?? requireEnv('GOOGLE_SHEET_ID')
  const driveFolderId =
    options.driveFolderId ?? requireEnv('GOOGLE_DRIVE_FOLDER_ID')
  const credentialsPath =
    options.credentialsPath ?? requireEnv('GOOGLE_APPLICATION_CREDENTIALS')
  const sheetRange =
    options.sheetRange ?? process.env.GOOGLE_SHEET_RANGE ?? 'Sheet1'

  const client = createSanityClient({ projectId, dataset, token })
  const { sheets, drive } = await createGoogleClients(credentialsPath)
  const eventRef = await resolveEventRef(client, {
    eventId: options.eventId ?? process.env.SANITY_EVENT_ID,
    eventYear: options.eventYear ?? process.env.SANITY_EVENT_YEAR,
  })

  const rows = await readSheetRows(sheets, { spreadsheetId, range: sheetRange })
  const activeRows = rows.filter((row) => row.speaker_slug && row.session_slug)

  activeRows.forEach(validateRow)

  const imageCache = new Map()
  const speakerSlugs = new Set()
  const sessionSlugs = new Set()
  const mutations = []

  const speakersBySlug = new Map()
  for (const row of activeRows) {
    if (!speakersBySlug.has(row.speaker_slug)) {
      speakersBySlug.set(row.speaker_slug, row)
    }
    speakerSlugs.add(row.speaker_slug)
    sessionSlugs.add(row.session_slug)
  }

  for (const row of speakersBySlug.values()) {
    let headshotAsset = null
    const filename = row.headshot_filename?.trim()

    if (filename) {
      if (!imageCache.has(filename)) {
        const buffer = await downloadFileByName(drive, {
          folderId: driveFolderId,
          filename,
        })
        if (buffer) {
          const asset = await uploadImage(client, buffer, filename)
          imageCache.set(filename, asset)
        } else {
          console.warn(`Headshot not found in Drive: ${filename} (${row.name})`)
          imageCache.set(filename, null)
        }
      }
      headshotAsset = imageCache.get(filename)
    }

    mutations.push({
      createOrReplace: buildSpeakerPatch(row, eventRef, headshotAsset),
    })
  }

  const sessionsBySlug = new Map()
  for (const row of activeRows) {
    if (!sessionsBySlug.has(row.session_slug)) {
      sessionsBySlug.set(row.session_slug, [])
    }
    sessionsBySlug.get(row.session_slug).push(row)
  }

  for (const [slug, sessionRows] of sessionsBySlug) {
    mutations.push({
      createOrReplace: buildSessionPatch(slug, sessionRows, eventRef),
    })
  }

  if (mutations.length === 0) {
    return { speakers: 0, sessions: 0, unpublished: 0 }
  }

  await client.mutate(mutations, { visibility: 'sync' })

  const unpublishSpeakerIds = await client.fetch(
    `*[_type == "speaker" && event._ref == $eventId && !(_id in $ids)]._id`,
    { eventId: eventRef._ref, ids: [...speakerSlugs].map(speakerDocId) }
  )
  const unpublishSessionIds = await client.fetch(
    `*[_type == "session" && event._ref == $eventId && !(_id in $ids)]._id`,
    { eventId: eventRef._ref, ids: [...sessionSlugs].map(sessionDocId) }
  )

  const unpublishMutations = [
    ...unpublishSpeakerIds,
    ...unpublishSessionIds,
  ].map((id) => ({
    patch: { id, set: { published: false } },
  }))

  if (unpublishMutations.length > 0) {
    await client.mutate(unpublishMutations)
  }

  return {
    speakers: speakerSlugs.size,
    sessions: sessionSlugs.size,
    unpublished: unpublishMutations.length,
    dataset,
  }
}

// CLI entry when run directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url)

if (isMainModule) {
  const args = process.argv.slice(2)
  const datasetArg = args.find((a) => a.startsWith('--dataset='))
  if (datasetArg) {
    process.env.SANITY_DATASET = datasetArg.split('=')[1]
  }

  importSpeakersFromSheet()
    .then((result) => {
      console.log('Import complete:', result)
    })
    .catch((error) => {
      console.error('Import failed:', error.message)
      process.exit(1)
    })
}
