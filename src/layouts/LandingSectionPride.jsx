import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { FaArrowRight } from 'react-icons/fa6'
import CTAButton from '@/components/ui/CTAButton'
import { createPrideTrailScene } from './prideTrailScene'
import useHeroAnimation from '@/hooks/useHeroAnimation'
import heroTrails from '@/assets/images/hero/hero-trails.webp'
import heroTrailsFull from '@/assets/images/hero/hero-trails.png'

/** Matches Navbar / HeroAnimationProvider desktop breakpoint. */
const HERO_DESKTOP_MEDIA = '(min-width: 1500px)'

const HERO_LINKS = [
  { href: '#partners', label: 'Call for Sponsors' },
  { href: '#about', label: 'About the Summit' },
  { href: '#schedule', label: 'Schedule' },
]

function PrideHeroForeground() {
  return (
    <div className="relative z-10 flex min-h-[90vh] w-full items-center justify-center px-4 py-24 pt-28 sm:px-6">
      <div
        className="bg-pride-hero-glass mx-auto w-full max-w-3xl rounded-2xl px-6 py-10 text-center sm:px-10 sm:py-12"
        role="group"
        aria-labelledby="pride-hero-title"
      >
        {/* Top metadata */}
        <p className="font-body text-[10px] font-semibold uppercase tracking-[0.35em] text-white/55 sm:text-xs">
          Detroit &middot; IBM HQ &middot; 2026 &middot; Powered by Compass
          Detroit &amp; IBM
        </p>

        {/* Main title */}
        <h1
          id="pride-hero-title"
          className="font-heading mt-6 text-3xl font-black uppercase leading-[1.05] tracking-tight text-white sm:mt-8 sm:text-4xl md:text-5xl lg:text-[3.25rem]"
        >
          Detroit Pride{' '}
          <span className="mt-2 block text-xl normal-case text-iwd-gold-400 font-heading sm:text-2xl md:text-3xl lg:text-4xl">
            Innovation Summit
          </span>
        </h1>

        {/* Subheading */}
        <p className="font-body mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-iwd-gold-300/90 sm:text-sm">
          Registration opens soon
        </p>

        {/* Primary CTAs */}
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
          <CTAButton
            href="mailto:registration@compassdetroit.org"
            label="Register Now"
            target="_blank"
            rel="noopener noreferrer"
            ariaLabel="Register for the Detroit Pride Innovation Summit (link coming soon)"
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
            ariaLabel="Become a sponsor for the Detroit Pride Innovation Summit"
            className="w-full min-w-48 border-iwd-gold-400/40 text-white sm:w-auto dark:border-iwd-gold-400/40 dark:text-white dark:hover:text-white"
            icon={<FaArrowRight />}
            iconPosition="right"
          />
        </div>

        {/* Venue callout */}
        <p className="font-body mt-6 text-[11px] uppercase tracking-[0.2em] text-white/45 sm:text-xs">
          Venue:{' '}
          <span className="inline-block rounded border border-iwd-gold-400/35 bg-white/[0.04] px-2 py-0.5 font-semibold tracking-[0.15em] text-iwd-gold-300/90">
            IBM HQ
          </span>
        </p>

        {/* Description */}
        <p className="font-body mx-auto mt-6 max-w-xl text-base leading-relaxed text-white">
          A day of learning, building, and connecting for LGBTQ+ innovators and
          allies in Detroit&apos;s tech ecosystem — hosted at IBM HQ with
          workshops, talks, and community.
        </p>

        {/* Footer links */}
        <nav
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          aria-label="Hero quick links"
        >
          {HERO_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full border border-iwd-gold-400/30 bg-white/[0.03] px-4 py-2 font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-iwd-gold-400/50 hover:bg-white/[0.06] hover:text-white sm:text-[11px]"
            >
              {link.label}
            </a>
          ))}
        </nav>
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
 * Hero section with the animated pride trail WebGL background.
 * Optional `children` render below the built-in foreground card.
 */
function LandingSectionPride({
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

    const scene = createPrideTrailScene(host, { showDebugGUI })
    sceneRef.current = scene

    const syncPlayback = () => {
      const tabVisible = document.visibilityState === 'visible'
      scene.setPlaying(tabVisible && heroInViewRef.current)
    }

    const intersectionObserver =
      heroEl &&
      new IntersectionObserver(
        ([entry]) => {
          heroInViewRef.current = entry.isIntersecting
          syncPlayback()
        },
        { root: null, rootMargin: '0px', threshold: 0.05 }
      )

    if (intersectionObserver && heroEl) {
      intersectionObserver.observe(heroEl)
    }

    const onVisibilityChange = () => syncPlayback()
    document.addEventListener('visibilitychange', onVisibilityChange)
    syncPlayback()

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      intersectionObserver?.disconnect()
      scene.dispose()
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

      <PrideHeroForeground />
      {children ? <div className="relative z-10">{children}</div> : null}
    </section>
  )
}

LandingSectionPride.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  showDebugGUI: PropTypes.bool,
}

export default LandingSectionPride
