import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import HeroAnimationContext from '@/contexts/heroAnimationContextCore'

/** Matches Navbar mobile menu breakpoint (desktop nav at min-[1500px]). */
const NARROW_VIEWPORT_QUERY = '(max-width: 1499px)'

export default function HeroAnimationProvider({ children }) {
  const [userPlaying, setUserPlaying] = useState(null)
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

  const shouldPlay = useMemo(() => {
    if (mobileNavOpen) return false
    if (prefersReducedMotion) return false
    if (isNarrowViewport) return false
    if (userPlaying !== null) return userPlaying
    return true
  }, [mobileNavOpen, prefersReducedMotion, isNarrowViewport, userPlaying])

  const value = useMemo(
    () => ({
      shouldPlay,
      setUserPlaying,
      setMobileNavOpen,
      isNarrowViewport,
      mobileNavOpen,
    }),
    [shouldPlay, isNarrowViewport, mobileNavOpen]
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
