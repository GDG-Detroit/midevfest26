import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { GOLD_PRIMARY_LIGHT_HOVER } from '@/constants/goldPrimaryButtonLightHover'
import PageLayout from '@/layouts/PageLayout'
import { getArchivedEvents } from '@/utils/eventData'
// TODO: Uncomment when gallery photos are ready
// import EventGallery from '@/components/gallery/EventGallery'
// import { eventGalleries } from '@/data/galleryData'

/**
 * Archive years come from the registry, which reads the JSON generated from
 * Sanity. Counts are derived there rather than typed here, so they cannot drift
 * away from the program they describe.
 *
 * Only Michigan DevFest years appear. The Compass summit events (IWD, BHM) are a
 * separate lineage and are not promoted on this site.
 */
const archivedEvents = getArchivedEvents()

const PreviousEvents = () => {
  const [isVisible, setIsVisible] = useState(false)
  // TODO: Uncomment when gallery photos are ready
  // const [activeGallery, setActiveGallery] = useState(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // const activeGalleryData = activeGallery
  //   ? eventGalleries[activeGallery]
  //   : null

  return (
    <PageLayout>
      <section
        aria-labelledby="main-heading"
        className={`bg-iwd-surface-raised min-h-screen pb-24 pt-32 transition-[opacity,transform] duration-1000 ease-out sm:pt-36 dark:bg-iwd-black-950 ${
          isVisible ? 'opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Hand-drawn style background accents */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
          <svg
            className="absolute right-0 top-0 size-64 -translate-y-1/2 translate-x-1/2 text-iwd-gold-400"
            viewBox="0 0 200 200"
          >
            <path
              d="M40,100 C40,50 160,50 160,100 C160,150 40,150 40,100"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="4 4"
            />
            <circle
              cx="100"
              cy="100"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </svg>
          <svg
            className="absolute bottom-0 left-0 size-96 -translate-x-1/4 translate-y-1/4 text-gray-900 dark:text-white"
            viewBox="0 0 400 400"
          >
            <path
              d="M50,200 Q100,50 200,200 T350,200"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="10 5"
            />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
          {/* Header */}
          <div className="mb-16 text-center sm:mb-20">
            <p className="mb-4 font-body text-xs font-medium uppercase tracking-[0.3em] text-iwd-gold-400">
              Our Legacy
            </p>
            <h1
              id="main-heading"
              className="mb-5 font-heading text-3xl font-bold text-white sm:text-4xl lg:text-5xl"
            >
              Past{' '}
              <span className="bg-gradient-to-r from-iwd-gold-300 via-iwd-gold-400 to-iwd-gold-300 bg-clip-text text-transparent">
                Events
              </span>
            </h1>
            <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-iwd-gold-400/50 to-transparent sm:w-32" />
            <p className="mx-auto max-w-2xl font-body text-xl italic leading-relaxed text-gray-300">
              A look at the stories that brought us here.
            </p>
          </div>

          {/* TODO: Gallery overlay — uncomment when photos are ready
          {activeGallery && activeGalleryData && (
            <div className="mb-16 rounded-3xl border border-iwd-gold-400/20 bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
              <EventGallery
                eventName={activeGalleryData.eventName}
                images={activeGalleryData.images}
                onClose={() => setActiveGallery(null)}
              />
            </div>
          )}
          */}

          {/* Event Cards */}
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {archivedEvents.map((event, i) => (
              <div
                key={event.year}
                className="group relative flex flex-col items-start rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-500 hover:-translate-y-1 hover:border-iwd-gold-400/30 hover:bg-white/[0.04]"
                style={{
                  animation: 'sectionFadeUp 0.6s ease-out both',
                  animationDelay: `${i * 100}ms`,
                }}
              >
                {/* Year tag */}
                <div className="bg-iwd-surface-raised absolute -top-6 left-8 flex h-12 w-16 -skew-x-12 items-center justify-center rounded-xl border border-white/10 text-2xl font-black text-iwd-gold-400 shadow-2xl transition-transform group-hover:skew-x-0 dark:bg-iwd-black-900">
                  {event.year}
                </div>

                <div className="mt-6 flex-1">
                  <h2 className="mb-2 font-heading text-xl font-bold text-white sm:text-2xl">
                    <Link
                      to={`/past-events/${event.year}`}
                      className="transition-colors hover:text-iwd-gold-300"
                    >
                      {event.title}
                    </Link>
                  </h2>
                  {(event.date || event.location) && (
                    <p className="mb-4 text-xs uppercase tracking-widest text-gray-300">
                      {[event.date, event.location].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  {event.notice && (
                    <p
                      role="note"
                      className="mb-4 border-l-2 border-iwd-gold-400/50 pl-3 font-body text-sm leading-relaxed text-iwd-gold-300"
                    >
                      {event.notice}
                    </p>
                  )}
                  {event.attendees && (
                    <p className="my-2 text-xs uppercase tracking-widest text-gray-300">
                      Attendees: {event.attendees}
                    </p>
                  )}
                  {event.tracks.length > 0 && (
                    <p className="mb-6 text-sm leading-relaxed text-gray-200">
                      {event.sessionCount} sessions across {event.tracks.length}{' '}
                      {event.tracks.length === 1 ? 'track' : 'tracks'} —{' '}
                      {event.tracks.join(', ')}.
                    </p>
                  )}
                </div>

                {/* Counts, derived from the program rather than typed */}
                <div className="mt-auto flex flex-wrap gap-2">
                  {[
                    `${event.speakerCount} speakers`,
                    `${event.sessionCount} sessions`,
                    `${event.tracks.length} tracks`,
                  ].map((stat) => (
                    <span
                      key={stat}
                      className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-wider text-gray-200"
                    >
                      {stat}
                    </span>
                  ))}
                </div>

                {/* Hand-drawn 'connector' line */}
                <div className="relative mt-8 h-px w-full bg-gradient-to-r from-iwd-gold-400/20 via-iwd-gold-400/40 to-transparent">
                  <div className="bg-iwd-surface-raised absolute -right-1 -top-1 size-2 rounded-full border border-iwd-gold-400/40 dark:bg-iwd-black-950" />
                </div>

                <div className="mt-6 flex items-center gap-x-4">
                  <Link
                    to={`/past-events/${event.year}`}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-iwd-gold-300 transition-colors hover:text-iwd-gold-400"
                    aria-label={`View the ${event.title} program`}
                  >
                    View Details
                    <svg
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="mt-24 text-center">
            <p className="mb-8 font-body text-xl italic text-gray-300">
              Build the future with us.
            </p>
            <a
              href="/#membership"
              className={`inline-flex items-center rounded-lg border border-iwd-gold-400/30 bg-iwd-gold-400/10 px-10 py-5 text-sm font-semibold uppercase tracking-widest text-iwd-gold-300 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-iwd-gold-400/50 hover:bg-iwd-gold-400/20 hover:shadow-2xl hover:shadow-iwd-gold-500/20 ${GOLD_PRIMARY_LIGHT_HOVER}`}
            >
              Join the Community
            </a>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}

export default PreviousEvents
