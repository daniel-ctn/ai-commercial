import { createFileRoute } from '@tanstack/react-router'

function getSitemapUrl() {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
  return new URL('/sitemap.xml', apiBase).toString()
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const response = await fetch(getSitemapUrl())

          if (!response.ok) {
            return new Response('Sitemap unavailable', {
              status: 502,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
              },
            })
          }

          return new Response(await response.text(), {
            status: 200,
            headers: {
              'Cache-Control': 'public, max-age=300',
              'Content-Type': 'application/xml; charset=utf-8',
            },
          })
        } catch {
          return new Response('Sitemap unavailable', {
            status: 502,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
            },
          })
        }
      },
    },
  },
})
