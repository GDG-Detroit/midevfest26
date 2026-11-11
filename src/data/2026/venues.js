/**
 * Tracks for Michigan DevFest 2026. Each track has its own room, named after
 * the track, so there are no separate room labels to maintain.
 */

/** Day-one tab: the AI Hackathon. Its own date lives in `eventDates.js`. */
export const HACKATHON_TRACK = 'Hackathon'

/** Run-of-show tab (check-in, breaks, keynote, etc.). */
export const SCHEDULE_TRACK = 'Schedule'

/** Tracks for the 2026 program, in tab order. Keynote is a label, not a track. */
export const PROGRAM_TRACKS = [
  'Build with AI',
  'AI Foundations',
  'Innovation',
  'Leadership',
  'Level Up',
]

/** Fallback track for sessions without one. */
export const SESSION_TRACK = 'Level Up'

/**
 * Rooms on the Greektown plan. `track` is the name shown with the room.
 * `scheduleTrack` is set when a session tab meets in that room.
 */
export const VENUE_ROOMS = [
  {
    key: 'ballroomb',
    regionId: 'BALLROOMB',
    room: 'Ballroom B',
    track: 'Build with AI',
    scheduleTrack: 'Build with AI',
  },
  {
    key: 'salonf',
    regionId: 'SALONF',
    room: 'Salon F',
    track: 'AI Foundations',
    scheduleTrack: 'AI Foundations',
  },
  {
    key: 'ballroomc',
    regionId: 'BALLROOMC',
    room: 'Ballroom C',
    track: 'Innovation',
    scheduleTrack: 'Innovation',
  },
  {
    key: 'salone',
    regionId: 'SALONE',
    room: 'Salon E',
    track: 'Leadership',
    scheduleTrack: 'Leadership',
  },
  {
    key: 'ballrooma',
    regionId: 'BALLROOMA',
    room: 'Ballroom A',
    track: 'Level Up',
    scheduleTrack: 'Level Up',
  },
  {
    key: 'salond',
    regionId: 'SALOND',
    room: 'Salon D',
    track: 'Career, Mentorship & Resumes',
  },
  {
    key: 'salonc',
    regionId: 'SALONC',
    room: 'Salon C',
    track: 'Speakers',
  },
  {
    key: 'salonb',
    regionId: 'SALONB',
    room: 'Salon B',
    track: 'Volunteers',
  },
  {
    key: 'salona',
    regionId: 'SALONA',
    room: 'Salon A',
    track: 'Compass Team',
  },
]

/** Track on the first line, room under it. */
export function linesForRoom(room) {
  return [room.track, room.room]
}

/** Two lines for a 2026 schedule tab, or null when that tab has no room. */
export function linesForScheduleTrack(track) {
  const room = VENUE_ROOMS.find((item) => item.scheduleTrack === track)
  if (!room) return null
  return [track, room.room]
}

/** The track name doubles as the room name until a heading asks for the room. */
export function trackStageHeading(track) {
  return track
}
