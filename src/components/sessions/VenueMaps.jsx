import { useCallback, useEffect, useRef, useState } from 'react'
import { FaChalkboardUser, FaClipboardCheck, FaUtensils } from 'react-icons/fa6'
import ibmHqMapUrl from '@/assets/images/maps/map-ibm-hq.svg'

// Each button maps to a highlight region group in map-ibm-hq.svg.
// Text labels live in separate *-GROUP ids (RESTROOMS-GROUP, KITCHEN-GROUP, etc.).
const AREAS = [
  {
    key: 'classroom',
    label: 'Classroom',
    sublabel: 'Level Up · Rooms 2415 & 2416',
    regionId: 'LEVEL-UP-CLASSROM',
    Icon: FaChalkboardUser,
  },
  {
    key: 'kitchen',
    label: 'Kitchen',
    regionId: 'KITCHEN',
    Icon: FaUtensils,
  },
  {
    key: 'checkin',
    label: 'Check-In',
    regionId: 'CHECKIN',
    Icon: FaClipboardCheck,
  },
]

function isValidSvgResponse(contentType, text) {
  if (contentType && /text\/html/i.test(contentType)) return false

  const trimmed = text.trim()
  if (!trimmed) return false

  const withoutXmlDecl = trimmed.replace(/^<\?xml[^>]*\?>\s*/i, '')
  return /^<svg[\s>]/i.test(withoutXmlDecl)
}

function VenueMaps() {
  const scrollRef = useRef(null)
  const holderRef = useRef(null)
  const [svgMarkup, setSvgMarkup] = useState(null)
  const [active, setActive] = useState(null)

  // Load the SVG as inline markup so its named regions become targetable DOM.
  useEffect(() => {
    let cancelled = false
    fetch(ibmHqMapUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`SVG fetch failed with status ${res.status}`)
        }
        const contentType = res.headers.get('content-type') ?? ''
        const text = await res.text()
        if (!isValidSvgResponse(contentType, text)) {
          throw new Error('SVG fetch returned unexpected content')
        }
        return text
      })
      .then((text) => {
        if (!cancelled) setSvgMarkup(text)
      })
      .catch(() => {
        if (!cancelled) setSvgMarkup(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const getRegionShapes = useCallback((regionId) => {
    const holder = holderRef.current
    if (!holder) return []
    const group = holder.querySelector(`#${CSS.escape(regionId)}`)
    if (!group) return []
    return Array.from(group.querySelectorAll('rect, path'))
  }, [])

  // Prime highlight shapes once the inline SVG is in the DOM.
  useEffect(() => {
    if (!svgMarkup) return
    AREAS.forEach(({ regionId }) => {
      getRegionShapes(regionId).forEach((shape) => {
        shape.classList.add('venue-map-region')
        // Authored shapes carry inline fill:none; clear so CSS drives the fill.
        shape.style.fill = ''
      })
    })
  }, [svgMarkup, getRegionShapes])

  const scrollRegionIntoView = useCallback((shape) => {
    const container = scrollRef.current
    if (!container || !shape) return
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const cRect = container.getBoundingClientRect()
    const rRect = shape.getBoundingClientRect()
    const left =
      rRect.left -
      cRect.left +
      container.scrollLeft -
      (container.clientWidth - rRect.width) / 2
    const top =
      rRect.top -
      cRect.top +
      container.scrollTop -
      (container.clientHeight - rRect.height) / 2
    container.scrollTo({
      left,
      top,
      behavior: prefersReduced ? 'auto' : 'smooth',
    })
  }, [])

  // Reflect the active selection on the SVG and bring it into view.
  useEffect(() => {
    if (!svgMarkup) return
    let activeShape = null
    AREAS.forEach(({ key, regionId }) => {
      const isActive = key === active
      getRegionShapes(regionId).forEach((shape) => {
        shape.classList.toggle('is-active', isActive)
        if (isActive && !activeShape) activeShape = shape
      })
    })
    if (activeShape) scrollRegionIntoView(activeShape)
  }, [active, svgMarkup, getRegionShapes, scrollRegionIntoView])

  // Keyboard helpers for the scroll region (parity with prior behaviour).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    const handleKeyDown = (e) => {
      if (e.key === 'Home') {
        e.preventDefault()
        el.scrollTo({ left: 0, top: 0, behavior: 'smooth' })
      } else if (e.key === 'End') {
        e.preventDefault()
        el.scrollTo({
          left: el.scrollWidth - el.clientWidth,
          top: el.scrollHeight - el.clientHeight,
          behavior: 'smooth',
        })
      }
    }
    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [svgMarkup])

  const toggleArea = (key) => setActive((cur) => (cur === key ? null : key))

  const activeLabel = AREAS.find((a) => a.key === active)?.label

  return (
    <section className="w-full py-8" aria-labelledby="venue-maps-heading">
      <h2 id="venue-maps-heading" className="sr-only">
        Venue map
      </h2>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Area buttons: icon-only row on mobile, labelled column on desktop */}
        <nav
          aria-label="Highlight a venue area"
          className="flex shrink-0 flex-row flex-wrap justify-center gap-2 lg:w-72 lg:flex-col lg:justify-start"
        >
          {AREAS.map(({ key, label, sublabel, Icon }) => {
            const isActive = key === active
            const accessibleName = sublabel ? `${label}, ${sublabel}` : label
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleArea(key)}
                aria-pressed={isActive}
                aria-label={accessibleName}
                title={accessibleName}
                className={`group/area flex items-center justify-center gap-3 rounded-xl border p-3 font-bold transition-all duration-300 active:scale-95 lg:justify-start lg:p-4 ${
                  isActive
                    ? 'border-iwd-gold-400/60 bg-iwd-gold-400/15 text-iwd-gold-200 shadow-[0_0_14px_rgba(255,208,174,0.25)]'
                    : 'border-white/10 bg-white/[0.03] text-white hover:border-iwd-gold-400/30 hover:bg-iwd-gold-400/10'
                }`}
              >
                <Icon
                  className={`size-6 shrink-0 transition-transform duration-300 lg:size-7 ${
                    isActive
                      ? 'scale-110 text-iwd-gold-400 drop-shadow-[0_0_8px_rgba(255,208,174,0.5)]'
                      : 'text-gray-400 group-hover/area:scale-110 group-hover/area:text-iwd-gold-300'
                  }`}
                  aria-hidden="true"
                />
                <span className="hidden text-left leading-snug lg:block">
                  <span className="block text-lg">{label}</span>
                  {sublabel && (
                    <span
                      className={`mt-1.5 block text-sm font-semibold uppercase leading-snug tracking-wide ${
                        isActive ? 'text-iwd-gold-100' : 'text-gray-100'
                      }`}
                    >
                      {sublabel}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Map */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 rounded-xl border-4 border-iwd-gold-500">
            <div
              ref={scrollRef}
              className="scrollbar-visible max-h-[60vh] w-full overflow-auto scroll-smooth rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-iwd-gold-100 lg:max-h-[640px]"
              tabIndex={0}
              role="region"
              aria-label="Scrollable venue map"
            >
              {svgMarkup ? (
                <div
                  ref={holderRef}
                  className="venue-map-svg"
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />
              ) : (
                <img
                  src={ibmHqMapUrl}
                  alt="Venue floor plan"
                  className="block w-full"
                  loading="lazy"
                />
              )}
            </div>
          </div>

          <p className="py-2 text-center text-sm font-bold dark:text-neutral-50">
            Tap an area to highlight it on the map. Tap again to clear.
          </p>

          <p className="sr-only" role="status" aria-live="polite">
            {activeLabel
              ? `Highlighting ${activeLabel}`
              : 'No area highlighted'}
          </p>
        </div>
      </div>
    </section>
  )
}

export default VenueMaps
