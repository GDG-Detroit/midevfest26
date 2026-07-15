import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

const DEFAULT_INTERVAL = 2200

/**
 * Cycles through a list of words on an interval, fading/sliding each new
 * word in. Purely decorative: the visible rotation is `aria-hidden` and a
 * `sr-only` sibling (rendered by the caller) should carry the equivalent
 * static text for assistive tech.
 *
 * Respects `prefers-reduced-motion`: the rotation doesn't run while the
 * preference is on, so the current word is shown statically with no
 * animation. Toggling the OS setting mid-session starts/stops it live.
 */
function RevolvingWord({ words, interval = DEFAULT_INTERVAL, className = '' }) {
  const [index, setIndex] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mql.matches)

    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches)
    }
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (words.length <= 1 || prefersReducedMotion) return undefined

    const id = setInterval(() => {
      setIndex((current) => (current + 1) % words.length)
    }, interval)

    return () => clearInterval(id)
  }, [words, interval, prefersReducedMotion])

  useEffect(() => {
    if (index >= words.length) setIndex(0)
  }, [words, index])

  const currentWord = words[index] ?? words[0] ?? ''

  return (
    <span
      className={`inline-block overflow-hidden align-bottom ${className}`}
      aria-hidden="true"
    >
      <span
        key={index}
        className="inline-block animate-word-cycle-in motion-reduce:animate-none"
      >
        {currentWord}
      </span>
    </span>
  )
}

RevolvingWord.propTypes = {
  words: PropTypes.arrayOf(PropTypes.string).isRequired,
  interval: PropTypes.number,
  className: PropTypes.string,
}

export default RevolvingWord
