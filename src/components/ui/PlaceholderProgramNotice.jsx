import PropTypes from 'prop-types'
import { FaCircleInfo } from 'react-icons/fa6'

/**
 * Explains that the schedule and speakers below are last year's program, shown
 * as placeholder content until the current year's is confirmed. Section
 * headings carry the year, but on their own they read as a stale site rather
 * than a deliberate preview — this states the intent outright.
 *
 * Rendered once above both sections instead of inside them, so SessionsSection
 * and SpeakersSection stay generic enough for per-year archive pages.
 *
 * Palette is limited to utilities with [data-mode='light'] remaps in index.css
 * (bg-iwd-gold-400/10, border-iwd-gold-400/30, text-iwd-gold-400, text-gray-300)
 * so the notice keeps its contrast in both modes.
 */
function PlaceholderProgramNotice({ programYear, eventYear }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-10 md:px-14 lg:px-16">
      <div
        role="note"
        aria-labelledby="placeholder-program-notice-heading"
        className="flex flex-col gap-3 rounded-lg border border-iwd-gold-400/30 bg-iwd-gold-400/10 p-5 sm:flex-row sm:items-start sm:gap-4 sm:p-6"
      >
        <FaCircleInfo
          className="size-5 shrink-0 text-iwd-gold-400 sm:mt-0.5"
          aria-hidden="true"
        />
        <div>
          <h2
            id="placeholder-program-notice-heading"
            className="mb-2 font-heading text-lg font-bold text-white sm:text-xl"
          >
            You&rsquo;re looking at the {programYear} program
          </h2>
          <p className="font-body text-sm leading-relaxed text-gray-300 sm:text-base">
            The {eventYear} schedule and speaker lineup aren&rsquo;t confirmed
            yet, so the sessions and speakers below are from Michigan DevFest{' '}
            {programYear}. They&rsquo;re here to show what a DevFest day looks
            like, and they&rsquo;ll be replaced as {eventYear} speakers are
            announced. The venue, date, and travel details above are {eventYear}
            &rsquo;s and are correct.
          </p>
        </div>
      </div>
    </div>
  )
}

PlaceholderProgramNotice.propTypes = {
  /** Year the displayed sessions and speakers actually come from. */
  programYear: PropTypes.number.isRequired,
  /** Year the site is for — the program that is still to be confirmed. */
  eventYear: PropTypes.number.isRequired,
}

export default PlaceholderProgramNotice
