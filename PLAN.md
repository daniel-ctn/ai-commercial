# AI Commercial Platform

> **Learning Project Note**: This project serves as a hands-on learning environment for a **senior Next.js/React developer learning backend development**. Both backends are learning exercises:
>
> - **FastAPI (Python)** — Learn Python, async programming, SQLAlchemy ORM, and how a non-JS backend works
> - **NestJS (TypeScript)** — Learn backend architecture patterns (DI, modules, guards) in a familiar TypeScript environment
>
> Each feature includes explanations comparing backend patterns to familiar Next.js/React concepts (e.g., NestJS modules ≈ Next.js route groups, FastAPI dependencies ≈ React context, decorators ≈ higher-order components). Code comments and docs explain the *why* behind backend patterns like dependency injection, guards/middleware, interceptors, and ORM relationships.

> **⚠️ Code Quality & Production Standards — ALWAYS follow these when implementing any feature or making changes:**
>
> 1. **Best Practices** — Write clean, production-grade code. Use proper error handling, input validation, type safety, and security patterns (e.g., parameterized queries, httpOnly cookies, `@Exclude()` on sensitive fields, `rel="noopener noreferrer"` on external links).
> 2. **Optimized & Efficient** — Avoid N+1 queries (use `joinedload`/`leftJoinAndSelect`), use database indexes on FK and filter columns, prefer single consolidated queries over sequential ones, use `React.memo` for list-rendered components, and use controlled inputs that sync with URL state.
> 3. **Latest Stable Versions** — Always use the latest stable version of every package/framework. Before implementing, verify the current API against up-to-date documentation. Key replacements already made: `PyJWT` (not python-jose — abandoned/CVEs), `bcrypt` directly (not passlib — unmaintained).
> 4. **No Abandoned Dependencies** — Do not introduce packages that are unmaintained or have known unpatched CVEs. Check maintenance status before adding any new dependency.
> 5. **Incremental Changes** — Make small, focused changes. Test each change before moving to the next. Do not refactor everything at once.

## Overview

Build a full-stack commercial platform with an AI chatbot (Google Gemini) that helps users find products, compare products/shops, and discover coupons/sales. Frontend uses TanStack Start + shadcn/ui. Two backend implementations exist for learning purposes:

1. **FastAPI (Python)** — Learning Python & async backend patterns, implemented through Phase 4
2. **NestJS (TypeScript)** — Learning backend architecture (DI, modules, guards) in TypeScript, mirrors the same API contract so the frontend can switch between them

Both backends connect to the same **Neon PostgreSQL** database and **Upstash Redis** cache.

## Progress

### FastAPI Backend (Original)

- [x] Phase 1: Project scaffolding
- [x] Phase 2: Database models & migrations
- [x] Phase 3: Auth system
- [x] Phase 4: Core CRUD APIs & pages
- [x] Phase 5: Admin dashboard
- [x] Phase 6: AI Chatbot
- [x] Phase 7: Product comparison
- [x] Phase 8: Polish & production readiness

### NestJS Backend (Learning)

- [x] Phase 1: Project scaffolding & configuration
- [x] Phase 2: Database entities & DTOs
- [x] Phase 3: Auth system
- [x] Phase 4: Core CRUD APIs
- [x] Phase 5: Admin dashboard
- [ ] Phase 6: AI Chatbot
- [x] Phase 7: Product comparison

## Architecture Overview

```mermaid
graph TB
  subgraph frontend [Frontend - TanStack Start]
    Router[TanStack Router]
    Query[TanStack Query]
    UI[shadcn/ui + TailwindCSS]
    ChatWidget[AI Chat Widget]
  end

  subgraph backend_fastapi [Backend - FastAPI Python]
    API_PY[API Routes]
    AuthService_PY[Auth Service]
    ProductService_PY[Product Service]
    AIService_PY[AI Chat Service]
  end

  subgraph backend_nest [Backend - NestJS TypeScript]
    API_TS[Controllers]
    AuthService_TS[Auth Module]
    ProductService_TS[Product Module]
    AIService_TS[AI Chat Module]
  end

  subgraph data [Data Layer]
    Neon[Neon PostgreSQL]
    Redis[Upstash Redis]
    Gemini[Google Gemini API]
  end

  frontend -->|HTTP/REST| backend_fastapi
  frontend -.->|HTTP/REST switchable| backend_nest
  API_PY --> Neon
  API_PY --> Redis
  API_TS --> Neon
  API_TS --> Redis
  AIService_PY --> Gemini
  AIService_TS --> Gemini
```

### NestJS vs Next.js — Mental Model for React Devs

| NestJS Concept | Next.js/React Equivalent | What It Does |
|---|---|---|
| **Module** (`@Module`) | Route group / layout boundary | Organizes related features; controls what's available where |
| **Controller** (`@Controller`) | API route handler (`app/api/...`) | Handles HTTP requests, defines endpoints |
| **Service** (`@Injectable`) | Server action / utility function | Business logic, reusable across controllers |
| **DTO** (Data Transfer Object) | Zod schema / TypeScript interface | Validates & shapes request/response data |
| **Entity** (TypeORM) | Prisma/Drizzle model | Maps to a database table |
| **Guard** (`@UseGuards`) | Middleware / `withAuth` HOC | Protects routes (auth checks) |
| **Interceptor** | React `Suspense` / error boundary | Wraps request/response (transform, cache, log) |
| **Pipe** | Zod `.parse()` in server action | Validates/transforms input before handler |
| **Decorator** | HOC / custom hook | Adds metadata or behavior declaratively |
| **Dependency Injection** | React Context + `useContext` | Provides instances to classes that need them |

## Project Structure

```
ai-commercial/
├── frontend/                    # TanStack Start app
│   ├── src/
│   │   ├── routes/
│   │   │   ├── __root.tsx       # Root layout
│   │   │   ├── index.tsx        # Home/landing page
│   │   │   ├── products/        # Product listing & detail
│   │   │   ├── shops/           # Shop listing & detail
│   │   │   ├── deals/           # Coupons & sales page
│   │   │   ├── compare/         # Product comparison page
│   │   │   ├── auth/            # Login, register, OAuth callback
│   │   │   └── admin/           # Admin dashboard
│   │   ├── components/
│   │   │   ├── ui/              # shadcn components
│   │   │   ├── chat/            # AI chatbot widget
│   │   │   ├── product/         # Product card, grid, detail
│   │   │   ├── layout/          # Header, footer, sidebar
│   │   │   └── admin/           # Admin-specific components
│   │   ├── lib/
│   │   │   ├── api.ts           # API client (fetch wrapper)
│   │   │   ├── auth.ts          # Auth utilities
│   │   │   └── utils.ts         # General utilities
│   │   └── styles.css           # TailwindCSS v4 styles
│   ├── components.json          # shadcn/ui config
│   ├── vite.config.ts           # Vite + TanStack Start config
│   └── package.json
│
├── backend/                     # FastAPI app
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── api/
│   │   │   ├── auth.py          # Auth endpoints
│   │   │   ├── products.py      # Product CRUD + search
│   │   │   ├── shops.py         # Shop CRUD
│   │   │   ├── coupons.py       # Coupon/sales endpoints
│   │   │   ├── compare.py       # Comparison endpoints
│   │   │   └── chat.py          # AI chat endpoint (SSE)
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── auth_service.py  # Auth logic, JWT, OAuth
│   │   │   ├── product_service.py
│   │   │   ├── coupon_service.py
│   │   │   └── ai_service.py    # Gemini integration + tools
│   │   ├── core/
│   │   │   ├── config.py        # Settings (env vars)
│   │   │   ├── database.py      # Neon/async SQLAlchemy
│   │   │   ├── redis.py         # Upstash Redis client
│   │   │   └── security.py      # Password hashing, JWT
│   │   └── migrations/          # Alembic migrations
│   ├── requirements.txt
│   └── alembic.ini
│
├── backend-nest/                   # NestJS app (learning backend)
│   ├── src/
│   │   ├── main.ts                 # Bootstrap (like Next.js server.ts)
│   │   ├── app.module.ts           # Root module (like _app.tsx / layout.tsx)
│   │   ├── config/                 # Configuration module
│   │   │   └── config.module.ts    # Env vars via @nestjs/config (like next.config.ts)
│   │   ├── database/               # Database setup
│   │   │   └── database.module.ts  # TypeORM connection (like prisma client)
│   │   ├── redis/                  # Redis module
│   │   │   └── redis.module.ts     # Upstash Redis client
│   │   ├── auth/                   # Auth module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts  # POST /auth/login, /auth/register (like app/api/auth)
│   │   │   ├── auth.service.ts     # Business logic
│   │   │   ├── strategies/         # Passport strategies (JWT, Google OAuth)
│   │   │   ├── guards/             # Auth guards (like middleware.ts)
│   │   │   └── dto/                # Validation DTOs (like Zod schemas)
│   │   ├── users/                  # Users module
│   │   ├── products/               # Products module
│   │   │   ├── products.module.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   ├── entities/           # TypeORM entities (like Prisma models)
│   │   │   └── dto/
│   │   ├── shops/                  # Shops module
│   │   ├── categories/             # Categories module
│   │   ├── coupons/                # Coupons module
│   │   └── common/                 # Shared utilities
│   │       ├── decorators/         # Custom decorators
│   │       ├── guards/             # Shared guards
│   │       ├── interceptors/       # Transform/logging interceptors
│   │       └── dto/                # Shared DTOs (pagination, etc.)
│   ├── test/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── nest-cli.json
│
├── .env.example                 # Environment variables template
├── .gitignore
└── PLAN.md
```

## Database Schema (Neon PostgreSQL)

```mermaid
erDiagram
  users {
    uuid id PK
    string email UK
    string password_hash
    string name
    string role "user | shop_admin | admin"
    string oauth_provider
    string oauth_id
    timestamp created_at
  }

  shops {
    uuid id PK
    uuid owner_id FK
    string name
    string description
    string logo_url
    string website
    boolean is_active
    timestamp created_at
  }

  categories {
    uuid id PK
    string name UK
    string slug UK
    uuid parent_id FK
  }

  products {
    uuid id PK
    uuid shop_id FK
    uuid category_id FK
    string name
    text description
    decimal price
    decimal original_price
    string image_url
    jsonb attributes
    boolean is_active
    timestamp created_at
  }

  coupons {
    uuid id PK
    uuid shop_id FK
    string code UK
    string description
    string discount_type "percentage | fixed"
    decimal discount_value
    decimal min_purchase
    timestamp valid_from
    timestamp valid_until
    boolean is_active
  }

  chat_sessions {
    uuid id PK
    uuid user_id FK
    timestamp created_at
  }

  chat_messages {
    uuid id PK
    uuid session_id FK
    string role "user | assistant"
    text content
    timestamp created_at
  }

  users ||--o{ shops : owns
  shops ||--o{ products : has
  shops ||--o{ coupons : offers
  categories ||--o{ products : categorizes
  categories ||--o{ categories : "parent of"
  users ||--o{ chat_sessions : has
  chat_sessions ||--o{ chat_messages : contains
```

## AI Chatbot Design

The chatbot uses **Google Gemini** with **function calling** (tool use) to interact with the database through predefined tools:

- **search_products(query, category, price_range)** - Search products by natural language
- **compare_products(product_ids)** - Compare 2+ products side by side
- **find_coupons(shop_name, category)** - Find active coupons/deals
- **get_shop_info(shop_name)** - Get shop details and their products
- **get_product_details(product_id)** - Get full product info

The AI will receive the tool results and formulate natural-language responses with product cards/links embedded via structured output.

## Auth Flow

- **Email/Password**: Register with email + password, bcrypt hashing, JWT access + refresh tokens stored in httpOnly cookies
- **OAuth (Google)**: Redirect flow via Google OAuth2, create/link user on callback
- **Sessions**: JWT tokens with Upstash Redis for token blacklisting (logout) and rate limiting

## Implementation Phases

### Phase 1: Project Scaffolding (DONE)

- Initialize TanStack Start frontend project with TailwindCSS and shadcn/ui
- Initialize FastAPI backend with project structure
- Set up Neon database connection and Alembic migrations
- Set up Upstash Redis connection
- Create `.env.example` with all required env vars

**FastAPI learning notes**:
- `FastAPI()` = the app instance (like `createApp()` in Express or `next()` in custom Next.js server)
- `uvicorn` = ASGI server that runs your app (like `next start` running the Node server)
- Python `async/await` = same concept as JS, but Python uses `asyncio` event loop under the hood
- `@app.on_event("startup")` / lifespan = setup code that runs once when server starts (like top-level `await` in a server module)

### Phase 2: Database Models & Migrations (DONE)

- Define SQLAlchemy models (users, shops, categories, products, coupons, chat_sessions, chat_messages)
- Create Pydantic request/response schemas for all entities
- Create Alembic migration scripts
- Seed script with sample data for development

**FastAPI learning notes**:
- `SQLAlchemy` ORM = like Prisma/Drizzle but for Python; models are classes with column definitions
- `Alembic` = migration tool (like `prisma migrate` or `drizzle-kit push`)
- `Pydantic` schemas = like Zod schemas; validates request/response data with type hints
- Python type hints (`str`, `int`, `Optional[str]`) = like TypeScript types but checked at runtime by Pydantic

### Phase 3: Auth System (DONE)

- Backend: JWT auth with password hashing, login/register endpoints, Google OAuth flow
- Backend: Redis-backed session management (token blacklisting) and rate limiting middleware
- Frontend: API client with auto-refresh, auth hooks (useAuth, useLogin, useRegister, useLogout)
- Frontend: Auth pages (login, register, Google OAuth callback), UserMenu component

**FastAPI learning notes**:
- `Depends()` = dependency injection (like React Context — provide once, use everywhere)
- `OAuth2PasswordBearer` = extracts JWT from request (like reading a cookie in `middleware.ts`)
- `bcrypt` = password hashing (same concept as `bcryptjs` in Node). Uses `bcrypt.hashpw()` / `bcrypt.checkpw()` directly
- `PyJWT` = JWT encode/decode (same concept as `jsonwebtoken` in Node). Replaced abandoned `python-jose`
- Python decorators (`@router.post`) = like TypeScript decorators or HOCs — wrap a function with extra behavior

### Phase 4: Core CRUD APIs & Pages (DONE)

- Backend: Product, Shop, Coupon, Category CRUD APIs with filtering/pagination
- Backend: Ownership authorization, pagination envelope, eager loading
- Frontend: Shared types, query hooks, API client integration
- Frontend: Product listing page with filters (category, price, shop, on_sale, search)
- Frontend: Product detail page with breadcrumbs and specs
- Frontend: Shop listing and detail pages (with inline coupons and products)
- Frontend: Deals/coupons page (active coupons + on-sale products)
- Frontend: Updated Header navigation (Products, Shops, Deals)

**FastAPI learning notes**:
- `@router.get("/products")` = route handler (like `export function GET()` in Next.js API routes)
- `Query(None)` = optional query parameter with default (like `searchParams.get("q")`)
- SQLAlchemy `select().where().options(joinedload())` = query building with eager loading (like Prisma `findMany({ where, include })`)
- `HTTPException(status_code=403)` = throwing HTTP errors (like `NextResponse.json({}, { status: 403 })`)

### Phase 5: Admin Dashboard (DONE)

- Backend: Admin router (`/admin/*`) with all endpoints protected by `get_current_admin` dependency
- Backend: Dashboard stats endpoint — aggregate counts (users, shops, products, coupons, active vs total)
- Backend: User management — list all users with search/role filter, change user roles
- Backend: Shop management — list all shops (including inactive) with owner info, toggle active status
- Backend: Product management — list all products (including inactive) with shop/category info, toggle active
- Backend: Coupon management — list all coupons with shop info, toggle active
- Frontend: Admin layout route with `beforeLoad` guard (redirects non-admins to `/`)
- Frontend: Sidebar navigation (desktop) + horizontal scroll nav (mobile)
- Frontend: Dashboard overview page with 8 stats cards
- Frontend: Users management page with role change (user → shop_admin → admin cycle)
- Frontend: Shops management page with activate/deactivate toggle
- Frontend: Products management page with create form, toggle active, delete
- Frontend: Coupons management page with create form, toggle active, delete
- Frontend: Reusable `AdminDataTable` component for all management pages
- Frontend: "Admin" nav link in Header (conditionally shown for admin users only)
- Frontend: Admin types (`AdminStats`, `AdminUser`, `AdminShop`, `AdminProduct`, `AdminCoupon`) and query hooks

**FastAPI learning notes**:
- Protecting an entire router: every endpoint uses `Depends(get_current_admin)` — like wrapping all routes in admin middleware
- `joinedload(Shop.owner)` in admin queries loads related user data in one SQL query (like Prisma `include: { owner: true }`)
- Admin schemas extend regular schemas with extra fields (owner_email, etc.) — separates public vs admin API responses
- `func.count()` with `select_from()` = aggregate queries (like `prisma.user.count()`)

**NestJS learning notes**:
- Controller-level `@UseGuards(JwtAuthGuard, AdminGuard)` = apply guards to ALL methods (like wrapping a route group in middleware)
- `Promise.all()` for parallel count queries — NestJS doesn't prescribe async patterns, you use standard JS/TS
- `AdminModule` imports `TypeOrmModule.forFeature([User, Shop, Product, Coupon, Category])` — registers all entity repositories for cross-entity queries
- `createQueryBuilder()` with `leftJoinAndSelect()` = complex queries with joins, like Prisma `include` + `where`

### Phase 6: AI Chatbot (DONE)

- Backend (FastAPI): `ai_service.py` — Google Gemini (`google-genai`) client with 5 function-calling tools: `search_products`, `get_product_details`, `find_coupons`, `get_shop_info`, `compare_products`
- Backend (FastAPI): Function-calling loop — model calls tools, results are fed back, up to 5 rounds until the model responds with text
- Backend (FastAPI): `api/chat.py` — Chat session CRUD (`POST /chat/sessions`, `GET /chat/sessions`, `GET /chat/sessions/{id}`, `DELETE /chat/sessions/{id}`)
- Backend (FastAPI): `POST /chat/sessions/{id}/messages` — SSE streaming endpoint using `StreamingResponse` with event types: `status`, `chunk`, `done`, `error`
- Backend (FastAPI): Chat history persistence — user and assistant messages saved to `chat_messages` table per session
- Frontend: `lib/chat.ts` — `useChat` hook with SSE stream parsing via `fetch` + `ReadableStream` (not `EventSource`, because we need POST with a JSON body)
- Frontend: `ChatWidget` — floating bottom-right bubble, opens a chat panel with header, message list, suggestion chips, and input field
- Frontend: `ChatMessage` — message bubbles with user/assistant avatars, basic markdown formatting (bold, code, bullet lists), streaming "Thinking..." indicator
- Frontend: Chat widget added to root layout (`__root.tsx`), available on every page
- Frontend: Auth-gated — shows "Sign in to chat" for unauthenticated users, auto-creates a session on first message

**FastAPI learning notes**:
- `StreamingResponse` with `text/event-stream` = SSE streaming. FastAPI keeps the `get_db` dependency alive for the full stream duration, so DB reads/writes work inside the async generator
- `google-genai` function calling: define `FunctionDeclaration` objects with `parameters_json_schema`, wrap in `types.Tool`, pass via `GenerateContentConfig`. The model returns `response.function_calls` when it wants to call tools
- Function calling loop: append `response.candidates[0].content` (model's function call), then `types.Content(role="tool", parts=[...function_response_parts])`, then call the model again
- `types.Part.from_function_response(name=..., response=...)` wraps tool results for Gemini
- SSE format: `event: <type>\ndata: <json>\n\n` — parsed manually on the frontend since `EventSource` API only supports GET requests

### Phase 7: Product Comparison (DONE)

- Backend (FastAPI): `GET /compare?ids=uuid1&ids=uuid2` — loads 2–5 products with shop/category joins, returns normalized attributes + `attribute_keys` (union of all JSONB attribute keys across compared products, sorted alphabetically)
- Backend (NestJS): `CompareModule` with controller, service, and `QueryCompareDto` (class-validator `@IsArray` + `@ArrayMinSize(2)` + `@ArrayMaxSize(5)`)
- Frontend: Compare state via `useSyncExternalStore` module-level store (`lib/compare.ts`) — no context provider needed
- Frontend: Compare toggle button on `ProductCard` (top-right corner, stops event propagation to avoid triggering the Link)
- Frontend: `/compare` route with side-by-side table — sticky first column for labels, dynamic attribute rows from `attribute_keys`
- Frontend: Floating `CompareBar` at bottom of screen (appears when products are selected, navigates to `/compare`)
- Frontend: "Compare" link in Header navigation

**FastAPI learning notes**:
- `Query(...)` with `list[uuid.UUID]` accepts repeated query params (`?ids=x&ids=y`) — like `searchParams.getAll("ids")` in the Web API
- JSONB attribute normalization: collect all keys across products into a `set`, sort them — the frontend uses this to render consistent table rows even when products have different attribute schemas

**NestJS learning notes**:
- `@Transform` from `class-transformer` handles the edge case where a single query param value arrives as a string instead of an array
- `Repository.find({ where: { id: In(ids) } })` with TypeORM's `In` operator — like Prisma's `where: { id: { in: ids } }`
- Module exports `CompareService` so the AI chatbot module can reuse comparison logic later

### Phase 8: Polish & Production Readiness

- Search optimization (PostgreSQL full-text search via `tsvector`)
- Redis caching for hot product/coupon queries
- Error handling, loading states, toast notifications
- Responsive design pass
- Environment-based configuration for deployment

---

## NestJS Backend — Implementation Phases

> Each phase explains backend concepts in terms you already know from Next.js/React.

### NestJS Phase 1: Project Scaffolding & Configuration

**What you'll learn**: How NestJS bootstraps (vs `next start`), module system, config management, database & cache connections.

- Initialize NestJS project with `@nestjs/cli`
- Set up `ConfigModule` for environment variables (similar to `next.config.ts` env)
- Set up `TypeORM` with Neon PostgreSQL (similar to Prisma/Drizzle setup)
- Set up `ioredis` with Upstash Redis
- CORS configuration (like `next.config.ts` headers)

**Key concepts**:
- `main.ts` = the server entry point (like `server.ts` in a custom Next.js server)
- `AppModule` = root module that imports all feature modules (like `_app.tsx` or root `layout.tsx`)
- `@Module({ imports, controllers, providers })` = declares what a module needs, exposes, and provides

### NestJS Phase 2: Database Entities & Migrations

**What you'll learn**: TypeORM entities (like Prisma models), decorators for columns/relations, migrations.

- Define TypeORM entities for all tables (users, shops, categories, products, coupons, chat)
- Create DTOs with `class-validator` decorators (like Zod schemas but using decorators)
- Set up TypeORM migrations (like `prisma migrate`)
- Create seed script

**Key concepts**:
- `@Entity()` = declares a class maps to a DB table (like `model User` in Prisma)
- `@Column()`, `@PrimaryGeneratedColumn('uuid')` = define table columns
- `@ManyToOne()`, `@OneToMany()` = relationships (like Prisma `@relation`)
- DTOs with `@IsString()`, `@IsEmail()` = runtime validation (Zod `.string()`, `.email()` equivalent)

### NestJS Phase 3: Auth System

**What you'll learn**: Passport.js integration, JWT strategy, guards (like Next.js middleware), bcrypt hashing.

- JWT authentication with `@nestjs/passport` + `passport-jwt`
- Password hashing with bcrypt
- Login/register endpoints in `AuthController`
- Google OAuth2 strategy with `passport-google-oauth20`
- Auth guard (`@UseGuards(JwtAuthGuard)`) — like `middleware.ts` protecting routes
- Redis-backed token blacklisting for logout
- Rate limiting with `@nestjs/throttler`

**Key concepts**:
- `Strategy` = a Passport pattern that extracts & validates credentials (JWT from cookie, OAuth token, etc.)
- `Guard` = runs before the controller method, decides allow/deny (like Next.js `middleware.ts`)
- `@UseGuards(JwtAuthGuard)` = decorator that protects an endpoint (like `withAuth()` HOC)
- `@CurrentUser()` = custom decorator to get the logged-in user (like a `useUser()` hook but server-side)

### NestJS Phase 4: Core CRUD APIs

**What you'll learn**: Controllers with route decorators, services with repository pattern, query builders, pagination.

- Product CRUD with filtering (category, price range, shop, search, on_sale) & pagination
- Shop CRUD with ownership checks
- Coupon CRUD with active/expired filtering
- Category CRUD with parent-child tree
- Pagination envelope response format (matching FastAPI's format for frontend compatibility)
- Ownership authorization via guards

**Key concepts**:
- `@Controller('products')` = defines route prefix (like `app/api/products/route.ts`)
- `@Get()`, `@Post()`, `@Patch()`, `@Delete()` = HTTP method decorators (like `export function GET/POST`)
- `@Query()`, `@Param()`, `@Body()` = extract parts of the request (like `searchParams`, `params`, `request.json()`)
- `Repository` pattern = data access layer (like Prisma client queries in a server action)
- `QueryBuilder` = complex queries with joins/filters (like Prisma's `where` + `include`)

### NestJS Phase 5: Admin Dashboard

**What you'll learn**: Controller-level guards, cross-entity aggregation, module-scoped repository imports.

- Admin module with controller, service, and DTOs
- Controller-level `@UseGuards(JwtAuthGuard, AdminGuard)` — protects all endpoints at once
- Dashboard stats via `Promise.all()` with multiple `.count()` calls across entities
- User management — list with search/role filter, update roles
- Shop management — list with owner join, toggle active status
- Product/coupon management — list all (including inactive), toggle active
- DTOs extending `PaginationQuery` for consistent query param validation

**Key concepts**:
- Controller-level `@UseGuards()` = applies guards to ALL methods in the controller (like a layout-level middleware)
- `TypeOrmModule.forFeature([User, Shop, Product, ...])` = register multiple repositories in one module for cross-entity queries
- `Promise.all()` for parallel DB queries = no NestJS-specific pattern, just standard async JS
- `createQueryBuilder().leftJoinAndSelect()` = eager-load related data in admin list views

### NestJS Phase 6: AI Chatbot

**What you'll learn**: SSE streaming in NestJS, integrating external AI APIs, service-to-service communication for tool execution.

- `ChatModule` with controller, service, and DTOs
- `ChatController` — session CRUD + `@Post(':id/messages')` SSE streaming endpoint
- `AiService` — Gemini client with function-calling tools (mirrors FastAPI's `ai_service.py`)
- Tool handler functions: `searchProducts`, `getProductDetails`, `findCoupons`, `getShopInfo`, `compareProducts`
- SSE streaming via `@Sse()` decorator or returning an `Observable` from `rxjs`
- Chat history: `ChatSession` and `ChatMessage` entities (already created in Phase 2)
- All endpoints protected with `@UseGuards(JwtAuthGuard)` + ownership checks

**Key concepts**:
- `@Sse()` decorator or returning `Observable<MessageEvent>` = NestJS's built-in SSE support (like `StreamingResponse` in FastAPI)
- `rxjs` `Observable` = NestJS uses reactive streams for SSE; you `yield` events in FastAPI, you `observer.next()` in NestJS
- `@google/genai` (or `google-genai` npm package) = same Gemini SDK, JavaScript version — function calling API mirrors the Python one
- Injecting multiple services: `AiService` depends on repositories for Product, Shop, Coupon, Category to execute tool queries
- `@Module({ imports: [TypeOrmModule.forFeature([ChatSession, ChatMessage, Product, Shop, Coupon, Category])] })` = register all entities the AI tools need

### NestJS Phase 7: Product Comparison

**What you'll learn**: Lightweight feature modules, `class-transformer` for query param coercion, TypeORM's `In` operator, exporting services for cross-module reuse.

- `CompareModule` with controller, service, and DTO
- `CompareController` — single `GET /compare?ids=uuid1&ids=uuid2` endpoint (no auth required, public data)
- `CompareService` — loads products by ID array with `In()` operator, joins shop + category, collects all JSONB attribute keys into a sorted union
- `QueryCompareDto` — validates repeated query params as a UUID array (`@IsArray`, `@ArrayMinSize(2)`, `@ArrayMaxSize(5)`, `@IsUUID('4', { each: true })`)
- `@Transform` decorator to handle single-value-to-array coercion (when only one `ids` param is sent, Express passes a string instead of an array)
- Module exports `CompareService` so `ChatModule` / `AiService` can reuse comparison logic

**Key concepts**:
- `In(ids)` from TypeORM = filters rows where column value is in a list (like Prisma's `where: { id: { in: ids } }`)
- `@Transform(({ value }) => Array.isArray(value) ? value : [value])` = `class-transformer` coercion for query params — needed because HTTP query strings don't distinguish arrays from single values
- `{ each: true }` on class-validator decorators = validate each element in an array (like Zod's `z.array(z.string().uuid())`)
- Exporting a service via `exports: [CompareService]` = makes it injectable in other modules that import `CompareModule` (like exporting a React context provider for other trees to consume)
