import { memo } from 'react'
import PropTypes from 'prop-types'

/**
 * SEOStructuredData injects JSON-LD into the page for AI agents and search engines.
 * It provides structured details about the Event, Speakers, and Organizer.
 */
const SEOStructuredData = memo(({ speakersData = [] }) => {
  const eventData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    'name': 'Detroit Pride Innovation Summit 2026',
    'description':
      'Celebrating innovation, empowerment, and community at the Detroit Pride Innovation Summit 2026 in Detroit.',
    'image': 'https://midevfest26.vercel.app/social-card.jpg',
    'startDate': '2026-06-20T08:00:00-04:00',
    'endDate': '2026-06-20T17:00:00-04:00',
    'eventStatus': 'https://schema.org/EventScheduled',
    'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
    'location': {
      '@type': 'Place',
      'name': 'IBM HQ Detroit',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '39555 Orchard Hill Pl',
        'addressLocality': 'Detroit',
        'addressRegion': 'MI',
        'postalCode': '48201',
        'addressCountry': 'US',
      },
    },
    'organizer': {
      '@type': 'Organization',
      'name': 'Compass Detroit / GDG Detroit',
      'url': 'https://midevfest26.vercel.app/',
    },
    'performer': speakersData.map((speaker) => ({
      '@type': 'Person',
      'name': speaker.name,
      'jobTitle': speaker.position,
      'affiliation': {
        '@type': 'Organization',
        'name': speaker.organization,
      },
      'image': speaker.avatar,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(eventData) }}
    />
  )
})

SEOStructuredData.displayName = 'SEOStructuredData'
SEOStructuredData.propTypes = {
  speakersData: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      position: PropTypes.string,
      organization: PropTypes.string,
      avatar: PropTypes.string,
    })
  ),
}

export default SEOStructuredData
