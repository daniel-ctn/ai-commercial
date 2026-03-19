import { createFileRoute, Link } from '@tanstack/react-router'
import { Sparkles, ShieldCheck, BarChart3, Store } from 'lucide-react'
import { buildSeoHead } from '#/lib/seo'

export const Route = createFileRoute('/about')({
  head: () =>
    buildSeoHead({
      title: 'About - AI Commercial',
      description:
        'AI Commercial is an intelligent shopping platform that helps you discover, compare, and save across multiple shops with AI-powered recommendations.',
      path: '/about',
    }),
  component: About,
})

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Shopping',
    description: 'Our AI assistant understands your needs and recommends products based on your budget, preferences, and shopping history.',
  },
  {
    icon: BarChart3,
    title: 'Smart Comparison',
    description: 'Compare products side-by-side with AI-generated summaries that highlight the best value, features, and overall pick.',
  },
  {
    icon: Store,
    title: 'Multi-Shop Marketplace',
    description: 'Browse products from multiple verified shops in one place. Find the best deals without jumping between sites.',
  },
  {
    icon: ShieldCheck,
    title: 'Transparent Deals',
    description: 'See real prices, genuine discounts, and active coupons. No inflated original prices or hidden fees.',
  },
]

function About() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="mx-auto max-w-3xl text-center">
        <p className="island-kicker mb-3">About AI Commercial</p>
        <h1 className="display-title mb-4 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Shopping made smarter, not harder.
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--sea-ink-soft)]">
          AI Commercial is an intelligent shopping platform that brings together
          products from multiple shops, surfaces the best deals, and uses AI to
          help you find exactly what you need — faster.
        </p>
      </section>

      <section className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-6"
          >
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
              <feature.icon className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--sea-ink)]">
              {feature.title}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">
              {feature.description}
            </p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-16 max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-8 text-center">
        <h2 className="mb-3 text-2xl font-bold text-[var(--sea-ink)]">
          Start exploring
        </h2>
        <p className="mb-6 text-[var(--sea-ink-soft)]">
          Browse thousands of products, compare prices, and discover deals across our marketplace.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/products"
            className="rounded-lg bg-[var(--lagoon)] px-6 py-2.5 font-medium text-white hover:bg-[var(--lagoon-deep)]"
          >
            Browse Products
          </Link>
          <Link
            to="/deals"
            className="rounded-lg border border-[var(--line)] px-6 py-2.5 font-medium text-[var(--sea-ink)] hover:bg-[var(--surface)]"
          >
            View Deals
          </Link>
        </div>
      </section>
    </main>
  )
}
