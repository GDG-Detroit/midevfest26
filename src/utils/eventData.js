/**
 * Year registry for the event archive.
 *
 * One source of truth: every year — past and current — resolves to the JSON
 * generated from Sanity by scripts/fetch-event-data.mjs. There is deliberately
 * no static-JS branch for "old" years; adding an event document in Sanity and
 * re-running the fetch is all it takes for a year to appear here.
 *
 * Counts are derived at fetch time and travel in events.generated.json, so the
 * archive index renders from a small manifest rather than bundling every year's
 * speaker bios. A year's full rows load only when its detail page asks for them.
 */
import eventsManifest from '@/data/events.generated.json'

/**
 * Lazy on purpose — eager loading would pull every year's speakers into whatever
 * chunk imports this module. Vite turns each match into its own chunk.
 */
const speakerLoaders = import.meta.glob('@/data/*/speakers.generated.json', {
  import: 'default',
})

/** year (number) -> () => Promise<rows> */
const loaderByYear = new Map(
  Object.entries(speakerLoaders)
    .map(([filePath, load]) => {
      const match = /\/data\/(\d{4})\//.exec(filePath)
      return match ? [Number(match[1]), load] : null
    })
    .filter(Boolean)
)

/**
 * Facts about each event that the Sanity `event` schema does not carry yet — it
 * has title, year, slug and timezone, but no date or venue. Presentation detail
 * only; nothing derivable from the program lives here.
 *
 * TODO: promote to the event schema so this map can go away.
 */
const EVENT_DETAILS = {
  2026: { date: 'November 13-14, 2026', location: 'LCRC, Detroit' },
  2025: { date: 'November 2025', location: 'MotorCity Casino, Detroit' },
  2024: { date: 'November 2024', location: 'Detroit, MI' },
  2023: { date: 'November 2023', location: 'Detroit, MI' },
}

/** The year the site is currently promoting; excluded from the archive. */
export const CURRENT_EVENT_YEAR = 2026

/** Resolves a year's speaker-session rows, or null when the year is unknown. */
export async function loadSpeakersData(year) {
  const load = loaderByYear.get(Number(year))
  if (!load) return null
  return load()
}

export function getEventMetadata(year) {
  const numericYear = Number(year)
  const entry = eventsManifest.find((event) => event.year === numericYear)
  const details = EVENT_DETAILS[numericYear] ?? {}

  if (!entry || !entry.rowCount) {
    return {
      available: false,
      year: numericYear,
      title: entry?.title ?? `Michigan DevFest ${numericYear}`,
      slug: entry?.slug ?? '',
      speakerCount: 0,
      sessionCount: 0,
      tracks: [],
      ...details,
    }
  }

  return {
    available: true,
    year: numericYear,
    title: entry.title,
    slug: entry.slug ?? '',
    speakerCount: entry.speakerCount ?? 0,
    sessionCount: entry.sessionCount ?? 0,
    tracks: entry.tracks ?? [],
    ...details,
  }
}

/** Archive years, newest first — the current event is promoted elsewhere. */
export function getAvailableYears() {
  return eventsManifest
    .filter((event) => event.year !== CURRENT_EVENT_YEAR)
    .filter((event) => (event.rowCount ?? 0) > 0)
    .map((event) => event.year)
    .sort((a, b) => b - a)
}

/** Every archive year's metadata, newest first — drives the index page. */
export function getArchivedEvents() {
  return getAvailableYears().map(getEventMetadata)
}
