import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import Footer from '../components/Footer'
import Header from '../components/Header'

import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'AI Commercial',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: RootErrorBoundary,
  notFoundComponent: NotFoundPage,
})

function RootErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold text-[var(--sea-ink)]">Something went wrong</h1>
      <p className="max-w-md text-[var(--sea-ink-soft)]">
        An unexpected error occurred. Please try refreshing the page.
      </p>
      {import.meta.env.DEV && (
        <pre className="mt-4 max-w-2xl overflow-auto rounded-lg bg-red-50 p-4 text-left text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error.message}
          {'\n'}
          {error.stack}
        </pre>
      )}
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-[var(--lagoon)] px-6 py-2 text-white hover:bg-[var(--lagoon-deep)]"
      >
        Refresh page
      </button>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-6xl font-bold text-[var(--sea-ink-soft)]">404</h1>
      <p className="text-lg text-[var(--sea-ink-soft)]">Page not found</p>
      <a
        href="/"
        className="mt-2 rounded-lg bg-[var(--lagoon)] px-6 py-2 text-white hover:bg-[var(--lagoon-deep)]"
      >
        Go home
      </a>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <TanStackQueryProvider>
          <Header />
          {children}
          <Footer />
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
        <Scripts />
      </body>
    </html>
  )
}
