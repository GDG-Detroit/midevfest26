import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import HeroAnimationContext from '@/contexts/heroAnimationContextCore'

/** Matches Navbar mobile menu breakpoint (desktop nav at min-[1500px]). */
const NARROW_VIEWPORT_QUERY = '(max-width: 1499px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function readIsNarrowViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(NARROW_VIEWPORT_QUERY).matches
}

function readPrefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

export default function HeroAnimationProvider({ children }) {
  /** Explicit user preference; independent of system/layout overrides. */
  const [userWantsPlaying, setUserWantsPlaying] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isNarrowViewport, setIsNarrowViewport] = useState(readIsNarrowViewport)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    readPrefersReducedMotion
  )

  useLayoutEffect(() => {
    const narrowMq = window.matchMedia(NARROW_VIEWPORT_QUERY)
    const motionMq = window.matchMedia(REDUCED_MOTION_QUERY)

    const sync = () => {
      setIsNarrowViewport(narrowMq.matches)
      setPrefersReducedMotion(motionMq.matches)
    }

    sync()
    narrowMq.addEventListener('change', sync)
    motionMq.addEventListener('change', sync)
    return () => {
      narrowMq.removeEventListener('change', sync)
      motionMq.removeEventListener('change', sync)
    }
  }, [])

  const canControlPlayback = useMemo(
    () => !prefersReducedMotion && !isNarrowViewport && !mobileNavOpen,
    [prefersReducedMotion, isNarrowViewport, mobileNavOpen]
  )

  const shouldPlay = useMemo(
    () =>
      userWantsPlaying &&
      !prefersReducedMotion &&
      !isNarrowViewport &&
      !mobileNavOpen,
    [userWantsPlaying, prefersReducedMotion, isNarrowViewport, mobileNavOpen]
  )

  const toggleUserPlayback = useCallback(() => {
    setUserWantsPlaying((prev) => !prev)
  }, [])

  const value = useMemo(
    () => ({
      shouldPlay,
      userWantsPlaying,
      setUserWantsPlaying,
      toggleUserPlayback,
      canControlPlayback,
      prefersReducedMotion,
      setMobileNavOpen,
      isNarrowViewport,
      mobileNavOpen,
    }),
    [
      shouldPlay,
      userWantsPlaying,
      toggleUserPlayback,
      canControlPlayback,
      prefersReducedMotion,
      isNarrowViewport,
      mobileNavOpen,
    ]
  )

  return (
    <HeroAnimationContext.Provider value={value}>
      {children}
    </HeroAnimationContext.Provider>
  )
}

HeroAnimationProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
