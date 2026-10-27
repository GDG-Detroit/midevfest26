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
 * The tab to open on: the Hackathon until conference day, then the Schedule.
 * Compared as ISO date strings, which sort the same as the dates themselves.
 */
export const defaultTrackForDate = (now = new Date()) =>
  todayInEventZone(now) < EVENT_DATE ? HACKATHON_TRACK : SCHEDULE_TRACK

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
