import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// TODO: replace with the Michigan DevFest GA4 property if this ID is still a
// leftover from a prior fork. Not a secret — it ships in the client bundle.
const GA_MEASUREMENT_ID = 'G-XGYFD9VW24'

// Runtime host check, not import.meta.env.PROD: `vite build` is also what CI
// serves to Axe and what Vercel preview deployments ship, and those must not
// write into the production property. A separate non-prod measurement ID is
// not worth the operational noise for this site — Vercel Analytics already
// covers preview/dev.
const PRODUCTION_HOSTS = new Set(['midevfest.com', 'www.midevfest.com'])

function isProductionAnalyticsHost() {
  return PRODUCTION_HOSTS.has(window.location.hostname)
}

function ensureGtag() {
  if (typeof window.gtag === 'function') return

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // gtag.js reads the Arguments object; do not push a rest-parameter array.
    window.dataLayer.push(arguments)
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.gtag('js', new Date())
  // Manual page_view below so BrowserRouter navigations are recorded. Disable
  // GA4 Enhanced Measurement "page changes based on browser history events"
  // on this property or first loads will double-count.
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false })
}

/**
 * Loads gtag.js only on the production host and sends a page_view whenever
 * the SPA location changes.
 */
export default function GoogleAnalytics() {
  const location = useLocation()
  const initialized = useRef(false)

  useEffect(() => {
    if (!isProductionAnalyticsHost()) return

    if (!initialized.current) {
      ensureGtag()
      initialized.current = true
    }

    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: `${location.pathname}${location.search}`,
    })
  }, [location.pathname, location.search])

  return null
}
