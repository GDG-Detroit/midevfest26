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

/** The track name doubles as the room name. */
export function trackStageHeading(track) {
  return track
}
