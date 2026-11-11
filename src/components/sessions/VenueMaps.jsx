import { useCallback, useEffect, useRef, useState } from 'react'
import { FaBriefcase, FaDoorOpen, FaUsers } from 'react-icons/fa6'
import mapUrl from '@/assets/images/maps/greekTownMap.svg'

// Buttons target highlight polygons in greekTownMap.svg (Greektown conference
// center). Session tracks are not assigned to rooms yet, so navigation is by room.
const AREAS = [
  {
    key: 'grandballroom',
    label: 'Grand Ballroom',
    regionId: 'GRANDBALLROOM',
    Icon: FaUsers,
    badge: 'GB',
  },
  {
    key: 'salona',
    label: 'Salon A',
    regionId: 'SALONA',
    Icon: FaDoorOpen,
    badge: 'A',
  },
  {
    key: 'salonb',
    label: 'Salon B',
    regionId: 'SALONB',
    Icon: FaDoorOpen,
    badge: 'B',
  },
  {
    key: 'salonc',
    label: 'Salon C',
    regionId: 'SALONC',
    Icon: FaDoorOpen,
    badge: 'C',
  },
  {
    key: 'salond',
    label: 'Salon D',
    regionId: 'SALOND',
    Icon: FaDoorOpen,
    badge: 'D',
  },
  {
    key: 'salone',
    label: 'Salon E',
    regionId: 'SALONE',
    Icon: FaDoorOpen,
    badge: 'E',
  },
  {
    key: 'salonf',
    label: 'Salon F',
    regionId: 'SALONF',
    Icon: FaDoorOpen,
    badge: 'F',
  },
  {
    key: 'boardroom',
    label: 'Executive Boardroom',
    regionId: 'BOARDROOM',
    Icon: FaBriefcase,
    badge: 'EX',
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

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function svgSize(svg) {
  const box = svg.viewBox?.baseVal
  if (box?.width && box?.height) return { w: box.width, h: box.height }
  return {
    w: svg.width?.baseVal?.value || 536,
    h: svg.height?.baseVal?.value || 270,
  }
}

/** Fit the whole plan in the viewport, or zoom so a room sits in the center. */
function computeView(container, svg, shape) {
  const cw = container.clientWidth
  const ch = container.clientHeight
  if (!cw || !ch || !svg) return null

  const { w: svgW, h: svgH } = svgSize(svg)
  const fit = Math.min(cw / svgW, ch / svgH)

  if (!shape) {
    return {
      scale: fit,
      x: (cw - svgW * fit) / 2,
      y: (ch - svgH * fit) / 2,
    }
  }

  const box = shape.getBBox()
  const pad = 1.45
  const roomScale = Math.min(
    cw / Math.max(box.width * pad, 1),
    ch / Math.max(box.height * pad, 1)
  )
  const scale = Math.min(Math.max(roomScale, fit), fit * 4.5)
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  return {
    scale,
    x: cw / 2 - cx * scale,
    y: ch / 2 - cy * scale,
  }
}

function VenueMaps() {
  const scrollRef = useRef(null)
  const frameRef = useRef(null)
  const holderRef = useRef(null)
  const viewRef = useRef(null)
  const [svgMarkup, setSvgMarkup] = useState(null)
  const [active, setActive] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(mapUrl)
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
    if (!holder) return []
    const element = holder.querySelector(`#${CSS.escape(regionId)}`)
    if (!element) return []
    if (element.matches('rect, path, polygon')) return [element]
    const shapes = element.querySelectorAll('rect, path, polygon')
    return shapes.length ? [...shapes] : []
  }, [])

  const applyView = useCallback((view) => {
    const frame = frameRef.current
    if (!frame || !view) return
    viewRef.current = view
    frame.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
  }, [])

  const focusView = useCallback(
    (shape) => {
      const container = scrollRef.current
      const svg = holderRef.current?.querySelector('svg')
      if (!container || !svg) return
      applyView(computeView(container, svg, shape))
    },
    [applyView]
  )

  useEffect(() => {
    if (!svgMarkup) return
    let activeShape = null
    AREAS.forEach(({ key, regionId }) => {
      const isActive = key === active
      getRegionShapes(regionId).forEach((shape) => {
        shape.classList.add('venue-map-region')
        shape.classList.toggle('is-active', isActive)
        if (isActive && !activeShape) activeShape = shape
      })
    })
    focusView(activeShape)
  }, [active, svgMarkup, getRegionShapes, focusView])

  useEffect(() => {
    const container = scrollRef.current
    if (!container || !svgMarkup) return undefined
    const observer = new ResizeObserver(() => {
      const area = AREAS.find((item) => item.key === active)
      const shape = area ? getRegionShapes(area.regionId)[0] : null
      focusView(shape || null)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [active, svgMarkup, getRegionShapes, focusView])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !svgMarkup) return undefined
    const handleKeyDown = (e) => {
      if (e.key === 'Home') {
        e.preventDefault()
        setActive(null)
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        setActive(AREAS[AREAS.length - 1].key)
        return
      }
      const step = prefersReducedMotion() ? 80 : 48
      const pan = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }[e.key]
      if (!pan || !viewRef.current) return
      e.preventDefault()
      const view = viewRef.current
      applyView({
        scale: view.scale,
        x: view.x + pan[0],
        y: view.y + pan[1],
      })
    }
    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [svgMarkup, applyView])

  useEffect(() => {
    if (!active) return undefined
    const handleClickOutside = (e) => {
      const clickedMapButton = e.target
        .closest('button')
        ?.classList.contains('group/area')
      if (!clickedMapButton) setActive(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [active])

  const toggleArea = (key) => setActive((cur) => (cur === key ? null : key))

  const activeLabel = AREAS.find((area) => area.key === active)?.label

  return (
    <section className="w-full py-8" aria-labelledby="venue-maps-heading">
      <h2 id="venue-maps-heading" className="sr-only">
        Venue map
      </h2>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <nav
          aria-label="Highlight a room"
          className="flex shrink-0 flex-row flex-wrap justify-center gap-2 lg:w-72 lg:flex-col lg:justify-start"
        >
          {AREAS.map(({ key, label, Icon, badge }) => {
            const isActive = key === active
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleArea(key)}
                aria-pressed={isActive}
                aria-label={label}
                title={label}
                className={`group/area relative flex items-center justify-center gap-3 rounded-xl border p-3 font-bold transition-all duration-300 active:scale-95 lg:justify-start lg:p-4 ${
                  isActive
                    ? 'border-iwd-gold-400/60 bg-iwd-gold-400/15 text-iwd-gold-200 shadow-[0_0_14px_rgba(var(--iwd-accent-400),0.45)]'
                    : 'border-white/10 bg-white/[0.03] text-white hover:border-iwd-gold-400/30 hover:bg-iwd-gold-400/10'
                }`}
              >
                <Icon
                  className={`size-6 shrink-0 transition-transform duration-300 lg:size-7 ${
                    isActive
                      ? 'scale-110 text-iwd-gold-400 drop-shadow-[0_0_8px_rgba(var(--iwd-accent-400),0.65)]'
                      : 'text-gray-400 group-hover/area:scale-110 group-hover/area:text-iwd-gold-300'
                  }`}
                  aria-hidden="true"
                />
                <span className="hidden text-left text-lg leading-snug lg:block">
                  {label}
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

        <div className="flex min-h-[28rem] min-w-0 flex-1 flex-col lg:min-h-0">
          <div className="relative min-h-[28rem] flex-1 overflow-hidden rounded-xl border-4 border-iwd-gold-500 bg-iwd-dark-50">
            <div
              ref={scrollRef}
              className="absolute inset-1 overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-iwd-dark-50"
              tabIndex={0}
              role="region"
              aria-label="Venue floor plan. Choose a room to center it. Arrow keys pan. Home shows the full plan."
            >
              {svgMarkup ? (
                <div ref={frameRef} className="venue-map-frame">
                  <div
                    ref={holderRef}
                    className="venue-map-svg text-iwd-dark-800"
                    dangerouslySetInnerHTML={{ __html: svgMarkup }}
                  />
                </div>
              ) : (
                <img
                  src={mapUrl}
                  alt="Hollywood Casino at Greektown conference center floor plan"
                  className="size-full object-contain"
                />
              )}
            </div>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {activeLabel
              ? `Highlighting ${activeLabel}, centered on the map`
              : 'Showing the full floor plan'}
          </p>
        </div>
      </div>
    </section>
  )
}

export default VenueMaps
