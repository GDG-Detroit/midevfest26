import { createContext } from 'react'

// Default values for type sense. The provider lives in
// @/components/speakers/SpeakerContext — keeping the context in its own module
// is what lets that file export only components, which react-refresh requires
// for Fast Refresh to work.
const SpeakerContext = createContext({
  isModalOpen: false,
  openModal: () => {},
  closeModal: () => {},
  speakerID: 0,
  // eslint-disable-next-line no-unused-vars
  setSpeakerID: (_speakerID) => {},
  numSpeakers: 0,
  uniqueSpeakers: [],
  uniqueSpeakersSortedByFirstName: [],
})

export default SpeakerContext
