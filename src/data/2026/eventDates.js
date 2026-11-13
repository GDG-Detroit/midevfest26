/**
 * Event dates for Michigan DevFest 2026. Sessions only carry a time of day, so
 * the day a session runs on comes from its track.
 */
import { HACKATHON_TRACK, SCHEDULE_TRACK } from './venues'

/** Eastern time: the zone the venue, and every session time, is in. */
export const EVENT_TIMEZONE = 'America/Detroit'

/** Day one: the AI Hackathon. */
export const HACKATHON_DATE = '2026-11-13'

/** Day two: the DevFest conference, and the default for every other track. */
export const EVENT_DATE = '2026-11-14'

const TRACK_DATES = { [HACKATHON_TRACK]: HACKATHON_DATE }

/** YYYY-MM-DD the given track runs on. */
export const dateForTrack = (track) => TRACK_DATES[track] ?? EVENT_DATE

/** Today as YYYY-MM-DD in the event's time zone, not the visitor's. */
export const todayInEventZone = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

/**
 * 6:00 AM Detroit on conference day. Before this the Hackathon stays the
 * default tab in its current place. At this time it moves to the far left
 * and the Schedule tab is what opens.
 */
export const CONFERENCE_MORNING_AT = `${EVENT_DATE}T06:00`

const eventZoneParts = (now) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now)
  const value = (type) => parts.find((part) => part.type === type).value
  return {
    year: value('year'),
    month: value('month').padStart(2, '0'),
    day: value('day').padStart(2, '0'),
    hour: value('hour').padStart(2, '0'),
    minute: value('minute').padStart(2, '0'),
  }
}

/** "YYYY-MM-DDTHH:mm" for the event zone, so it compares with CONFERENCE_MORNING_AT. */
export const eventZoneStamp = (now = new Date()) => {
  const part = eventZoneParts(now)
  return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}`
}

/** UTC instant for a "YYYY-MM-DDTHH:mm" wall time in the event zone. */
const eventZoneInstant = (stamp) => {
  const utcGuess = new Date(`${stamp}:00Z`)
  const zonedAsUtc = new Date(`${eventZoneStamp(utcGuess)}:00Z`)
  return new Date(
    utcGuess.getTime() + (utcGuess.getTime() - zonedAsUtc.getTime())
  )
}

export const conferenceMorningHasStarted = (now = new Date()) =>
  eventZoneStamp(now) >= CONFERENCE_MORNING_AT

/** Milliseconds until conference morning. Zero once that time has passed. */
export const msUntilConferenceMorning = (now = new Date()) =>
  Math.max(0, eventZoneInstant(CONFERENCE_MORNING_AT).getTime() - now.getTime())

/**
 * The tab to open on: the Hackathon until conference morning, then the Schedule.
 */
export const defaultTrackForDate = (now = new Date()) =>
  conferenceMorningHasStarted(now) ? SCHEDULE_TRACK : HACKATHON_TRACK

/** "Friday, November 13" for a YYYY-MM-DD date. */
export const formatEventDate = (isoDate) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00Z`))

/** "Fri" for a YYYY-MM-DD date. */
export const formatEventDayShort = (isoDate) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
  }).format(new Date(`${isoDate}T12:00:00Z`))
