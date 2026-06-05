import { lazy, Suspense, useCallback } from 'react'
import { Routes, Route, useLocation } from 'react-router'
import { useEffect } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useScrollToTop } from '@/hooks/useScrollToTop'
import { DEFAULT_META, ROUTE_META } from '@/hooks/useMetaTags'
import { useTranslation } from '@/i18n'
import { usePageTracking } from '@/hooks/useAnalytics'

// ═══════════════════════════════════════════════
// Route-Level Code Splitting
// Each page is a separate chunk — only downloaded
// when the user navigates to that route.
//
// BEFORE: 786KB single bundle (all pages)
// AFTER:   ~180KB initial + lazy-loaded pages
//
// Vite automatically creates separate JS chunks
// with hashed filenames for cache-busting.
// ═══════════════════════════════════════════════

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Flashcards = lazy(() => import('./pages/Flashcards'))
const Settings = lazy(() => import('./pages/Settings'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Help = lazy(() => import('./pages/Help'))
const Progress = lazy(() => import('./pages/Progress'))
const MarketingHub = lazy(() => import('./pages/MarketingHub'))
const NotFound = lazy(() => import('./pages/NotFound'))

/** Simple loading fallback — shown while chunks download */
function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-orange-400/20 border-t-orange-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-300 text-sm">{t("common.pageLoader")}</p>
      </div>
    </div>
  )
}

/** Updates meta tags on every route change */
function RouteMetaUpdater() {
  const { pathname } = useLocation()
  useScrollToTop()
  usePageTracking()

  useEffect(() => {
    const meta = ROUTE_META[pathname] || DEFAULT_META

    document.title = meta.title

    let descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!descEl) {
      descEl = document.createElement('meta')
      descEl.name = 'description'
      document.head.appendChild(descEl)
    }
    descEl.content = meta.description

    let kwEl = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null
    if (!kwEl) {
      kwEl = document.createElement('meta')
      kwEl.name = 'keywords'
      document.head.appendChild(kwEl)
    }
    kwEl.content = meta.keywords || DEFAULT_META.keywords || ''

    const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null
    if (ogTitle) ogTitle.content = meta.title

    const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null
    if (ogDesc) ogDesc.content = meta.description

    const twTitle = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement | null
    if (twTitle) twTitle.content = meta.title

    const twDesc = document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement | null
    if (twDesc) twDesc.content = meta.description

    let canEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canEl) {
      canEl = document.createElement('link')
      canEl.rel = 'canonical'
      document.head.appendChild(canEl)
    }
    canEl.href = `https://masterclass.anglotec-ai.com/${pathname}`

    const announcer = document.getElementById('route-announcer')
    if (announcer) announcer.textContent = `Navigated to ${meta.title}`

  }, [pathname])

  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <RouteMetaUpdater />
      <div id="route-announcer" role="status" aria-live="polite" className="sr-only" />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/help" element={<Help />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/marketing-hub" element={<MarketingHub />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
