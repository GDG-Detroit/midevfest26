import PageLayout from '@/layouts/PageLayout'
import LandingSectionHero from '@/layouts/LandingSectionHero'
import LocationSection from '@/layouts/LocationSection'
import AboutSection from '@/layouts/AboutSection'
import AttendeeSection from '@/layouts/AttendeeSection'
import SEOStructuredData from '@/components/ui/SEOStructuredData'
import SessionsSection from '@/layouts/SessionsSection'
import SpeakersSection from '@/layouts/SpeakersSection'
import PartnersSection from '@/layouts/PartnersSection'
import JobBoardSection from '@/layouts/JobBoardSection'
import OrganizersSection from '@/layouts/OrganizersSection'
import { SpeakersData as Speakers2026 } from '@/data/2026/speakers'
import { PROGRAM_TRACKS, SCHEDULE_TRACK } from '@/data/2026/venues'
import { partnersData } from '@/data/2026/partners'

import MembersSection from '@/layouts/MembersSection'

/** The event this site is for. */
const EVENT_YEAR = 2026

function Home() {
  const currentYear = new Date().getFullYear()
  return (
    <PageLayout>
      <SEOStructuredData speakersData={Speakers2026} />

      <LandingSectionHero />

      <div className="bg-iwd-surface-raised relative z-10 py-0 dark:bg-iwd-black-950">
        <LocationSection />

        <SessionsSection
          speakersData={Speakers2026}
          year={EVENT_YEAR}
          defaultExpanded={true}
          tracks={[SCHEDULE_TRACK, ...PROGRAM_TRACKS]}
        />

        <SpeakersSection
          speakersData={Speakers2026}
          year={EVENT_YEAR}
          defaultExpanded={false}
        />

        <AboutSection />

        <MembersSection />

        <AttendeeSection />

        <JobBoardSection />

        <PartnersSection partnersData={partnersData} year={currentYear} />

        <OrganizersSection />
      </div>
    </PageLayout>
  )
}

export default Home
