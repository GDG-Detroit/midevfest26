/**
 * Venue room names for our Innovation Summit.
 * Update labels here when room assignments are confirmed.
 */

/** Run-of-show tab (check-in, breaks, keynote, etc.). */
export const SCHEDULE_TRACK = 'Schedule'

/** Single session track for 2026 — all speaker sessions and activities use this. */
export const SESSION_TRACK = 'Level Up'

export const VENUE_ROOMS = {
  LEVEL_UP: 'Rooms 2415 & 2416',
  KITCHEN: 'Kitchen',
}

/** Primary room per schedule track. */
export const TRACK_ROOMS = {
  [SESSION_TRACK]: VENUE_ROOMS.LEVEL_UP,
  [SCHEDULE_TRACK]: '',
}

/** Prefix + room label; returns '' when room is unset so UI chips stay hidden. */
export function withRoomPrefix(prefix, room) {
  const label = typeof room === 'string' ? room.trim() : ''
  return label ? `${prefix}${label}` : ''
}

/** Activity cards sometimes prefix the room (e.g. "in IBM HQ"). */
export const ACTIVITY_ROOMS = {
  IN_LEVEL_UP: withRoomPrefix('in ', VENUE_ROOMS.LEVEL_UP),
  NEAR_LEVEL_UP: withRoomPrefix('near ', VENUE_ROOMS.LEVEL_UP),
  NEAR_STAIRS_AND_LEVEL_UP: withRoomPrefix(
    'near stairs and ',
    VENUE_ROOMS.LEVEL_UP
  ),
  AT_SESSIONS: 'at Sessions',
}

export function roomForTrack(track) {
  const room = TRACK_ROOMS[track]
  return typeof room === 'string' ? room.trim() : ''
}

export function trackStageHeading(track) {
  const room = roomForTrack(track)
  return room ? `${track} stage in ${room}` : track
}
