import { useCallback, useEffect, useRef, useState } from 'react'
import { FaDoorOpen, FaUsers } from 'react-icons/fa6'
import mapUrl from '@/assets/images/maps/greekTownMap.svg'
import { linesForRoom, VENUE_ROOMS } from '@/data/2026/venues'

const ICONS = {
  ballroomc: FaUsers,
  ballroomb: FaUsers,
  ballrooma: FaUsers,
}

// Buttons target highlight polygons in greekTownMap.svg. The track is the
// larger line; the room name sits under it.
const AREAS = VENUE_ROOMS.map((room) => {
  const [primary, secondary] = linesForRoom(room)
  return {
    key: room.key,
    primary,
    secondary,
    regionId: room.regionId,
    Icon: ICONS[room.key] ?? FaDoorOpen,
  }
})

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
    const holder = holderRef.current
    if (!holder || !svgMarkup) return undefined
    const handleClick = (event) => {
      const shape = event.target.closest?.('.venue-map-region')
      if (!shape?.id) return
      const area = AREAS.find((item) => item.regionId === shape.id)
      if (!area) return
      event.stopPropagation()
      setActive((current) => (current === area.key ? null : area.key))
    }
    holder.addEventListener('click', handleClick)
    return () => holder.removeEventListener('click', handleClick)
  }, [svgMarkup])

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

  const activeArea = AREAS.find((area) => area.key === active)

  return (
    <section className="w-full py-8" aria-labelledby="venue-maps-heading">
      <h2 id="venue-maps-heading" className="sr-only">
        Venue map
      </h2>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <nav
          aria-label="Highlight a room"
          className="grid shrink-0 grid-cols-2 gap-2 lg:flex lg:w-72 lg:flex-col"
        >
          {AREAS.map(({ key, primary, secondary, Icon }) => {
            const isActive = key === active
            const accessibleName = `${primary}, ${secondary}`
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleArea(key)}
                aria-pressed={isActive}
                aria-label={accessibleName}
                title={accessibleName}
                className={`group/area relative flex w-full items-center justify-start gap-3 rounded-xl border p-3 text-left font-bold transition-all duration-300 active:scale-95 lg:p-4 ${
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
                <span className="min-w-0 leading-tight">
                  <span
                    className={`block text-base lg:text-lg ${
                      key === 'salond' ? 'max-w-[16ch] lg:max-w-none' : ''
                    }`}
                  >
                    {primary}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs font-semibold uppercase tracking-wide lg:text-sm ${
                      isActive ? 'text-iwd-gold-100' : 'text-gray-300'
                    }`}
                  >
                    {secondary}
                  </span>
                </span>
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
              aria-label="Venue floor plan. Tap a room or choose one from the list to center it. Arrow keys pan. Home shows the full plan."
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
            {!active && (
              <p className="pointer-events-none absolute inset-x-3 top-3 z-10 text-center">
                <span className="venue-map-tip inline-block rounded-full bg-black/80 px-3 py-1.5 text-sm font-medium">
                  Tap a room on the map to zoom in
                </span>
              </p>
            )}
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {activeArea
              ? `Highlighting ${activeArea.primary}, ${activeArea.secondary}, centered on the map`
              : 'Showing the full floor plan'}
          </p>
        </div>
      </div>
    </section>
  )
}

export default VenueMaps
