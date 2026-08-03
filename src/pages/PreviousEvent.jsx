import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Link, useParams } from 'react-router-dom'

import PageLayout from '@/layouts/PageLayout'
import SessionsSection from '@/layouts/SessionsSection'
import SpeakersSection from '@/layouts/SpeakersSection'
import { getEventMetadata, loadSpeakersData } from '@/utils/eventData'

/**
 * A single archived year: the real sessions and speakers that ran, not a summary
 * card. Rows load on demand so the archive index stays small — see eventData.js.
 *
 * Past years keep the rooms they actually used. Those rooms belong to that year's
 * venue, so there is no venue map here; SessionsSection hides the room chip when
 * a session has none, which is what years with no room data get.
 */
function EventNotFound({ year }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <h1
        id="main-heading"
        className="mb-5 font-heading text-3xl font-bold text-white sm:text-4xl"
      >
        No program for {year}
      </h1>
      <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-iwd-gold-400/50 to-transparent" />
      <p className="mb-10 font-body text-base leading-relaxed text-gray-400">
        We don&rsquo;t have a published program for that year. It may not have
        been archived yet.
      </p>
      <Link
        to="/past-events"
        className="inline-flex items-center rounded-lg border border-iwd-gold-400/30 bg-iwd-gold-400/10 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-iwd-gold-300 transition-colors hover:border-iwd-gold-400/50 hover:bg-iwd-gold-400/20"
      >
        Back to past events
      </Link>
    </div>
  )
}

EventNotFound.propTypes = {
  year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

const PreviousEvent = () => {
  const { year } = useParams()
  const metadata = getEventMetadata(year)
  const [speakersData, setSpeakersData] = useState(null)

  useEffect(() => {
    if (!metadata.available) return undefined

    // Guards against a slow load for one year resolving after the user has
    // already navigated to another.
    let active = true
    loadSpeakersData(year).then((rows) => {
      if (active) setSpeakersData(rows ?? [])
    })
    return () => {
      active = false
    }
  }, [year, metadata.available])

  if (!metadata.available) {
    return (
      <PageLayout>
        <EventNotFound year={year} />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <section className="bg-iwd-surface-raised min-h-screen pb-24 pt-32 sm:pt-36 dark:bg-iwd-black-950">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Link
            to="/past-events"
            className="font-body text-xs font-semibold uppercase tracking-[0.3em] text-iwd-gold-400 transition-colors hover:text-iwd-gold-300"
          >
            &larr; Past Events
          </Link>

          <h1
            id="main-heading"
            className="mb-5 mt-6 font-heading text-3xl font-bold text-white sm:text-4xl lg:text-5xl"
          >
            {metadata.title}
          </h1>
          <div className="mb-6 h-px w-24 bg-gradient-to-r from-iwd-gold-400/50 to-transparent sm:w-32" />

          {(metadata.date || metadata.location) && (
            <p className="mb-4 text-xs uppercase tracking-widest text-gray-300">
              {[metadata.date, metadata.location].filter(Boolean).join(' • ')}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {[
              `${metadata.speakerCount} speakers`,
              `${metadata.sessionCount} sessions`,
              `${metadata.tracks.length} tracks`,
            ].map((stat) => (
              <span
                key={stat}
                className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-wider text-gray-200"
              >
                {stat}
              </span>
            ))}
          </div>
        </div>

        {speakersData === null ? (
          <p
            className="mx-auto max-w-7xl px-6 py-16 font-body text-sm text-gray-400 sm:px-10"
            role="status"
          >
            Loading the {metadata.year} program&hellip;
          </p>
        ) : (
          <>
            <SessionsSection
              speakersData={speakersData}
              year={metadata.year}
              tracks={metadata.tracks}
              defaultExpanded={true}
              isArchived={true}
            />
            <SpeakersSection
              speakersData={speakersData}
              year={metadata.year}
              defaultExpanded={false}
            />
          </>
        )}
      </section>
    </PageLayout>
  )
}

export default PreviousEvent
