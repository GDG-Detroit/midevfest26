import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { FaArrowRight } from 'react-icons/fa6'
import CTAButton from '@/components/ui/CTAButton'
import { generateICSFile } from '@/utils/calendarExport'
import useHeroAnimation from '@/hooks/useHeroAnimation'
import heroTrails from '@/assets/images/hero/hero-trails.webp'
import heroTrailsFull from '@/assets/images/hero/hero-trails.webp'
import heroTrailsMobile from '@/assets/images/hero/hero-trails-x1350.webp'
import logo from '@/assets/images/midevfestlogo.svg'

/** Matches Navbar / HeroAnimationProvider desktop breakpoint. */
const HERO_DESKTOP_MEDIA = '(min-width: 1500px)'
/** Portrait crop swaps in below the desktop breakpoint, down to small phones. */
const HERO_MOBILE_MEDIA = '(max-width: 767px)'

const HERO_LINKS = [
  { href: '#partners', label: 'Call for Sponsors' },
  { href: '#about', label: 'About the DevFest' },
  { href: '#schedule', label: 'Schedule' },
]

/**
 * Save-the-date calendar entries, one per event day.
 *
 * Registration isn't open, so the hero has no URL to send anyone to — a
 * calendar download gives the primary CTA something real to do in the meantime
 * and can't rot the way a placeholder link does.
 *
 * `timezoneOffset` is set explicitly because calendarExport defaults to -04:00
 * (EDT), and these dates fall after DST ends on 2026-11-01, so Detroit is on
 * EST. Inheriting the default would shift every entry an hour early.
 */
const SAVE_THE_DATE = ['2026-11-13', '2026-11-14'].map((eventDate, index) => ({
  title: `Michigan DevFest & AI Hackathon (Day ${index + 1})`,
  description:
    'Michigan DevFest & AI Hackathon at the Little Caesars HQ, Detroit. Full schedule and registration to be announced.',
  location: 'Little Caesars HQ, Detroit, MI',
  time: '9:00 am - 5:00 pm',
  eventDate,
  timezoneOffset: '-05:00',
}))

function HeroForeground() {
  return (
    <div className="relative z-10 flex min-h-[90vh] w-full items-center justify-center px-4 py-24 pt-28 sm:px-6">
      <div className="bg-pride-hero-glass mx-auto w-full max-w-5xl rounded-3xl px-6 py-10 sm:px-10 sm:py-12">
        <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-center md:gap-12 md:text-left">
          <div className="flex w-full shrink-0 justify-center px-10 md:w-2/5">
            <img
              src={logo}
              alt="Michigan DevFest"
              width={512}
              height={512}
              decoding="async"

              className="aspect-square w-full max-w-[220px] sm:max-w-[260px] md:max-w-none"
            />
          </div>

          <div
            className="w-full md:w-3/5"
            role="group"
            aria-labelledby="main-heading"
          >
            {/* Top metadata */}
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.35em] text-white/75 sm:text-xs">
              Detroit &middot; 2026 <br /> Powered by Compass Detroit &amp;
              Little Caesars HQ
            </p>

            {/* Main title */}
            <h1
              id="main-heading"
              className="mt-6 font-heading text-3xl font-black uppercase leading-[1.05] tracking-tight text-white sm:mt-8 sm:text-4xl md:text-5xl lg:text-[3.25rem]"
            >
              Michigan{' '}
              <span className="mt-2 block font-heading text-xl normal-case text-iwd-gold-400 sm:text-2xl md:text-3xl lg:text-4xl">
                DevFest &amp; AI Hackathon
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-5 font-body text-xs font-semibold uppercase tracking-[0.3em] text-iwd-gold-300/90 sm:text-base">
              Registration opens soon
            </p>

            {/* Primary CTAs */}
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5 md:justify-start">
              <CTAButton
                onClick={() =>
                  generateICSFile(SAVE_THE_DATE, {
                    filename: 'michigan-devfest-2026-save-the-date.ics',
                  })
                }
                label="Register Now"
                ariaLabel="Register for Michigan DevFest, November 13 to 14, 2026"
                className="w-full min-w-48 sm:w-auto"
                icon={<FaArrowRight />}
                iconPosition="right"
              />

              <CTAButton
                href="mailto:sponsors@compassdetroit.org"
                label="Become a Sponsor"
                variant="secondary"
                target="_blank"
                rel="noopener noreferrer"
                ariaLabel="Become a sponsor for Michigan DevFest"
                className="w-full min-w-48 border-iwd-gold-400/40 text-white sm:w-auto dark:border-iwd-gold-400/40 dark:text-white dark:hover:text-white"
                icon={<FaArrowRight />}
                iconPosition="right"
              />
            </div>

            {/* Venue callout */}
            <p className="mt-6 font-body text-[11px] uppercase tracking-[0.2em] text-white/90 sm:text-xs">
              Venue:{' '}
              <span className="inline-block rounded border border-iwd-gold-400 bg-white/[0.04] px-2 py-0.5 font-semibold uppercase tracking-[0.15em] text-iwd-gold-300">
                Little Caesars HQ
              </span>
            </p>

            {/* Description */}
            <p className="mx-auto mt-6 max-w-xl font-body text-base leading-relaxed text-white md:mx-0">
              Two days of learning, building, and connecting for innovators
              across Detroit&apos;s tech ecosystem — hosted at Little Caesars HQ
              with workshops, talks, and community.
            </p>

            {/* Footer links */}
            <nav className="mt-8" aria-label="Hero quick links">
              <ul className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                {HERO_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="rounded-full border border-iwd-gold-400/30 bg-white/[0.03] px-4 py-2 font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-iwd-gold-400/50 hover:bg-white/[0.06] hover:text-white sm:text-[11px]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Static frame shown whenever WebGL animation is not running. */
function PrideHeroStaticBackground() {
  return (
    <div className="absolute inset-0 z-0 bg-black" aria-hidden="true">
      <picture className="block size-full">
        <source media={HERO_DESKTOP_MEDIA} srcSet={heroTrailsFull} />
        <source media={HERO_MOBILE_MEDIA} srcSet={heroTrailsMobile} />
        <img
          src={heroTrails}
          alt=""
          width={800}
          height={279}
          className="size-full object-cover object-center"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </div>
  )
}

/**
 * Hero section with the animated WebGL background.
 * Optional `children` render below the built-in foreground card.
 */
function LandingSectionHero({
  children,
  className = '',
  showDebugGUI = import.meta.env.DEV,
}) {
  const canvasHostRef = useRef(null)
  const heroSectionRef = useRef(null)
  const sceneRef = useRef(null)
  const heroInViewRef = useRef(true)
  const {
    shouldPlay,
    userWantsPlaying,
    toggleUserPlayback,
    canControlPlayback,
  } = useHeroAnimation()
  const showAnimatedBackground = shouldPlay

  useEffect(() => {
    if (!showAnimatedBackground) return undefined

    const host = canvasHostRef.current
    const heroEl = heroSectionRef.current
    if (!host) return undefined

    let cancelled = false
    let scene = null
    let intersectionObserver = null

    const syncPlayback = () => {
      if (!scene) return
      const tabVisible = document.visibilityState === 'visible'
      scene.setPlaying(tabVisible && heroInViewRef.current)
    }

    const onVisibilityChange = () => syncPlayback()

    import('./heroScene').then(({ createHeroScene }) => {
      if (cancelled) return

      scene = createHeroScene(host, { showDebugGUI })
      sceneRef.current = scene

      if (heroEl) {
        intersectionObserver = new IntersectionObserver(
          ([entry]) => {
            heroInViewRef.current = entry.isIntersecting
            syncPlayback()
          },
          { root: null, rootMargin: '0px', threshold: 0.05 }
        )
        intersectionObserver.observe(heroEl)
      }

      document.addEventListener('visibilitychange', onVisibilityChange)
      syncPlayback()
    })

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      intersectionObserver?.disconnect()
      scene?.dispose()
      sceneRef.current = null
    }
  }, [showDebugGUI, showAnimatedBackground])

  return (
    <section
      ref={heroSectionRef}
      id="hero-pride"
      aria-label="Hero Section"
      className={`relative min-h-[90vh] w-full overflow-hidden bg-black ${className}`}
    >
      {showAnimatedBackground ? (
        <div
          ref={canvasHostRef}
          className="absolute inset-0 z-0"
          aria-hidden="true"
        />
      ) : (
        <PrideHeroStaticBackground />
      )}

      {canControlPlayback ? (
        <button
          type="button"
          onClick={toggleUserPlayback}
          className="absolute bottom-6 right-6 z-30 flex size-12 items-center justify-center rounded-full border border-white/40 bg-black/60 text-white shadow-2xl backdrop-blur-lg transition-all hover:scale-110 hover:bg-black/80 lg:bottom-12 lg:right-12"
          aria-pressed={userWantsPlaying}
          aria-label={
            userWantsPlaying
              ? 'Pause background animation'
              : 'Play background animation'
          }
        >
          {userWantsPlaying ? (
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      ) : null}

      <HeroForeground />
      {children ? <div className="relative z-10">{children}</div> : null}
    </section>
  )
}

LandingSectionHero.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  showDebugGUI: PropTypes.bool,
}

export default LandingSectionHero
