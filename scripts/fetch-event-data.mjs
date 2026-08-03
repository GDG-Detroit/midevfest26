/**
 * Fetch published speakers/sessions from Sanity and write frontend-ready JSON.
 * Run before build (or manually via npm run fetch:event-data).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@sanity/client'
import prettier from 'prettier'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OPTIONAL_ENV = path.join(ROOT, 'scripts/sanity-import/.env')

/** Where a given year's generated rows live. */
const outputFor = (year) =>
  path.join(ROOT, `src/data/${year}/speakers.generated.json`)

/** Every event in the dataset, newest first — drives the archive. */
const EVENTS_QUERY = `*[_type == "event" && defined(year)] | order(year desc){
  year,
  title,
  "slug": slug.current
}`

/** Manifest of known events, so a new year in Sanity appears without a code edit. */
const EVENTS_OUTPUT = path.join(ROOT, 'src/data/events.generated.json')

const DEFAULT_PROJECT_ID = '5qtiaw9u'
const DEFAULT_DATASET = 'production'
const DEFAULT_EVENT_YEAR = 2026
const DEFAULT_TRACK = 'Level Up'
// Empty rather than a venue name: the UI hides the room chip when it is blank,
// which is the right outcome for sessions whose room is not yet assigned.
const DEFAULT_ROOM = ''

const SESSIONS_QUERY = `*[_type == "session" && event->year == $year && published == true] | order(startTime asc, title asc) {
  _id,
  "sessionSlug": slug.current,
  title,
  abstract,
  description,
  track,
  tags,
  startTime,
  room,
  durationMinutes,
  participants[]{
    sortOrder,
    isModerator,
    speaker->{
      _id,
      "speakerSlug": slug.current,
      name,
      bio,
      organization,
      position,
      isWTM,
      isGDE,
      linkedIn,
      twitter,
      github,
      mastodon,
      published,
      "featuredSessionId": featuredSession->_id,
      "avatar": headshot.asset->url
    }
  }
}`

function readEnv(name, fallback) {
  const value = process.env[name]?.trim()
  return value || fallback
}

/** Load scripts/sanity-import/.env when present; never required for public CDN reads. */
function loadOptionalEnvFile() {
  if (!existsSync(OPTIONAL_ENV)) return

  for (const line of readFileSync(OPTIONAL_ENV, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function stableSpeakerSessionId(speakerSlug, sessionSlug) {
  const input = `${speakerSlug}::${sessionSlug}`
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) || 1
}

function buildRow(session, participant) {
  const speaker = participant.speaker
  if (!speaker?.published) return null

  const speakerSlug = speaker.speakerSlug
  const sessionSlug = session.sessionSlug
  if (!speakerSlug || !sessionSlug) return null

  const row = {
    id: stableSpeakerSessionId(speakerSlug, sessionSlug),
    name: speaker.name,
    avatar: speaker.avatar ?? '',
    bio: speaker.bio ?? '',
    organization: speaker.organization ?? '',
    position: speaker.position ?? '',
    isWTM: Boolean(speaker.isWTM),
    isGDE: Boolean(speaker.isGDE),
    isModerator: Boolean(participant.isModerator),
    sortOrder: participant.sortOrder ?? 0,
    session: {
      title: session.title,
      abstract: session.abstract ?? '',
      description: session.description ?? session.abstract ?? '',
      tags: session.tags?.length ? session.tags : [DEFAULT_TRACK],
      track: session.track || DEFAULT_TRACK,
      time: session.startTime || 'TBA',
      room: session.room || DEFAULT_ROOM,
      sessionDuration: session.durationMinutes ?? 60,
    },
  }

  if (speaker.linkedIn) row.linkedIn = speaker.linkedIn
  if (speaker.twitter) row.twitter = speaker.twitter
  if (speaker.github) row.github = speaker.github
  if (speaker.mastodon) row.mastodon = speaker.mastodon

  row._sessionId = session._id
  row._featuredSessionId = speaker.featuredSessionId ?? null

  return row
}

function enrichSessionParticipants(rows) {
  const bySessionId = new Map()

  for (const row of rows) {
    const sessionId = row._sessionId
    if (!bySessionId.has(sessionId)) bySessionId.set(sessionId, [])
    bySessionId.get(sessionId).push(row)
  }

  for (const row of rows) {
    const group = bySessionId.get(row._sessionId) ?? [row]
    const participants = group
      .map(({ name, avatar, isModerator, sortOrder }) => ({
        name,
        avatar,
        isModerator: Boolean(isModerator),
        sortOrder: sortOrder ?? 0,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)

    row.session.speakers = participants.map((p) => p.name)
    row.session.moderators = participants
      .filter((p) => p.isModerator)
      .map((p) => p.name)
    row.session.panelists = participants
      .filter((p) => !p.isModerator)
      .map((p) => p.name)
    row.session.participants = participants
  }

  return rows
}

function prioritizeFeaturedSessions(rows) {
  const result = [...rows]
  const firstIndexByName = new Map()

  result.forEach((row, index) => {
    if (!firstIndexByName.has(row.name)) {
      firstIndexByName.set(row.name, index)
    }
  })

  for (const [name, firstIdx] of firstIndexByName) {
    const featuredIdx = result.findIndex(
      (row) => row.name === name && row._sessionId === row._featuredSessionId
    )
    if (featuredIdx > firstIdx) {
      const [featured] = result.splice(featuredIdx, 1)
      result.splice(firstIdx, 0, featured)
    }
  }

  return result
}

function stripInternalFields(rows) {
  return rows.map(({ _sessionId, _featuredSessionId, ...row }) => row)
}

function createSanityReadClient(options = {}) {
  return createClient({
    projectId:
      options.projectId ?? readEnv('SANITY_PROJECT_ID', DEFAULT_PROJECT_ID),
    dataset: options.dataset ?? readEnv('SANITY_DATASET', DEFAULT_DATASET),
    apiVersion: '2026-06-01',
    useCdn: false,
    token: process.env.SANITY_READ_TOKEN || undefined,
  })
}

export async function fetchEventSpeakers(options = {}) {
  const eventYear = Number(
    options.eventYear ??
      readEnv('SANITY_EVENT_YEAR', String(DEFAULT_EVENT_YEAR))
  )

  const client = createSanityReadClient(options)
  const sessions = await client.fetch(SESSIONS_QUERY, { year: eventYear })

  const rows = []
  for (const session of sessions) {
    const participants = [...(session.participants ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    )

    for (const participant of participants) {
      const row = buildRow(session, participant)
      if (row) rows.push(row)
    }
  }

  return prioritizeFeaturedSessions(enrichSessionParticipants(rows))
}

async function writeFormattedJson(filePath, data) {
  const config = await prettier.resolveConfig(filePath)
  const formatted = await prettier.format(JSON.stringify(data), {
    ...(config ?? {}),
    filepath: filePath,
    parser: 'json',
  })
  await writeFile(filePath, formatted, 'utf8')
}

/**
 * The passthrough module each year's components import. Kept generated so a new
 * archive year needs no hand-written file — adding the event in Sanity is enough.
 */
const passthroughModule = (year) => `/**
 * Speaker + session rows for ${year}.
 * Generated from Sanity before each build — see scripts/fetch-event-data.mjs.
 */
import speakersGenerated from './speakers.generated.json'

export const SpeakersData = speakersGenerated
`

/**
 * Rows are speaker-session pairs, so a speaker on two sessions appears twice and
 * a panel repeats its session once per participant. Both counts dedupe.
 *
 * Derived here rather than in the browser so the archive index can render counts
 * from a small manifest instead of bundling every year's speaker bios.
 */
function deriveMetadata(rows) {
  const speakers = new Set()
  const sessions = new Set()
  const tracks = new Set()

  for (const row of rows) {
    if (row.name) speakers.add(row.name)
    if (row.session?.title) sessions.add(row.session.title)
    if (row.session?.track) tracks.add(row.session.track)
  }

  return {
    speakerCount: speakers.size,
    sessionCount: sessions.size,
    tracks: [...tracks].sort(),
  }
}

async function writeYear(year) {
  const rows = await fetchEventSpeakers({ eventYear: year })
  const output = stripInternalFields(rows)
  const target = outputFor(year)

  await mkdir(path.dirname(target), { recursive: true })
  await writeFormattedJson(target, output)

  // Only create the passthrough when absent: 2026's is hand-maintained and may
  // pick up per-year tweaks the generated template does not know about.
  const modulePath = path.join(path.dirname(target), 'speakers.js')
  if (!existsSync(modulePath)) {
    await writeFile(modulePath, passthroughModule(year), 'utf8')
  }

  const metadata = deriveMetadata(output)
  console.log(
    `  ${year}: ${output.length} rows, ${metadata.speakerCount} speakers, ` +
      `${metadata.sessionCount} sessions -> ${path.relative(ROOT, target)}`
  )
  return { rowCount: output.length, ...metadata }
}

async function main() {
  loadOptionalEnvFile()

  const client = createSanityReadClient()
  const events = await client.fetch(EVENTS_QUERY)
  if (!events?.length) throw new Error('No event documents found in Sanity')

  const years = events.map((event) => event.year)
  console.log(`Fetching ${years.length} event year(s): ${years.join(', ')}`)

  let total = 0
  const manifest = []
  for (const event of events) {
    const stats = await writeYear(event.year)
    total += stats.rowCount
    manifest.push({ ...event, ...stats })
  }

  await writeFormattedJson(EVENTS_OUTPUT, manifest)

  console.log(
    `Wrote ${total} speaker-session rows across ${years.length} year(s)`
  )
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((error) => {
    console.error('fetch-event-data failed:', error.message)
    process.exit(1)
  })
}
