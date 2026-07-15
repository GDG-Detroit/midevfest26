import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FaBriefcase,
  FaClipboardCheck,
  FaFilm,
  FaPizzaSlice,
  FaSpa,
  FaStore,
  FaUtensils,
} from 'react-icons/fa6'
import lcMapUrl from '@/assets/images/maps/lcMap.svg'

// Each button maps to a highlight region group in lcMap.svg.
// Text labels live in separate *-GROUP ids (PIZZATREAT, HOTNREADY, etc.).
const AREAS = [
  {
    key: 'checkin',
    label: 'Check-In',
    regionId: 'CHECKINLABEL',
    Icon: FaClipboardCheck,
  },
  {
    key: 'yoga',
    label: 'Yoga',
    regionId: 'YOGA',
    Icon: FaSpa,
  },
  {
    key: 'food',
    label: 'Food',
    regionId: 'FOOD',
    Icon: FaUtensils,
  },
  {
    key: 'pizzatreat',
    label: 'Pizza Treat',
    regionId: 'PIZZATREAT',
    Icon: FaPizzaSlice,
    badge: 'PT',
  },
  {
    key: 'pizzapizza',
    label: 'Pizza Pizza',
    regionId: 'PIZZAPIZZA',
    Icon: FaPizzaSlice,
    badge: 'PP',
  },
  {
    key: 'hotnready',
    label: 'Hot-N-Ready',
    regionId: 'HOTNREADY',
    Icon: FaPizzaSlice,
    badge: 'HR',
  },
  {
    key: 'reservenready',
    label: 'Reserve-N-Ready',
    regionId: 'RESERVENREADY',
    Icon: FaPizzaSlice,
    badge: 'RR',
  },
  {
    key: 'familytheater',
    label: 'Family Theater',
    regionId: 'FAMILYTHEATER',
    Icon: FaFilm,
  },
  {
    key: 'careers',
    label: 'Careers',
    regionId: 'CAREERS',
    Icon: FaBriefcase,
  },
  {
    key: 'booths',
    label: 'Booths',
    regionId: 'BOOTHS',
    Icon: FaStore,
  },
]

function isValidSvgResponse(contentType, text) {
  if (contentType && /text\/html/i.test(contentType)) return false

  const trimmed = text.trim()
  if (!trimmed) return false

  const withoutProlog = trimmed
    .replace(/^<\?xml[^>]*\?>\s*/i, '')
    .replace(/^<!DOCTYPE[^>]*>\s*/i, '')
  return /^<svg[\s>]/i.test(withoutProlog)
}

function getScrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
}

function VenueMaps() {
  const scrollRef = useRef(null)
  const holderRef = useRef(null)
  const [svgMarkup, setSvgMarkup] = useState(null)
  const [active, setActive] = useState(null)

  // Load the SVG as inline markup so its named regions become targetable DOM.
  useEffect(() => {
    let cancelled = false
    fetch(lcMapUrl)
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
      .catch((err) => {
        console.error('VenueMaps: error loading inline SVG', err)
        if (!cancelled) setSvgMarkup(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const getRegionShapes = useCallback((regionId) => {
    const holder = holderRef.current
    if (!holder) {
      console.warn('getRegionShapes: holderRef.current is null')
      return []
    }
    const element = holder.querySelector(`#${CSS.escape(regionId)}`)
    if (!element) {
      console.warn(
        `getRegionShapes: Element with id="${regionId}" not found in holder`
      )
      return []
    }
    if (element.matches('rect, path')) {
      return [element]
    }
    const firstShape = element.querySelector('rect, path')
    if (firstShape) {
      return [firstShape]
    }
    console.warn(
      `getRegionShapes: Group with id="${regionId}" contains no rect or path elements`
    )
    return []
  }, [])

  const scrollRegionIntoView = useCallback((shape) => {
    const container = scrollRef.current
    if (!container || !shape) return
    const cRect = container.getBoundingClientRect()
    const rRect = shape.getBoundingClientRect()
    const left =
      rRect.left -
      cRect.left +
      container.scrollLeft -
      (container.clientWidth - rRect.width) / 2
    container.scrollTo({
      left,
      behavior: getScrollBehavior(),
    })
  }, [])

  // Reflect the active selection on the SVG and bring it into view.
  useEffect(() => {
    if (!svgMarkup) return
    let activeShape = null
    AREAS.forEach(({ key, regionId }) => {
      const isActive = key === active
      getRegionShapes(regionId).forEach((shape) => {
        // Ensure the base class and style cleanup are always applied
        shape.classList.add('venue-map-region')
        shape.style.fill = ''

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
      const scrollBehavior = getScrollBehavior()
      if (e.key === 'Home') {
        e.preventDefault()
        el.scrollTo({ left: 0, behavior: scrollBehavior })
      } else if (e.key === 'End') {
        e.preventDefault()
        el.scrollTo({
          left: el.scrollWidth - el.clientWidth,
          behavior: scrollBehavior,
        })
      }
    }
    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [svgMarkup])

  // Handle clicking off of the buttons to deactivate
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!active) return
      // If the click is not on one of our map buttons, clear the active selection
      const clickedMapButton = e.target
        .closest('button')
        ?.classList.contains('group/area')
      if (!clickedMapButton) {
        setActive(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [active])

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
          {AREAS.map(({ key, label, sublabel, Icon, badge }) => {
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
                className={`group/area relative flex items-center justify-center gap-3 rounded-xl border p-3 font-bold transition-all duration-300 active:scale-95 lg:justify-start lg:p-4 ${
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
                {badge && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded bg-iwd-gold-400 px-1 font-mono text-[8px] font-black uppercase text-black ring-1 ring-black/20 lg:hidden">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Map */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 rounded-xl border-4 border-iwd-gold-500 bg-white">
            <div
              ref={scrollRef}
              className="scrollbar-visible w-full overflow-x-auto overflow-y-hidden scroll-smooth rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-iwd-gold-100 motion-reduce:scroll-auto"
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
                  src={lcMapUrl}
                  alt="Venue floor plan"
                  className="block h-[573px] w-[2092px] max-w-none"
                  loading="lazy"
                />
              )}
            </div>
          </div>

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
