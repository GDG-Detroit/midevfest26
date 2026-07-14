import { useState, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import ScheduleContext from '@/contexts/scheduleContextCore'

function canonicalizeSessionId(sessionId, speakersData) {
  if (!sessionId && sessionId !== 0) return ''
  const asStr = String(sessionId)
  if (asStr.includes('_')) {
    const parts = asStr
      .split('_')
      .map((p) => Number(p))
      .filter(Boolean)
    parts.sort((a, b) => a - b)
    return parts.join('_')
  }
  const idNum = Number(asStr)
  const speaker = speakersData.find(
    (s) => s.id === idNum || String(s.id) === asStr
  )
  if (!speaker || !speaker.session?.title) return asStr
  const related = speakersData
    .filter((s) => s.session?.title === speaker.session.title)
    .map((s) => Number(s.id))
  related.sort((a, b) => a - b)
  return related.join('_')
}

function getRepresentativeSpeakerForCanonicalId(canonicalId, speakersData) {
  if (!canonicalId) return null
  return (
    speakersData.find(
      (s) => canonicalizeSessionId(s.id, speakersData) === canonicalId
    ) || null
  )
}

const buildSessionRange = (time, duration) => {
  if (!time || typeof time !== 'string') return null
  const isPM = time.toLowerCase().includes('pm')
  const isAM = time.toLowerCase().includes('am')
  let cleanTime = time.replace(/am|pm/i, '').trim()
  if (!cleanTime.includes(':')) cleanTime = `${cleanTime}:00`
  let [hours, mins] = cleanTime.split(':').map(Number)
  if (isPM && hours !== 12) hours += 12
  if (isAM && hours === 12) hours = 0
  const start = hours * 60 + mins
  const end = start + (duration || 45)
  return { start, end }
}

const SAVED_SESSIONS_KEY = 'midevfest26_saved_sessions'
const LEGACY_SAVED_SESSIONS_KEY = 'iwd26_saved_sessions'

export default function ScheduleProvider({ children, speakersData = [] }) {
  const [savedSessionIds, setSavedSessionIds] = useState(() => {
    try {
      const stored =
        localStorage.getItem(SAVED_SESSIONS_KEY) ??
        localStorage.getItem(LEGACY_SAVED_SESSIONS_KEY)
      const parsed = stored ? JSON.parse(stored) : []
      return parsed
        .map((id) => canonicalizeSessionId(id, speakersData))
        .filter(Boolean)
    } catch (e) {
      console.error('Failed to parse saved sessions from localStorage', e)
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_SESSIONS_KEY, JSON.stringify(savedSessionIds))
    } catch (e) {
      console.error('Failed to save sessions to localStorage', e)
    }
  }, [savedSessionIds])

  const [conflictingSessionIds, setConflictingSessionIds] = useState([])
  const [lastConflict, setLastConflict] = useState(null)

  const resolveSpeaker = useMemo(
    () => (canonicalId) =>
      getRepresentativeSpeakerForCanonicalId(canonicalId, speakersData),
    [speakersData]
  )

  const toggleSession = (sessionId) => {
    const canonicalId = canonicalizeSessionId(sessionId, speakersData)
    setSavedSessionIds((prev) => {
      if (prev.includes(canonicalId)) {
        return prev.filter((id) => id !== canonicalId)
      }

      const rep = resolveSpeaker(canonicalId)
      if (rep?.session?.time && rep.session.time !== 'TBA') {
        const newRange = buildSessionRange(
          rep.session.time,
          rep.session.sessionDuration
        )
        const conflictingSaved = prev.filter((savedId) => {
          const savedRep = resolveSpeaker(savedId)
          if (!savedRep?.session?.time || savedRep.session.time === 'TBA')
            return false
          const savedRange = buildSessionRange(
            savedRep.session.time,
            savedRep.session.sessionDuration
          )
          if (!savedRange || !newRange) return false
          return (
            newRange.start < savedRange.end && newRange.end > savedRange.start
          )
        })

        if (conflictingSaved.length > 0) {
          setLastConflict({ newId: canonicalId, conflicts: conflictingSaved })
          return prev
        }
      }

      return [...prev, canonicalId]
    })
  }

  const clearLastConflict = () => setLastConflict(null)

  const addSessionAnyway = (sessionId) => {
    const canonicalId = canonicalizeSessionId(sessionId, speakersData)
    setSavedSessionIds((prev) => {
      if (prev.includes(canonicalId)) return prev
      return [...prev, canonicalId]
    })
    setLastConflict(null)
  }

  const autoResolveAndAdd = (sessionId) => {
    const canonicalId = canonicalizeSessionId(sessionId, speakersData)
    const conflict = lastConflict || { newId: canonicalId, conflicts: [] }
    const items = [conflict.newId, ...conflict.conflicts]
    const withRanges = items
      .map((id) => {
        const rep = resolveSpeaker(id)
        const range =
          rep?.session?.time && rep.session.time !== 'TBA'
            ? buildSessionRange(rep.session.time, rep.session.sessionDuration)
            : null
        return { id, range }
      })
      .filter((x) => x.range)

    if (withRanges.length === 0) {
      addSessionAnyway(canonicalId)
      return
    }

    withRanges.sort((a, b) => a.range.start - b.range.start)
    const earliest = withRanges[0].id

    setSavedSessionIds((prev) => {
      const filtered = prev.filter((id) => !conflict.conflicts.includes(id))
      if (!filtered.includes(earliest)) filtered.push(earliest)
      return filtered
    })
    setLastConflict(null)
  }

  useEffect(() => {
    const ranges = savedSessionIds
      .map((id) => {
        const rep = resolveSpeaker(id)
        if (!rep || !rep.session?.time || rep.session.time === 'TBA')
          return null
        const r = buildSessionRange(
          rep.session.time,
          rep.session.sessionDuration
        )
        return r ? { id, ...r } : null
      })
      .filter(Boolean)

    const conflictSet = new Set()
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const a = ranges[i]
        const b = ranges[j]
        if (a.start < b.end && a.end > b.start) {
          conflictSet.add(a.id)
          conflictSet.add(b.id)
        }
      }
    }
    setConflictingSessionIds(Array.from(conflictSet))
  }, [savedSessionIds, resolveSpeaker])

  const isSessionSaved = (sessionId) =>
    savedSessionIds.includes(canonicalizeSessionId(sessionId, speakersData))

  const isSessionConflicting = (sessionId) =>
    conflictingSessionIds.includes(
      canonicalizeSessionId(sessionId, speakersData)
    )

  return (
    <ScheduleContext.Provider
      value={{
        savedSessionIds,
        toggleSession,
        isSessionSaved,
        isSessionConflicting,
        conflictingSessionIds,
        lastConflict,
        clearLastConflict,
        addSessionAnyway,
        autoResolveAndAdd,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  )
}

ScheduleProvider.propTypes = {
  children: PropTypes.node.isRequired,
  speakersData: PropTypes.arrayOf(PropTypes.object),
}
