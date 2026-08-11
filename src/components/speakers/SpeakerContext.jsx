import PropTypes from 'prop-types'
import { useState } from 'react'
import SpeakerContext from '@/contexts/speakerContextCore'

export const SpeakerProvider = ({ children, speakersData = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [speakerID, setSpeakerID] = useState(0)

  const openModal = () => {
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const uniqueSpeakers = speakersData.filter(
    (speaker, index, self) =>
      index === self.findIndex((s) => s.name === speaker.name)
  )

  const numSpeakers = uniqueSpeakers.length

  const uniqueSpeakersSortedByFirstName = [...uniqueSpeakers].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <SpeakerContext.Provider
      value={{
        isModalOpen,
        openModal,
        closeModal,
        speakerID,
        setSpeakerID,
        numSpeakers,
        uniqueSpeakers,
        uniqueSpeakersSortedByFirstName,
      }}
    >
      {children}
    </SpeakerContext.Provider>
  )
}

SpeakerProvider.propTypes = {
  children: PropTypes.node.isRequired,
  speakersData: PropTypes.arrayOf(PropTypes.object),
}
