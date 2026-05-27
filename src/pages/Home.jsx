import PageLayout from '@/layouts/PageLayout'
import LandingSectionPride from '@/layouts/LandingSectionPride'
import LocationSection from '@/layouts/LocationSection'
import AboutSection from '@/layouts/AboutSection'
import AttendeeSection from '@/layouts/AttendeeSection'
import BreakPatternSection from '@/layouts/BreakPatternSection'
import SEOStructuredData from '@/components/ui/SEOStructuredData'
import SessionsSection from '@/layouts/SessionsSection'
import SpeakersSection from '@/layouts/SpeakersSection'
import PartnersSection from '@/layouts/PartnersSection'
import JobBoardSection from '@/layouts/JobBoardSection'
import OrganizersSection from '@/layouts/OrganizersSection'
import { SpeakersData as Speakers2026 } from '@/data/2026/speakers'
import { partnersData } from '@/data/2026/partners'

import MembersSection from '@/layouts/MembersSection'

function Home() {
  const currentYear = new Date().getFullYear()
  return (
    <PageLayout>
      <SEOStructuredData speakersData={Speakers2026} />
      <h1 id="main-heading" className="sr-only">
        Detroit Pride Day Innovation Summit {currentYear}
      </h1>

      <LandingSectionPride />

      <div className="bg-iwd-surface-raised relative z-10 py-0 dark:bg-iwd-black-950">
        <LocationSection />

        <div id="schedule">
          <SessionsSection
            speakersData={Speakers2026}
            year={2026}
            defaultExpanded={false}
            tracks={[
              'Map',
              'Schedule',
              'Level Up',
              'Build with AI',
              'AI Foundations',
              'Leadership',
              'Innovation',
              'Careers',
            ]}
          />
        </div>

        <div id="speakers">
          <SpeakersSection
            speakersData={Speakers2026}
            defaultExpanded={false}
          />
        </div>

        <div id="about">
          <AboutSection />
        </div>

        <MembersSection />
        <AttendeeSection />
        <BreakPatternSection />

        <div id="jobboard">
          <JobBoardSection />
        </div>

        <div id="partners">
          <PartnersSection partnersData={partnersData} year={currentYear} />
        </div>

        <div id="team">
          <OrganizersSection />
        </div>
      </div>
    </PageLayout>
  )
}

export default Home
