import PageLayout from '@/layouts/PageLayout'
import LandingSectionHero from '@/layouts/LandingSectionHero'
import LocationSection from '@/layouts/LocationSection'
import AboutSection from '@/layouts/AboutSection'
import AttendeeSection from '@/layouts/AttendeeSection'
import SEOStructuredData from '@/components/ui/SEOStructuredData'
import PlaceholderProgramNotice from '@/components/ui/PlaceholderProgramNotice'
import SessionsSection from '@/layouts/SessionsSection'
import SpeakersSection from '@/layouts/SpeakersSection'
import PartnersSection from '@/layouts/PartnersSection'
import JobBoardSection from '@/layouts/JobBoardSection'
import OrganizersSection from '@/layouts/OrganizersSection'
import { SpeakersData as Speakers2026 } from '@/data/2026/speakers'
import { PLACEHOLDER_TRACKS_2025, SCHEDULE_TRACK } from '@/data/2026/venues'
import { partnersData } from '@/data/2026/partners'

import MembersSection from '@/layouts/MembersSection'

/** The event this site is for. */
const EVENT_YEAR = 2026
/**
 * The program actually on display. Once the 2026 lineup is confirmed in the
 * CMS, set this to EVENT_YEAR and drop <PlaceholderProgramNotice />.
 */
const PROGRAM_YEAR = 2025

function Home() {
  const currentYear = new Date().getFullYear()
  return (
    <PageLayout>
      <SEOStructuredData speakersData={Speakers2026} />

      <LandingSectionHero />

      <div className="bg-iwd-surface-raised relative z-10 py-0 dark:bg-iwd-black-950">
        <LocationSection />

        {/*
          Schedule and speakers show the 2025 program until 2026 is confirmed, so
          both are labelled 2025 and the notice above them says so outright. The
          venue map is hidden because those sessions ran at MotorCity Casino, not
          at this year's venue — location, parking, and dates above are 2026's
          and stay as they are.
        */}
        <PlaceholderProgramNotice
          programYear={PROGRAM_YEAR}
          eventYear={EVENT_YEAR}
        />

        <SessionsSection
          speakersData={Speakers2026}
          year={PROGRAM_YEAR}
          defaultExpanded={true}
          tracks={[SCHEDULE_TRACK, ...PLACEHOLDER_TRACKS_2025]}
        />

        <SpeakersSection
          speakersData={Speakers2026}
          year={PROGRAM_YEAR}
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
