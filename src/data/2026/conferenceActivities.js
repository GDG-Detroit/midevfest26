/**
 * Conference activities (non-speaker events) shown in track schedules.
 * Use 24-hour time format (e.g. "08:00", "13:00") for sorting.
 * Track names must match SessionsSection tracks exactly.
 */
import { SCHEDULE_TRACK } from './venues'
// Speakerless Hackathon sessions from Sanity — see SPEAKERLESS_TRACKS in
// scripts/fetch-event-data.mjs. Edit those in the Studio, not here.
import sanityActivities from './activities.generated.json'

const staticActivities = [
  {
    id: 'schedule-checkin',
    track: SCHEDULE_TRACK,
    title: 'Check-In & Breakfast',
    content: null,
    time: '08:00',
    timeEnd: '09:00',
  },
  {
    id: 'schedule-yoga',
    track: SCHEDULE_TRACK,
    title: 'Morning Mindfulness & Meditative Yoga',
    content: null,
    time: '08:15',
    timeEnd: '08:45',
  },
  {
    id: 'schedule-welcome',
    track: SCHEDULE_TRACK,
    title: 'Welcome & Opening Remarks',
    content: 'Jenna Ritten and Dave Koziol',
    time: '08:45',
    timeEnd: '09:00',
  },
  {
    id: 'schedule-keynote',
    track: SCHEDULE_TRACK,
    title: 'Keynote: AI for Scale. People for Success.',
    content: 'W Scott Richardson',
    time: '09:00',
    timeEnd: '09:45',
  },
  {
    id: 'schedule-sessions-morning',
    track: SCHEDULE_TRACK,
    title: 'Sessions',
    content: null,
    time: '10:00',
    timeEnd: '12:05',
  },
  {
    id: 'schedule-lunch',
    track: SCHEDULE_TRACK,
    title: 'Lunch Break & Networking',
    content: null,
    time: '12:15',
    timeEnd: '13:00',
    room: 'Third Floor',
  },
  {
    id: 'schedule-sessions-afternoon',
    track: SCHEDULE_TRACK,
    title: 'Sessions',
    content: null,
    time: '13:00',
    timeEnd: '15:50',
  },
  {
    id: 'schedule-closing',
    track: SCHEDULE_TRACK,
    title: 'Closing Remarks & Prizes',
    content: null,
    time: '16:00',
    timeEnd: '16:30',
  },
  {
    id: 'schedule-techie-hour',
    track: SCHEDULE_TRACK,
    title: 'Techie Hour & Networking',
    content: null,
    time: '16:30',
    timeEnd: '18:00',
    room: 'Third Floor',
  },
  {
    id: 'innovation-hackathon-winners',
    track: 'Innovation',
    title: 'Michigan DevFest Hackathon Winners',
    content: 'Winning teams from the AI Hackathon present their projects.',
    time: '15:15',
    timeEnd: '15:50',
  },
]

export const conferenceActivities = [...staticActivities, ...sanityActivities]
