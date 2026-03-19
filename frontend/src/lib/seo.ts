const SITE_URL = (import.meta.env.VITE_SITE_URL || 'http://localhost:3000').replace(
  /\/+$/,
  '',
)

const DEFAULT_SHARE_IMAGE = '/logo.png'

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildSeoHead({
  title,
  description,
  path,
  image = DEFAULT_SHARE_IMAGE,
  type = 'website',
}: {
  title: string
  description: string
  path: string
  image?: string
  type?: string
}) {
  const url = absoluteUrl(path)
  const imageUrl = absoluteUrl(image)

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:url', content: url },
      { property: 'og:image', content: imageUrl },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
    ],
    links: [{ rel: 'canonical', href: url }],
  }
}

export function getDefaultShareImage(): string {
  return absoluteUrl(DEFAULT_SHARE_IMAGE)
}
