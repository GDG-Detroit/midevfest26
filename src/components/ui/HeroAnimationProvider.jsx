import { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import HeroAnimationContext from '@/contexts/heroAnimationContextCore'

/** Matches Navbar mobile menu breakpoint (desktop nav at min-[1500px]). */
const NARROW_VIEWPORT_QUERY = '(max-width: 1499px)'

export default function HeroAnimationProvider({ children }) {
  /** Explicit user preference; independent of system/layout overrides. */
  const [userWantsPlaying, setUserWantsPlaying] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isNarrowViewport, setIsNarrowViewport] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const narrowMq = window.matchMedia(NARROW_VIEWPORT_QUERY)
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')

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
    () =>
      !prefersReducedMotion && !isNarrowViewport && !mobileNavOpen,
    [prefersReducedMotion, isNarrowViewport, mobileNavOpen]
  )

  const shouldPlay = useMemo(
    () =>
      userWantsPlaying &&
      !prefersReducedMotion &&
      !isNarrowViewport &&
      !mobileNavOpen,
    [
      userWantsPlaying,
      prefersReducedMotion,
      isNarrowViewport,
      mobileNavOpen,
    ]
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
