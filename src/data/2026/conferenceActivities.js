/**
 * Conference activities (non-speaker events) shown in track schedules.
 * Use 24-hour time format (e.g. "08:00", "13:00") for sorting.
 * Track names must match SessionsSection tracks exactly.
 * Room labels: import from venues.js (ACTIVITY_ROOMS prefixes "in"/"near" where needed).
 */
import { SCHEDULE_TRACK, VENUE_ROOMS } from './venues'

export const conferenceActivities = [
  {
    id: 'schedule-checkin',
    track: SCHEDULE_TRACK,
    title: 'Check-In & Breakfast',
    content: null,
    time: '08:00',
    timeEnd: '09:00',
    room: VENUE_ROOMS.KITCHEN,
  },
  {
    id: 'schedule-yoga',
    track: SCHEDULE_TRACK,
    title: 'Morning Mindfulness & Meditative Yoga',
    content: null,
    time: '08:15',
    timeEnd: '08:45',
    room: VENUE_ROOMS.LEVEL_UP,
  },
  {
    id: 'schedule-welcome',
    track: SCHEDULE_TRACK,
    title: 'Welcome & Opening Remarks',
    content: null,
    time: '08:45',
    timeEnd: '09:00',
    room: VENUE_ROOMS.LEVEL_UP,
  },
  {
    id: 'schedule-sessions-morning',
    track: SCHEDULE_TRACK,
    title: 'Sessions',
    content: null,
    time: '09:00',
    timeEnd: '12:15',
    room: VENUE_ROOMS.LEVEL_UP,
  },
  {
    id: 'schedule-lunch',
    track: SCHEDULE_TRACK,
    title: 'Lunch Break & Networking',
    content: null,
    time: '12:15',
    timeEnd: '13:00',
    room: VENUE_ROOMS.KITCHEN,
  },
  {
    id: 'schedule-sessions-afternoon',
    track: SCHEDULE_TRACK,
    title: 'Sessions',
    content: null,
    time: '13:00',
    timeEnd: '16:00',
    room: VENUE_ROOMS.LEVEL_UP,
  },
  {
    id: 'schedule-closing',
    track: SCHEDULE_TRACK,
    title: 'Closing Remarks & Prizes',
    content: null,
    time: '16:00',
    timeEnd: '16:30',
    room: null,
  },
  {
    id: 'schedule-techie-hour',
    track: SCHEDULE_TRACK,
    title: 'Techie Hour & Networking',
    content: null,
    time: '16:30',
    timeEnd: '18:00',
    room: null,
  },
]
