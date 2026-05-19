import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { createPrideTrailScene } from './prideTrailScene'

/**
 * Hero section with the animated pride trail WebGL background.
 * Drop `children` on top for copy, CTAs, etc. (same pattern as LandingSection).
 */
function LandingSectionPride({
  children,
  className = '',
  showDebugGUI = import.meta.env.DEV,
}) {
  const canvasHostRef = useRef(null)

  useEffect(() => {
    const host = canvasHostRef.current
    if (!host) return undefined

    const scene = createPrideTrailScene(host, { showDebugGUI })
    return () => scene.dispose()
  }, [showDebugGUI])

  return (
    <section
      id="hero-pride"
      aria-label="Hero Section"
      className={`relative min-h-[90vh] w-full overflow-hidden bg-black ${className}`}
    >
      <div
        ref={canvasHostRef}
        className="absolute inset-0 z-0"
        aria-hidden="true"
      />
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
