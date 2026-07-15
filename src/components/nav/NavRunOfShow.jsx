import PropTypes from 'prop-types'
import { format, parse } from 'date-fns'
import { conferenceActivities } from '@/data/2026/conferenceActivities'

const runOfShowItems = conferenceActivities.filter(
  (activity) => activity.track === 'Schedule'
)

function formatTimeRange(time, timeEnd) {
  const formatTime = (t) => {
    if (!t) return ''
    try {
      return format(parse(t, 'HH:mm', new Date()), 'h:mm a')
    } catch {
      return t
    }
  }
  const start = formatTime(time)
  const end = formatTime(timeEnd)
  if (start && end) return `${start} – ${end}`
  return start || ''
}

/**
 * Compact run-of-show for the mobile nav drawer (covers hero on home).
 */
export default function NavRunOfShow({ onViewFullSchedule }) {
  return (
    <div className="mt-3">
      <ul className="custom-scrollbar max-h-[38vh] space-y-2 overflow-y-auto pr-1">
        {runOfShowItems.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5"
          >
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-iwd-gold-400">
              {formatTimeRange(item.time, item.timeEnd)}
            </p>
            <p className="mt-0.5 font-heading text-sm font-bold leading-snug text-white">
              {item.title}
            </p>
            {item.room ? (
              <p className="mt-0.5 font-body text-[11px] text-white/45">
                {item.room}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {onViewFullSchedule ? (
        <button
          type="button"
          onClick={onViewFullSchedule}
          className="mt-3 w-full rounded-lg border border-iwd-gold-400/35 bg-iwd-gold-400/10 px-4 py-2.5 font-body text-[11px] font-semibold uppercase tracking-[0.15em] text-iwd-gold-300 transition-colors hover:bg-iwd-gold-400/15"
        >
          View full schedule
        </button>
      ) : null}
    </div>
  )
}

NavRunOfShow.propTypes = {
  onViewFullSchedule: PropTypes.func,
}
