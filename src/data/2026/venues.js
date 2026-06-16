/**
 * Venue room names for our Innovation Summit.
 * Update labels here when room assignments are confirmed.
 */

export const VENUE_ROOMS = {
  LEVEL_UP: 'IBM HQ',
  BUILD_WITH_AI: '',
  INNOVATION: '',
  LEADERSHIP: '',
  AI_FOUNDATIONS: '',
  CAREERS: '',
}

/** Primary room per schedule track. */
export const TRACK_ROOMS = {
  'Level Up': VENUE_ROOMS.LEVEL_UP,
  'Build with AI': VENUE_ROOMS.BUILD_WITH_AI,
  Innovation: VENUE_ROOMS.INNOVATION,
  Leadership: VENUE_ROOMS.LEADERSHIP,
  'AI Foundations': VENUE_ROOMS.AI_FOUNDATIONS,
  Careers: VENUE_ROOMS.CAREERS,
}

/** Activity cards sometimes prefix the room (e.g. "in Value Conference Room"). */
export const ACTIVITY_ROOMS = {
  IN_CAREERS: `in ${VENUE_ROOMS.CAREERS}`,
  NEAR_CAREERS: `near ${VENUE_ROOMS.CAREERS}`,
  NEAR_STAIRS_AND_CAREERS: `near stairs and ${VENUE_ROOMS.CAREERS}`,
  AT_SESSIONS: 'at Sessions',
}

export function roomForTrack(track) {
  return TRACK_ROOMS[track] ?? ''
}

export function trackStageHeading(track) {
  const room = roomForTrack(track)
  return room ? `${track} stage in ${room}` : track
}
