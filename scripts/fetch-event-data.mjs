/**
 * Fetch published speakers/sessions from Sanity and write frontend-ready JSON.
 * Run before build (or manually via pnpm run fetch:event-data).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@sanity/client'
import prettier from 'prettier'
import {
  RENDERED_TEAM_GROUPS,
  isRenderedTeamGroup,
} from './sanity-import/lib/team-groups.mjs'
import {
  PARTNER_TIERS,
  RENDERED_PARTNER_TIERS,
  isRenderedPartnerTier,
} from './sanity-import/lib/partner-tiers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OPTIONAL_ENV = path.join(ROOT, 'scripts/sanity-import/.env')

/** Where a given year's generated rows live. */
const outputFor = (year) =>
  path.join(ROOT, `src/data/${year}/speakers.generated.json`)

const teamOutputFor = (year) =>
  path.join(ROOT, `src/data/${year}/team.generated.json`)

const partnersOutputFor = (year) =>
  path.join(ROOT, `src/data/${year}/partners.generated.json`)

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

const TEAM_QUERY = `*[_type == "teamMember" && event->year == $year && published == true] | order(sortOrder asc, name asc) {
  "slug": slug.current,
  name,
  role,
  "team": teamGroup,
  organization,
  university,
  bio,
  commits,
  linkedIn,
  twitter,
  github,
  "avatar": headshot.asset->url
}`

/**
 * `!defined(status)` is not belt-and-braces: the field was added after these
 * documents existed, so an unset status means "written before the field" and
 * has to read as active. Dropping that clause would empty the grid for every
 * document nobody has opened in Studio since.
 *
 * `published` is separate and mechanical — the import clears it for rows that
 * disappear from its source. Both have to pass.
 */
const PARTNERS_QUERY = `*[_type == "partner" && event->year == $year && published == true && (!defined(status) || status == "active")] | order(sortOrder asc, name asc) {
  "slug": slug.current,
  name,
  tier,
  url,
  description,
  logoSurface,
  "logo": logo.asset->url,
  "logoAlt": logo.alt
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

/**
 * Numeric id derived from a slug. The site uses these only as React keys, but
 * they have to stay stable across builds so a re-fetch does not remount every
 * card — hence a hash of the slug rather than an array index.
 */
function stableId(input) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) || 1
}

function stableSpeakerSessionId(speakerSlug, sessionSlug) {
  return stableId(`${speakerSlug}::${sessionSlug}`)
}

/**
 * Pad single-digit hours to two digits ("9:30" -> "09:30"), including both ends
 * of a range ("9:30 - 13:00").
 *
 * date-fns parses either form, so this is consistency rather than a fix — but
 * ordering elsewhere is string-based (the GROQ `order(startTime asc)` above, and
 * normalizeSortTime in SessionsSection), and there "9:30" sorts after "13:30".
 * Anything the CMS or a legacy import produces gets normalized here, at the one
 * boundary where the site's data is written.
 */
function normalizeTimeString(value) {
  if (typeof value !== 'string') return value

  return value
    .split('-')
    .map((part) => part.trim().replace(/^(\d):(\d{2})$/, '0$1:$2'))
    .join(' - ')
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
      time: normalizeTimeString(session.startTime) || 'TBA',
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

/**
 * Team rows in the flat shape the layouts already consume. Note `linkedin`
 * lowercase: the schema field is `linkedIn`, but OrganizersSection, TeamSection
 * and DevTeamSection all read `member.linkedin`, so the rename happens here
 * rather than across four components.
 */
export async function fetchEventTeam(options = {}) {
  const eventYear = Number(
    options.eventYear ??
      readEnv('SANITY_EVENT_YEAR', String(DEFAULT_EVENT_YEAR))
  )

  const client = createSanityReadClient(options)
  const members = await client.fetch(TEAM_QUERY, { year: eventYear })

  return members
    .filter((member) => member.slug && member.name && member.team)
    .map((member) => {
      const row = {
        id: stableId(`team::${member.slug}`),
        name: member.name,
        role: member.role ?? '',
        team: member.team,
        organization: member.organization ?? '',
        university: member.university ?? '',
        avatar: member.avatar ?? '',
      }

      if (member.bio) row.bio = member.bio
      if (member.commits != null) row.commits = member.commits
      if (member.linkedIn) row.linkedin = member.linkedIn
      if (member.twitter) row.twitter = member.twitter
      if (member.github) row.github = member.github

      return row
    })
}

/** Fields a partner row cannot render without. */
const PARTNER_REQUIRED_STRINGS = ['slug', 'name', 'tier']

/**
 * Sanity's Content Lake is schemaless at the API level: `options.list` and
 * `validation` constrain the Studio, not the write API, so a row arriving from
 * an import, an n8n workflow, or a hand-rolled mutation can hold a number where
 * a string belongs. The import validates its own rows for this reason
 * (assertValidRows), but that only covers rows that pass through the import.
 *
 * This is the other boundary — the one place the site's data is written — so
 * the same suspicion applies. A truthy non-string would otherwise sail into
 * `<img alt>` and `<a href>` as "[object Object]".
 */
const nonEmptyString = (value) =>
  typeof value === 'string' && value.trim() !== ''

/** Optional strings are dropped rather than coerced when malformed. */
const optionalString = (value) => (nonEmptyString(value) ? value : undefined)

/** Best available label for a row too broken to render. */
const describePartner = (partner) =>
  nonEmptyString(partner.name)
    ? partner.name
    : nonEmptyString(partner.slug)
      ? partner.slug
      : 'unnamed partner'

/**
 * Partner rows in one flat array, ordered the way the page reads: tier by tier
 * in PARTNER_TIERS order, then sortOrder, then name.
 *
 * Grouping is left to the component rather than baked into a nested object,
 * because the tier row it renders is a display concern (heading, slot count,
 * tile shape) that already lives there — see TIER_DISPLAY in PartnersSection.
 * A flat array also means a tier gaining its first sponsor needs no new key.
 */
export async function fetchEventPartners(options = {}) {
  const eventYear = Number(
    options.eventYear ??
      readEnv('SANITY_EVENT_YEAR', String(DEFAULT_EVENT_YEAR))
  )

  const client = createSanityReadClient(options)
  const partners = await client.fetch(PARTNERS_QUERY, { year: eventYear })

  const tierRank = new Map(PARTNER_TIERS.map((tier, index) => [tier, index]))
  // An unknown tier sorts last rather than to the front, so bad data never
  // displaces the diamond row. writePartnersYear warns about it separately.
  const rankOf = (tier) => tierRank.get(tier) ?? PARTNER_TIERS.length

  const unusable = []

  const rows = partners
    .filter((partner) => {
      const missing = PARTNER_REQUIRED_STRINGS.filter(
        (field) => !nonEmptyString(partner[field])
      )
      if (missing.length === 0) return true

      unusable.push(
        `${describePartner(partner)} — ${missing
          .map((field) => `${field}=${JSON.stringify(partner[field])}`)
          .join(', ')}`
      )
      return false
    })
    .sort((a, b) => rankOf(a.tier) - rankOf(b.tier))
    .map((partner) => {
      const row = {
        id: stableId(`partner::${partner.slug}`),
        slug: partner.slug,
        name: partner.name,
        tier: partner.tier,
        logo: optionalString(partner.logo) ?? '',
        logoAlt: optionalString(partner.logoAlt) ?? partner.name,
        logoSurface: partner.logoSurface === 'light' ? 'light' : 'dark',
      }

      const url = optionalString(partner.url)
      const description = optionalString(partner.description)
      if (url) row.url = url
      if (description) row.description = description

      return row
    })

  if (unusable.length > 0) {
    console.warn(
      `  warning: ${unusable.length} partner(s) skipped — a required field ` +
        `was missing or not a string:`
    )
    for (const problem of unusable) console.warn(`    ${problem}`)
  }

  return rows
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

const teamPassthroughModule = (year) => `/**
 * Team roster for ${year}.
 * Generated from Sanity before each build — see scripts/fetch-event-data.mjs.
 */
import teamGenerated from './team.generated.json'

export const teamData = teamGenerated
`

const partnersPassthroughModule = (year) => `/**
 * Partners and sponsors for ${year}.
 * Generated from Sanity before each build — see scripts/fetch-event-data.mjs.
 */
import partnersGenerated from './partners.generated.json'

export const partnersData = partnersGenerated
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

/**
 * Only the live event has a team roster today, so a year with no team documents
 * writes nothing rather than littering the archive years with empty files. A
 * past year that later gets team members in Sanity picks this up on its own.
 */
async function writeTeamYear(year) {
  const rows = await fetchEventTeam({ eventYear: year })
  const target = teamOutputFor(year)

  // A year that has never had team data gets no files at all — that keeps the
  // archive years (which render no team section) free of empty artifacts.
  //
  // But once the file exists it tracks the dataset unconditionally, including
  // all the way down to []. Skipping the write when Sanity returns nothing
  // would freeze the last good roster on disk, and since team.js imports that
  // file statically, unpublishing every member would leave them rendering in
  // production with no way to take them down.
  if (rows.length === 0 && !existsSync(target)) return 0

  // Published, valid, and invisible: a group the site has no section for. Say
  // so here rather than letting an organizer wonder why the person they just
  // added never showed up.
  const unrendered = rows.filter((row) => !isRenderedTeamGroup(row.team))
  if (unrendered.length > 0) {
    console.warn(
      `  warning: ${unrendered.length} team member(s) are in a group the site ` +
        `does not render (it shows ${RENDERED_TEAM_GROUPS.join(' and ')}):`
    )
    for (const row of unrendered) {
      console.warn(`    ${row.name} — ${row.team}`)
    }
  }

  await mkdir(path.dirname(target), { recursive: true })
  await writeFormattedJson(target, rows)

  const modulePath = path.join(path.dirname(target), 'team.js')
  if (!existsSync(modulePath)) {
    await writeFile(modulePath, teamPassthroughModule(year), 'utf8')
  }

  if (rows.length === 0) {
    console.warn(
      `  warning: ${year} has no published team members — wrote an empty ` +
        `roster to ${path.relative(ROOT, target)}. The team section will be ` +
        `empty on the built site.`
    )
    return 0
  }

  console.log(
    `  ${year}: ${rows.length} team members -> ${path.relative(ROOT, target)}`
  )
  return rows.length
}

/**
 * Same contract as writeTeamYear: a year that has never had partners gets no
 * files, but once the file exists it tracks the dataset all the way down to [],
 * so unpublishing every sponsor actually takes them off the built site.
 */
async function writePartnersYear(year) {
  const rows = await fetchEventPartners({ eventYear: year })
  const target = partnersOutputFor(year)

  if (rows.length === 0 && !existsSync(target)) return 0

  // Published, valid, and invisible: a tier the grid has no row for. Say so
  // here rather than letting an organizer wonder why the sponsor they just
  // added never showed up.
  const unrendered = rows.filter((row) => !isRenderedPartnerTier(row.tier))
  if (unrendered.length > 0) {
    console.warn(
      `  warning: ${unrendered.length} partner(s) are in a tier the site does ` +
        `not render (it shows ${RENDERED_PARTNER_TIERS.join(', ')}):`
    )
    for (const row of unrendered) {
      console.warn(`    ${row.name} — ${row.tier}`)
    }
  }

  const logoless = rows.filter((row) => !row.logo)
  if (logoless.length > 0) {
    console.warn(
      `  warning: ${logoless.length} partner(s) have no logo in Sanity and ` +
        `will render as a name-only tile:`
    )
    for (const row of logoless) {
      console.warn(`    ${row.name}`)
    }
  }

  await mkdir(path.dirname(target), { recursive: true })
  await writeFormattedJson(target, rows)

  const modulePath = path.join(path.dirname(target), 'partners.js')
  if (!existsSync(modulePath)) {
    await writeFile(modulePath, partnersPassthroughModule(year), 'utf8')
  }

  if (rows.length === 0) {
    console.warn(
      `  warning: ${year} has no published partners — wrote an empty list to ` +
        `${path.relative(ROOT, target)}. The partners section will show its ` +
        `"looking for partners" state on the built site.`
    )
    return 0
  }

  console.log(
    `  ${year}: ${rows.length} partners -> ${path.relative(ROOT, target)}`
  )
  return rows.length
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
  let teamTotal = 0
  let partnersTotal = 0
  const manifest = []
  for (const event of events) {
    const stats = await writeYear(event.year)
    teamTotal += await writeTeamYear(event.year)
    partnersTotal += await writePartnersYear(event.year)
    total += stats.rowCount
    manifest.push({ ...event, ...stats })
  }

  await writeFormattedJson(EVENTS_OUTPUT, manifest)

  console.log(
    `Wrote ${total} speaker-session rows, ${teamTotal} team members and ` +
      `${partnersTotal} partners across ${years.length} year(s)`
  )
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((error) => {
    console.error('fetch-event-data failed:', error.message)
    process.exit(1)
  })
}
