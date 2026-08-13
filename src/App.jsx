import { lazy, Suspense } from 'react'
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useParams,
} from 'react-router-dom'

import Home from '@/pages/Home'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import ThemeProvider from '@/components/ui/ThemeContext'
import ScheduleProvider from '@/components/ui/ScheduleContext'
import HeroAnimationProvider from '@/components/ui/HeroAnimationProvider'
import { SpeakersData } from '@/data/2026/speakers'

const CareersHub = lazy(() => import('@/pages/CareersHub'))
const ConnectionsPage = lazy(() => import('@/pages/Connections'))
const MediaPage = lazy(() => import('@/pages/Media'))
const PreviousEvents = lazy(() => import('@/pages/PreviousEvents'))
const PreviousEvent = lazy(() => import('@/pages/PreviousEvent'))
const NotFound = lazy(() => import('@/pages/NotFound'))

/**
 * The legacy site published archive years under /previous-events/:year. Keep
 * those URLs working, carrying the year across rather than dumping every inbound
 * link on the index.
 */
const RedirectToArchivedYear = () => {
  const { year } = useParams()
  return <Navigate to={`/past-events/${year}`} replace />
}

function App() {
  return (
    <ThemeProvider>
      <ScheduleProvider speakersData={SpeakersData}>
        <HeroAnimationProvider>
          <Router>
            <GoogleAnalytics />
            <div role="document">
              {/* Skip Link - First element for accessibility; hidden until Tab focus */}
              <a className="skip-link" href="#main-content">
                Skip to main content
              </a>
              <Suspense
                fallback={
                  <div
                    className="flex min-h-screen items-center justify-center"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <span className="text-lg text-gray-400">Loading…</span>
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/careers-hub" element={<CareersHub />} />
                  <Route path="/connections" element={<ConnectionsPage />} />
                  <Route path="/media" element={<MediaPage />} />
                  <Route path="/past-events" element={<PreviousEvents />} />
                  <Route
                    path="/past-events/:year"
                    element={<PreviousEvent />}
                  />
                  <Route
                    path="/previous-events"
                    element={<Navigate to="/past-events" replace />}
                  />
                  <Route
                    path="/previous-events/:year"
                    element={<RedirectToArchivedYear />}
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </div>
          </Router>
        </HeroAnimationProvider>
      </ScheduleProvider>
    </ThemeProvider>
  )
}

export default App
