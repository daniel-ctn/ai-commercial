# AI Commercial Enhancement Plan

> Purpose: a forward-looking roadmap for improving the project now that the base platform is stable and feature-rich.
>
> This file complements `PLAN.md`.
> - `PLAN.md` documents what was built and the original learning roadmap.
> - `ENHANCEMENT_PLAN.md` defines what to improve next, in priority order.

## 1. Current Position

The project already has a strong foundation:

- Multi-page frontend with products, shops, deals, compare, auth, admin, and chat UI
- FastAPI backend with AI chat, CRUD APIs, admin dashboard, comparison, caching, and auth
- NestJS backend with most core modules implemented
- Shared database, Redis cache, and frontend API client

The next stage should focus on three goals:

1. Strengthen platform reliability and backend parity
2. Add more advanced user-facing product intelligence
3. Improve growth, operations, and long-term maintainability

## 2. Strategy

The roadmap is intentionally ordered by leverage:

1. Fix platform-level gaps first
2. Add advanced features on top of a reliable base
3. Expand into analytics, personalization, and operations

This avoids building flashy features on top of weak contracts or partial backend support.

## 2.1 Version and Dependency Policy

This roadmap assumes the project should always use the latest stable versions of the tools it already depends on.

- Always use the latest stable version of frameworks, SDKs, libraries, CLIs, and tooling already in use across the project
- Before implementing a feature or upgrading a package, verify the current stable version and the latest official API/docs
- Avoid abandoned, deprecated, or unmaintained dependencies when a maintained alternative exists
- Prefer small, validated upgrades instead of large version jumps when changing active dependencies
- After version changes, re-run lint, tests, and builds before considering the task complete

## 3. Priority Themes

### Theme A: Platform Integrity

Focus on backend parity, resilience, testing, and contract consistency.

### Theme B: Advanced Commerce Experience

Focus on saved state, personalization, AI-driven recommendations, and better discovery.

### Theme C: Seller and Admin Intelligence

Focus on admin insights, shop-owner tooling, and smarter operational workflows.

### Theme D: Growth and Production Maturity

Focus on SEO, observability, monitoring, deployment readiness, and measurable product health.

## 4. Phase Roadmap

## Phase 0: Stabilization and Contract Parity

### Objective

Make the platform more trustworthy before adding complex new features.

### Why this phase comes first

The frontend currently assumes capabilities that are not fully available across both backends. This is the biggest structural risk in the project.

### Deliverables

- [x] Finish NestJS chat support so the frontend can truly switch backends
- [x] Add a NestJS `ChatModule`, controller, service, and SSE streaming endpoint
- [x] Mirror FastAPI chat session CRUD and message streaming behavior in NestJS
- [x] Validate Google OAuth parity across both backends
- [x] Add the missing NestJS migration for `products.search_vector`
- [x] Verify full-text search works from a fresh Nest-only database setup
- [x] Harden Redis failure handling in NestJS auth and session flows
- [x] Align error shapes and status codes between FastAPI and NestJS
- [x] Add feature flags or graceful fallback behavior where parity is still incomplete

### Success criteria

- Frontend can switch between FastAPI and NestJS without breaking core flows
- Search, auth, compare, admin, and chat all work against both backends
- Redis outages degrade gracefully instead of breaking auth

## Phase 1: Testing and Quality Foundation

### Objective

Raise confidence in changes so advanced features can be added safely.

### Deliverables

- [x] Add frontend component and route tests for:
  - [x] Compare flow (store: add, remove, toggle, clear, max limit)
  - [x] API error handling (ApiError class, error shape contract)
  - [ ] Product listing filters
  - [ ] Chat widget behavior
  - [ ] Admin guard behavior
- [x] Add backend tests for:
  - [x] Auth flows (token refresh, replay protection, Redis failure)
  - [x] Product filtering (pagination, ownership, admin bypass)
  - [x] Coupon filtering (validation rules, ownership, admin bypass)
  - [x] Compare contract (ordering, dedup, attribute keys, on_sale)
  - [x] Chat session ownership (CRUD, user isolation, not-found)
- [x] Add API contract tests to verify FastAPI and NestJS responses stay aligned
- [ ] Add basic end-to-end tests for:
  - [ ] Login
  - [ ] Browse products
  - [ ] Compare products
  - [ ] Use admin dashboard
  - [ ] Send a chat message
- [x] Add CI checks for lint, test, and build on all active apps

### Success criteria

- [x] Core flows are covered by automated tests
- [x] Contract drift between backends is caught before release
- [x] New features can be added with lower regression risk

## Phase 2: Persistent User Experience

### Objective

Make the product feel more advanced and less session-bound.

### Deliverables

- [x] Persist compare selections across refresh and browser restarts
- [ ] Add saved compare lists for authenticated users
- [x] Persist chat session history in the UI and allow session switching
- [x] Add recently viewed products (localStorage + home page + compare empty state)
- [x] Add favorites or wishlist support (backend + frontend with heart toggle)
- [ ] Add saved filters and saved deal alerts
- [x] Improve empty states and recovery flows for chat, compare, and search

### Success criteria

- [x] Users can leave and return without losing important state
- [x] Product interactions feel account-based instead of temporary
- [ ] High-value workflows become repeatable

## Phase 3: Advanced AI Commerce Features

### Objective

Turn the chatbot from a helpful lookup tool into a stronger shopping assistant.

### Deliverables

- [x] Add recommendation-oriented tools:
  - [x] `recommend_products`
  - [x] `rank_products_by_budget`
  - [x] `suggest_alternatives`
  - [x] `find_best_value_products`
- [x] Add richer intent handling:
  - [x] Budget shopping
  - [x] Gift search
  - [x] Feature-based product matching
  - [x] Shop trust or value comparisons
- [x] Add structured AI responses for product cards, comparison summaries, and coupon highlights
- [x] Add follow-up suggestion chips based on the previous answer
- [x] Add AI comparison summaries on the compare page
- [x] Add AI-generated "best choice" callouts using product specs, price, and sale data
- [x] Add guardrails to prevent unsupported claims and hallucinated attributes

### Success criteria

- [x] AI responses feel useful for decision-making, not just retrieval
- [x] Compare and discovery experiences become more differentiated
- [x] Users can ask broader shopping questions and still get grounded answers

## Phase 4: Discovery, Search, and Personalization

### Objective

Help users find good products faster and surface more relevant content.

### Deliverables

- [x] Replace the starter home page with a real commerce landing page
- [x] Add featured categories, trending products, best current deals, and shop spotlights
- [x] Add sorting options:
  - [x] Price low to high
  - [x] Price high to low
  - [x] Newest
  - [x] Biggest discount
  - [x] Best value
- [x] Add richer filters:
  - [x] Sort dropdown in product listing
  - [ ] Multi-category
  - [ ] Attribute-based filtering from JSON specs
- [x] Add personalized homepage sections for logged-in users
- [x] Add "recommended for you" and "because you viewed" modules
- [x] Add deal urgency indicators and expiration-aware ranking

### Success criteria

- [x] Discovery feels product-led rather than API-demo-like
- [x] Search becomes more precise and more useful
- [x] Returning users see more relevant results

## Phase 5: Shop Admin and Business Intelligence

### Objective

Upgrade the admin experience from CRUD management to actionable insight.

### Deliverables

- [x] Add shop-admin dashboard with scoped access
- [x] Add analytics for:
  - [x] Product count by shop/category
  - [x] Coupon activity
  - [x] Active vs inactive inventory
  - [x] Products missing images, descriptions, or attributes
- [x] Add quality scoring for product listings
- [x] Add bulk actions:
  - [x] Activate/deactivate products
  - [x] Activate/deactivate coupons
  - [x] Bulk category assignment
  - [ ] Bulk metadata cleanup
- [x] Add smarter creation flows with validation helpers
- [x] Add AI-assisted product description and attribute cleanup for admins

### Success criteria

- [x] Admin area helps improve catalog quality, not just manage rows
- [x] Shop owners can maintain inventory more efficiently
- [x] Data quality improves over time

## Phase 6: SEO, Content, and Public Product Maturity

### Objective

Make the public experience look and behave like a real product.

### Deliverables

- [x] Replace remaining starter branding and template content
- [x] Add route-level SEO metadata for products, shops, deals, compare, and about pages
- [x] Add Open Graph and Twitter card metadata
- [x] Add JSON-LD structured data for products, organizations, and offers
- [x] Add sitemap generation
- [x] Improve 404 and error page UX
- [x] Improve content hierarchy, headlines, and conversion copy
- [x] Add canonical URLs and clean metadata defaults

### Success criteria

- [x] Public pages feel branded and intentional
- [x] The app is ready for indexing and social sharing
- [x] Product pages communicate value clearly

## Phase 7: Observability and Production Operations

### Objective

Make the system easier to monitor, debug, and scale.

### Deliverables

- Add structured request logging across frontend and backends
- Add Sentry or equivalent error tracking
- Add metrics for:
  - API latency
  - Chat latency
  - SSE failures
  - Auth failures
  - Cache hit rate
- Add tracing or correlation IDs across requests
- Add health dashboards for database, Redis, and AI provider status
- Add deployment checklists and rollback guidance
- Add environment validation and startup diagnostics for all apps

### Success criteria

- Failures are easier to detect and diagnose
- Production readiness is measurable
- Operational debugging time is reduced

## 5. Recommended Execution Order

If time is limited, this is the best sequence:

1. Phase 0: Stabilization and contract parity
2. Phase 1: Testing and quality foundation
3. Phase 2: Persistent user experience
4. Phase 3: Advanced AI commerce features
5. Phase 4: Discovery, search, and personalization
6. Phase 5: Shop admin and business intelligence
7. Phase 6: SEO, content, and public product maturity
8. Phase 7: Observability and production operations

## 6. Suggested First Milestone

### Milestone Name

Backend Parity and Product Maturity

### Scope

- [x] Implement NestJS chat module
- [x] Add missing NestJS search migration
- [x] Harden Redis auth paths
- [ ] Add backend contract tests
- [ ] Persist compare state
- [ ] Persist chat session history in the UI
- [ ] Replace starter home page and starter header links

### Why this milestone

It removes the biggest platform risks while also making the app feel noticeably more polished to users.

## 7. Nice-to-Have Backlog

These are strong later additions once the main roadmap is stable:

- Product price history charts
- Coupon copy-to-clipboard analytics
- Multi-shop cart simulation
- Product review or rating system
- Notification center for saved alerts
- Admin audit logs
- Role-specific dashboards
- Multi-language support
- PWA polish for saved deals and offline shell

## 8. Definition of Done for Future Enhancements

Any major new feature should meet this bar:

- Works in the intended backend(s)
- Has loading, empty, and error states
- Has at least basic automated coverage
- Respects auth and ownership rules
- Is documented in `DOCS.md`
- Does not break the shared API contract
- Uses the latest stable versions of the relevant dependencies, or explicitly documents why an upgrade is deferred
- Is production-safe around caching, validation, and security

## 9. Summary

The highest-value next step is not just "more features."
It is:

1. finish backend parity
2. improve confidence with testing
3. add persistent and intelligent user workflows
4. mature the public product and operational foundation

That path will make the project feel more advanced in both engineering quality and user experience.
