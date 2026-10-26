import { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

const THUMB_WIDTH = 58
const THUMB_HEIGHT = 29
const KEY_STEP = 96

/**
 * Custom horizontal scrollbar for an overflowing element. The thumb is a
 * rounded "elevator box" with grip lines that is taller than its track.
 * The target keeps native scrolling; this only mirrors and drives scrollLeft.
 */
const TabScrollbar = ({ targetRef, controlsId, label = 'Scroll tracks' }) => {
  const trackRef = useRef(null)
  const dragRef = useRef(null)
  const [metrics, setMetrics] = useState({
    visible: false,
    thumbX: 0,
    value: 0,
  })

  const update = useCallback(() => {
    const target = targetRef.current
    const track = trackRef.current
    if (!target || !track) return
    const { scrollLeft, scrollWidth, clientWidth } = target
    const maxScroll = scrollWidth - clientWidth
    const trackWidth = track.clientWidth
    if (maxScroll <= 2 || trackWidth === 0) {
      setMetrics((m) => (m.visible ? { ...m, visible: false } : m))
      return
    }
    const thumbWidth = THUMB_WIDTH
    const ratio = Math.min(1, Math.max(0, scrollLeft / maxScroll))
    setMetrics({
      visible: true,
      thumbX: ratio * (trackWidth - thumbWidth),
      value: Math.round(ratio * 100),
    })
  }, [targetRef])

  useEffect(() => {
    const target = targetRef.current
    if (!target) return
    update()
    target.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(target)
    if (trackRef.current) observer.observe(trackRef.current)
    return () => {
      target.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [targetRef, update])

  const scrollToThumbX = (thumbX) => {
    const target = targetRef.current
    const track = trackRef.current
    if (!target || !track) return
    const room = track.clientWidth - THUMB_WIDTH
    if (room <= 0) return
    const maxScroll = target.scrollWidth - target.clientWidth
    target.scrollLeft = (Math.min(room, Math.max(0, thumbX)) / room) * maxScroll
  }

  const handleThumbPointerDown = (event) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    dragRef.current = {
      startX: event.clientX,
      startThumbX: metrics.thumbX,
    }
  }

  const handleThumbPointerMove = (event) => {
    if (!dragRef.current) return
    const { startX, startThumbX } = dragRef.current
    scrollToThumbX(startThumbX + (event.clientX - startX))
  }

  const endDrag = (event) => {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleTrackPointerDown = (event) => {
    if (event.target !== event.currentTarget) return
    const rect = event.currentTarget.getBoundingClientRect()
    scrollToThumbX(event.clientX - rect.left - THUMB_WIDTH / 2)
  }

  const handleKeyDown = (event) => {
    const target = targetRef.current
    if (!target) return
    const keys = {
      ArrowLeft: () => (target.scrollLeft -= KEY_STEP),
      ArrowRight: () => (target.scrollLeft += KEY_STEP),
      Home: () => (target.scrollLeft = 0),
      End: () => (target.scrollLeft = target.scrollWidth),
    }
    if (keys[event.key]) {
      event.preventDefault()
      keys[event.key]()
    }
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={handleTrackPointerDown}
      className={`tab-scrollbar-track relative mx-auto mt-3 h-2 w-full max-w-xs touch-none rounded-full ${
        metrics.visible ? '' : 'invisible'
      }`}
    >
      <div
        role="scrollbar"
        tabIndex={metrics.visible ? 0 : -1}
        aria-label={label}
        aria-controls={controlsId}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={metrics.value}
        onKeyDown={handleKeyDown}
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="absolute left-0 top-1/2 cursor-grab touch-none rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 active:cursor-grabbing"
        style={{
          width: THUMB_WIDTH,
          height: THUMB_HEIGHT,
          transform: `translate(${metrics.thumbX}px, -50%)`,
        }}
      >
        <svg
          aria-hidden="true"
          className="tab-thumb block"
          width={THUMB_WIDTH}
          height={THUMB_HEIGHT}
          viewBox="0 0 58 29"
          fill="none"
        >
          <rect
            className="tab-thumb-outer"
            x="0.5"
            y="0.5"
            width="57"
            height="28"
            rx="6"
          />
          <rect
            className="tab-thumb-inner"
            x="4.5"
            y="4.5"
            width="49"
            height="20"
            rx="3.5"
          />
          <path
            className="tab-thumb-glyph"
            d="M16 8.5L10 14.5L16 20.5M42 8.5L48 14.5L42 20.5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g className="tab-thumb-grip" opacity="0.55">
            <rect x="25" y="9" width="2" height="11" rx="1" />
            <rect x="29" y="9" width="2" height="11" rx="1" />
            <rect x="33" y="9" width="2" height="11" rx="1" />
          </g>
        </svg>
      </div>
    </div>
  )
}

TabScrollbar.propTypes = {
  targetRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  controlsId: PropTypes.string.isRequired,
  label: PropTypes.string,
}

export default TabScrollbar
