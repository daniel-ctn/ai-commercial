import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ChatWidget } from '../components/chat/ChatWidget'
import CompareBar from '../components/CompareBar'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { Toaster } from '../components/ui/sonner'

import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'
import { getDefaultShareImage } from '#/lib/seo'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`
const DEFAULT_SHARE_IMAGE = getDefaultShareImage()

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'AI Commercial — Smart Shopping, Better Deals' },
      { name: 'description', content: 'Discover and compare products across shops, find the best deals, and get AI-powered shopping recommendations.' },
      { name: 'theme-color', content: '#0d9488' },
      { property: 'og:site_name', content: 'AI Commercial' },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: DEFAULT_SHARE_IMAGE },
      { property: 'og:title', content: 'AI Commercial — Smart Shopping, Better Deals' },
      { property: 'og:description', content: 'Discover and compare products across shops, find the best deals, and get AI-powered shopping recommendations.' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: DEFAULT_SHARE_IMAGE },
      { name: 'twitter:title', content: 'AI Commercial — Smart Shopping, Better Deals' },
      { name: 'twitter:description', content: 'Discover and compare products across shops, find the best deals, and get AI-powered shopping recommendations.' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: RootErrorBoundary,
  notFoundComponent: NotFoundPage,
})

function RootErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="rounded-full bg-red-100 p-4 dark:bg-red-950">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--sea-ink)]">Something went wrong</h1>
        <p className="mt-2 max-w-md text-[var(--sea-ink-soft)]">
          We hit an unexpected error. This has been noted and we're looking into it.
        </p>
      </div>
      {import.meta.env.DEV && (
        <pre className="max-w-2xl overflow-auto rounded-lg bg-red-50 p-4 text-left text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error.message}
          {'\n'}
          {error.stack}
        </pre>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[var(--lagoon)] px-6 py-2.5 font-medium text-white hover:bg-[var(--lagoon-deep)]"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-lg border border-[var(--line)] px-6 py-2.5 font-medium text-[var(--sea-ink)] hover:bg-[var(--surface)]"
        >
          Go home
        </a>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="rounded-full bg-[var(--sand)] p-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sea-ink-soft)]"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v2"/><path d="M11 14h.01"/></svg>
      </div>
      <div>
        <h1 className="text-5xl font-bold text-[var(--sea-ink)]">404</h1>
        <p className="mt-2 text-lg text-[var(--sea-ink-soft)]">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <a
          href="/"
          className="rounded-lg bg-[var(--lagoon)] px-6 py-2.5 font-medium text-white hover:bg-[var(--lagoon-deep)]"
        >
          Back to home
        </a>
        <a
          href="/products"
          className="rounded-lg border border-[var(--line)] px-6 py-2.5 font-medium text-[var(--sea-ink)] hover:bg-[var(--surface)]"
        >
          Browse products
        </a>
      </div>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <TanStackQueryProvider queryClient={queryClient}>
          <Header />
          {children}
          <Footer />
          <CompareBar />
          <ChatWidget />
          {import.meta.env.DEV && (
            <TanStackDevtools
              config={{ position: 'bottom-right' }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
          )}
        </TanStackQueryProvider>
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  )
}
