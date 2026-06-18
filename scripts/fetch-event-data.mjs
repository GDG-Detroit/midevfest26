/**
 * Fetch published speakers/sessions from Sanity and write frontend-ready JSON.
 * Run before build (or manually via npm run fetch:event-data).
 */
import { writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@sanity/client'
import prettier from 'prettier'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT = path.join(ROOT, 'src/data/2026/speakers.generated.json')
const OPTIONAL_ENV = path.join(ROOT, 'scripts/sanity-import/.env')

const DEFAULT_PROJECT_ID = 'b18a6pbd'
const DEFAULT_DATASET = 'production'
const DEFAULT_EVENT_YEAR = 2026
const DEFAULT_TRACK = 'Level Up'
const DEFAULT_ROOM = 'IBM HQ'

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

export async function fetchEventSpeakers(options = {}) {
  const projectId =
    options.projectId ?? readEnv('SANITY_PROJECT_ID', DEFAULT_PROJECT_ID)
  const dataset = options.dataset ?? readEnv('SANITY_DATASET', DEFAULT_DATASET)
  const eventYear = Number(
    options.eventYear ??
      readEnv('SANITY_EVENT_YEAR', String(DEFAULT_EVENT_YEAR))
  )

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2026-06-01',
    useCdn: false,
    token: process.env.SANITY_READ_TOKEN || undefined,
  })

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

async function main() {
  loadOptionalEnvFile()
  const rows = await fetchEventSpeakers()
  const output = stripInternalFields(rows)

  await writeFormattedJson(OUTPUT, output)

  console.log(
    `Wrote ${output.length} speaker-session rows to ${path.relative(
      ROOT,
      OUTPUT
    )}`
  )
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((error) => {
    console.error('fetch-event-data failed:', error.message)
    process.exit(1)
  })
}
