# AI Commercial Platform — Developer Documentation

> **Audience**: New developers (including juniors) joining this project. This document covers every feature, file, API endpoint, and pattern across the frontend and both backends so you can understand and contribute to the codebase quickly.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Environment Variables](#6-environment-variables)
7. [Authentication System](#7-authentication-system)
8. [API Reference](#8-api-reference)
9. [Frontend Deep Dive](#9-frontend-deep-dive)
10. [FastAPI Backend Deep Dive](#10-fastapi-backend-deep-dive)
11. [NestJS Backend Deep Dive](#11-nestjs-backend-deep-dive)
12. [AI Chatbot System](#12-ai-chatbot-system)
13. [Caching Strategy](#13-caching-strategy)
14. [Key Patterns & Conventions](#14-key-patterns--conventions)
15. [Common Tasks & How-Tos](#15-common-tasks--how-tos)

---

## 1. Project Overview

AI Commercial is a full-stack e-commerce platform with an AI chatbot powered by Google Gemini. Users can:

- **Browse products** with filtering (category, price range, search, on-sale)
- **View shops** and their product catalogs
- **Find deals** — active coupons and discounted products
- **Compare products** side by side (2–5 products)
- **Chat with an AI assistant** that can search products, find coupons, compare items, and look up shop info using real database data
- **Admin dashboard** — manage users, shops, products, and coupons

### Architecture

The system has three independent applications:

| Component | Port | Tech | Purpose |
|---|---|---|---|
| **Frontend** | 3000 | TanStack Start + React 19 + shadcn/ui | User interface |
| **FastAPI Backend** | 8000 | Python + FastAPI + SQLAlchemy | REST API (primary) |
| **NestJS Backend** | 8000 | TypeScript + NestJS + TypeORM | REST API (alternative, learning project) |

Both backends expose the **same API contract** (`/api/v1/*`), connect to the **same database** (Neon PostgreSQL), and use the **same cache** (Upstash Redis). The frontend can switch between them by changing `VITE_API_URL`.

```
┌────────────────────┐
│  Frontend (3000)   │ ──HTTP/REST──┐
│  TanStack Start    │              │
│  React 19          │              ▼
│  shadcn/ui         │     ┌────────────────┐     ┌──────────────┐
│  TailwindCSS v4    │     │  FastAPI (8000) │ ──► │ Neon         │
└────────────────────┘     │  OR             │     │ PostgreSQL   │
                           │  NestJS (8000)  │ ──► │              │
                           └────────────────┘     └──────────────┘
                                   │
                           ┌───────┼───────┐
                           ▼               ▼
                    ┌────────────┐  ┌──────────────┐
                    │ Upstash    │  │ Google       │
                    │ Redis      │  │ Gemini API   │
                    └────────────┘  └──────────────┘
```

---

## 2. Tech Stack

### Frontend

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.4 | UI library |
| `@tanstack/react-start` | 1.166.17 | Full-stack React framework (Vite-based) |
| `@tanstack/react-router` | 1.167.5 | File-based routing with type-safe params |
| `@tanstack/react-query` | 5.91.0 | Data fetching, caching, mutations |
| `tailwindcss` | ^4.2.2 | Utility-first CSS (v4) |
| `radix-ui` | ^1.4.3 | Headless UI primitives (used by shadcn/ui) |
| `lucide-react` | ^0.577.0 | Icons |
| `sonner` | ^2.0.7 | Toast notifications |
| `next-themes` | ^0.4.6 | Dark/light theme toggle |
| `class-variance-authority` | ^0.7.1 | Component variant styling (used by shadcn/ui) |

**Package manager**: pnpm 10.26.0

### FastAPI Backend (Python)

| Package | Purpose |
|---|---|
| `fastapi` >= 0.135.1 | Web framework |
| `uvicorn[standard]` >= 0.42.0 | ASGI server |
| `sqlalchemy[asyncio]` >= 2.0.48 | ORM + async DB access |
| `asyncpg` >= 0.31.0 | Async PostgreSQL driver |
| `alembic` >= 1.18.4 | Database migrations |
| `upstash-redis` >= 1.7.0 | Redis client (HTTP-based) |
| `PyJWT` >= 2.12.1 | JWT token creation/validation |
| `bcrypt` >= 5.0.0 | Password hashing |
| `google-genai` >= 1.68.0 | Google Gemini AI SDK |
| `pydantic-settings` >= 2.13.1 | Environment config validation |
| `httpx` >= 0.28.1 | Async HTTP client (for OAuth) |

### NestJS Backend (TypeScript)

| Package | Purpose |
|---|---|
| `@nestjs/core` ^11.1.17 | Framework core |
| `@nestjs/config` ^4.0.3 | Environment config |
| `@nestjs/typeorm` ^11.0.0 | TypeORM integration |
| `@nestjs/jwt` ^11.0.2 | JWT module |
| `@nestjs/passport` ^11.0.5 | Auth strategies |
| `@nestjs/throttler` ^6.5.0 | Rate limiting |
| `typeorm` ^0.3.28 | ORM |
| `pg` ^8.20.0 | PostgreSQL driver |
| `ioredis` ^5.10.0 | Redis client |
| `bcrypt` ^6.0.0 | Password hashing |
| `class-validator` 0.14.4 | DTO validation |
| `class-transformer` ^0.5.1 | DTO transformation |
| `passport-jwt` ^4.0.1 | JWT Passport strategy |

---

## 3. Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10.26.0
- **Python** >= 3.12 (for FastAPI backend)
- A **Neon PostgreSQL** database (free tier works)
- An **Upstash Redis** database (free tier works)
- A **Google Gemini API key** (for AI chatbot)
- (Optional) **Google OAuth** credentials (for Google sign-in)

### Setup Steps

#### 1. Clone and install

```bash
git clone <repo-url>
cd ai-commercial

# Frontend
cd frontend
pnpm install

# NestJS Backend
cd ../backend-nest
pnpm install

# FastAPI Backend
cd ../backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. Configure environment variables

```bash
# Copy the template
cp .env.example backend/.env

# For frontend
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` with your Neon, Upstash, and Gemini credentials (see [Environment Variables](#6-environment-variables)).

For the NestJS backend, the same `.env` file is used (it reads from `../.env` relative to `backend-nest/`).

#### 3. Run database migrations

**FastAPI (Alembic)**:
```bash
cd backend
alembic upgrade head
```

**NestJS (TypeORM)**:
```bash
cd backend-nest
pnpm run migration:run
```

#### 4. Seed sample data

```bash
# FastAPI
cd backend
python -m app.seed

# NestJS
cd backend-nest
pnpm run seed
```

#### 5. Start development servers

```bash
# Terminal 1 — Frontend
cd frontend
pnpm dev            # → http://localhost:3000

# Terminal 2 — FastAPI Backend
cd backend
uvicorn app.main:app --reload --port 8000

# OR Terminal 2 — NestJS Backend
cd backend-nest
pnpm dev            # → http://localhost:8000
```

> **Note**: Only run ONE backend at a time. Both listen on port 8000 by default. To switch between them, just stop one and start the other.

#### 6. Access Swagger Docs (FastAPI only)

When `DEBUG=true`, visit: http://localhost:8000/api/v1/docs

---

## 4. Project Structure

### Top Level

```
ai-commercial/
├── frontend/           # TanStack Start app (React)
├── backend/            # FastAPI app (Python)
├── backend-nest/       # NestJS app (TypeScript)
├── .env.example        # Backend env template
├── .gitignore
├── PLAN.md             # Architecture & implementation plan
└── DOCS.md             # This file
```

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── routes/                    # File-based routing (TanStack Router)
│   │   ├── __root.tsx             # Root layout — Header, Footer, ChatWidget, Toaster
│   │   ├── index.tsx              # Home/landing page
│   │   ├── about.tsx              # About page
│   │   ├── deals.tsx              # Coupons + on-sale products
│   │   ├── compare.tsx            # Product comparison table
│   │   ├── products/
│   │   │   ├── index.tsx          # Product listing with filters
│   │   │   └── $productId.tsx     # Product detail page
│   │   ├── shops/
│   │   │   ├── index.tsx          # Shop listing
│   │   │   └── $shopId.tsx        # Shop detail page
│   │   ├── auth/
│   │   │   ├── login.tsx          # Login form
│   │   │   ├── register.tsx       # Registration form
│   │   │   └── google/
│   │   │       └── callback.tsx   # Google OAuth callback handler
│   │   ├── admin.tsx              # Admin layout with auth guard
│   │   └── admin/
│   │       ├── index.tsx          # Dashboard overview (stats cards)
│   │       ├── users.tsx          # User management
│   │       ├── shops.tsx          # Shop management
│   │       ├── products.tsx       # Product management (CRUD)
│   │       └── coupons.tsx        # Coupon management (CRUD)
│   ├── components/
│   │   ├── Header.tsx             # Top navigation bar
│   │   ├── Footer.tsx             # Page footer
│   │   ├── UserMenu.tsx           # Logged-in user dropdown
│   │   ├── ThemeToggle.tsx        # Dark/light mode toggle
│   │   ├── CompareBar.tsx         # Floating compare bar (bottom)
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── sonner.tsx         # Toast provider
│   │   ├── product/
│   │   │   └── ProductCard.tsx    # Product card with compare toggle
│   │   ├── chat/
│   │   │   ├── ChatWidget.tsx     # Floating chat bubble + panel
│   │   │   └── ChatMessage.tsx    # Individual message bubble
│   │   └── admin/
│   │       ├── AdminSidebar.tsx   # Sidebar navigation
│   │       ├── AdminDataTable.tsx # Reusable data table
│   │       ├── StatsCard.tsx      # Dashboard stat card
│   │       ├── CreateProductForm.tsx
│   │       └── CreateCouponForm.tsx
│   ├── lib/
│   │   ├── api.ts                 # Fetch wrapper (auto-retry, cookies, timeout)
│   │   ├── auth.ts                # Auth types, useAuth, useLogin, useRegister, useLogout
│   │   ├── types.ts               # Shared TypeScript types (mirrors backend DTOs)
│   │   ├── queries.ts             # TanStack Query options + mutations
│   │   ├── chat.ts                # Chat API, SSE streaming, useChat hook
│   │   ├── compare.ts             # Compare store (useSyncExternalStore)
│   │   └── utils.ts               # General utilities (cn, formatPrice, etc.)
│   └── styles.css                 # TailwindCSS v4 imports
├── components.json                # shadcn/ui configuration
├── vite.config.ts                 # Vite + TanStack Start config
├── tsconfig.json
└── package.json
```

### FastAPI Backend (`backend/`)

```
backend/
├── app/
│   ├── main.py                    # FastAPI app entry, middleware, router registration
│   ├── api/                       # Route handlers (like Next.js API routes)
│   │   ├── auth.py                # Auth endpoints (login, register, OAuth, refresh)
│   │   ├── products.py            # Product CRUD + search + pagination
│   │   ├── shops.py               # Shop CRUD
│   │   ├── coupons.py             # Coupon CRUD
│   │   ├── categories.py          # Category CRUD (tree structure)
│   │   ├── compare.py             # Product comparison
│   │   ├── admin.py               # Admin management endpoints
│   │   └── chat.py                # AI chat SSE streaming
│   ├── models/                    # SQLAlchemy ORM models
│   │   ├── user.py                # User model
│   │   ├── shop.py                # Shop model
│   │   ├── product.py             # Product model (with JSONB attributes, tsvector search)
│   │   ├── category.py            # Category model (self-referential tree)
│   │   ├── coupon.py              # Coupon model
│   │   └── chat.py                # ChatSession + ChatMessage models
│   ├── schemas/                   # Pydantic validation schemas
│   │   ├── common.py              # PaginatedResponse[T] generic
│   │   ├── user.py                # UserCreate, UserLogin, UserResponse
│   │   ├── product.py             # ProductCreate, ProductUpdate, ProductResponse, ProductDetailResponse
│   │   ├── shop.py                # ShopCreate, ShopUpdate, ShopResponse
│   │   ├── coupon.py              # CouponCreate, CouponUpdate, CouponResponse
│   │   ├── category.py            # CategoryCreate, CategoryUpdate, CategoryResponse, CategoryWithChildren
│   │   ├── compare.py             # CompareProductItem, CompareResponse
│   │   ├── chat.py                # ChatSessionResponse, ChatMessageCreate, ChatMessageResponse
│   │   └── admin.py               # AdminStatsResponse, AdminUserResponse, etc.
│   ├── services/
│   │   ├── auth_service.py        # Register, authenticate, token blacklisting, OAuth
│   │   └── ai_service.py          # Gemini client, tool declarations, tool handlers, SSE events
│   ├── core/
│   │   ├── config.py              # Settings (pydantic-settings, reads .env)
│   │   ├── database.py            # Async SQLAlchemy engine + session factory
│   │   ├── redis.py               # Upstash Redis client
│   │   ├── security.py            # Password hashing (bcrypt), JWT encode/decode (PyJWT)
│   │   ├── dependencies.py        # get_current_user, get_current_admin (DI)
│   │   └── rate_limit.py          # Rate limiting middleware
│   ├── migrations/
│   │   ├── env.py                 # Alembic migration config
│   │   └── versions/              # Migration scripts
│   └── seed.py                    # Sample data seeder
├── requirements.txt
└── alembic.ini
```

### NestJS Backend (`backend-nest/`)

```
backend-nest/
├── src/
│   ├── main.ts                    # Bootstrap (CORS, validation, cookies, helmet)
│   ├── app.module.ts              # Root module (imports all feature modules)
│   ├── config/
│   │   └── env.validation.ts      # Environment variable validation schema
│   ├── database/
│   │   ├── database.module.ts     # TypeORM connection to Neon PostgreSQL
│   │   ├── data-source.ts         # TypeORM DataSource for CLI commands
│   │   ├── transformers/
│   │   │   └── numeric.transformer.ts  # Decimal string ↔ number transformer
│   │   ├── migrations/
│   │   │   └── 202603180001-init-schema.ts
│   │   └── seed.ts                # Sample data seeder
│   ├── redis/
│   │   ├── redis.module.ts        # ioredis provider module
│   │   └── redis.service.ts       # Redis wrapper service
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts     # Auth endpoints
│   │   ├── auth.service.ts        # Business logic (register, login, tokens)
│   │   ├── auth.service.spec.ts   # Unit tests
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts    # Passport JWT strategy (reads cookie)
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       ├── login.dto.ts
│   │       └── google-callback.dto.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   └── entities/
│   │       └── user.entity.ts     # User TypeORM entity
│   ├── products/
│   │   ├── products.module.ts
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── entities/
│   │   │   └── product.entity.ts
│   │   └── dto/
│   │       ├── create-product.dto.ts
│   │       ├── update-product.dto.ts
│   │       └── query-products.dto.ts
│   ├── shops/
│   │   ├── shops.module.ts
│   │   ├── shops.controller.ts
│   │   ├── shops.service.ts
│   │   ├── entities/
│   │   │   └── shop.entity.ts
│   │   └── dto/
│   │       ├── create-shop.dto.ts
│   │       ├── update-shop.dto.ts
│   │       └── query-shops.dto.ts
│   ├── categories/
│   │   ├── categories.module.ts
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   ├── entities/
│   │   │   └── category.entity.ts
│   │   └── dto/
│   │       ├── create-category.dto.ts
│   │       ├── update-category.dto.ts
│   │       └── query-categories.dto.ts
│   ├── coupons/
│   │   ├── coupons.module.ts
│   │   ├── coupons.controller.ts
│   │   ├── coupons.service.ts
│   │   ├── entities/
│   │   │   └── coupon.entity.ts
│   │   └── dto/
│   │       ├── create-coupon.dto.ts
│   │       ├── update-coupon.dto.ts
│   │       └── query-coupons.dto.ts
│   ├── compare/
│   │   ├── compare.module.ts
│   │   ├── compare.controller.ts
│   │   ├── compare.service.ts
│   │   └── dto/
│   │       └── query-compare.dto.ts
│   ├── admin/
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── dto/
│   │       └── admin-query.dto.ts
│   ├── chat/
│   │   └── entities/
│   │       ├── chat-session.entity.ts
│   │       └── chat-message.entity.ts
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts
│   │   └── health.service.ts
│   └── common/
│       ├── decorators/
│       │   └── current-user.decorator.ts  # @CurrentUser() param decorator
│       ├── guards/
│       │   ├── jwt-auth.guard.ts          # JwtAuthGuard
│       │   └── admin.guard.ts             # AdminGuard (role check)
│       ├── filters/
│       │   └── all-exceptions.filter.ts   # Global exception handler
│       └── dto/
│           └── pagination.dto.ts          # PaginationQueryDto base class
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

---

## 5. Database Schema

All tables use **UUIDs** as primary keys and live in a **Neon PostgreSQL** database.

### Tables

#### `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | User's unique identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, indexed | Login email |
| `password_hash` | VARCHAR(255) | nullable | bcrypt hash (null for OAuth users) |
| `name` | VARCHAR(255) | NOT NULL | Display name |
| `role` | VARCHAR(20) | NOT NULL, default `'user'` | One of: `user`, `shop_admin`, `admin` |
| `oauth_provider` | VARCHAR(50) | nullable | e.g., `'google'` |
| `oauth_id` | VARCHAR(255) | nullable | Provider's user ID |
| `created_at` | TIMESTAMPTZ | default `now()` | Account creation time |

#### `shops`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Shop identifier |
| `owner_id` | UUID | FK → users.id, NOT NULL | Who owns this shop |
| `name` | VARCHAR(255) | NOT NULL | Shop name |
| `description` | TEXT | nullable | Shop description |
| `logo_url` | VARCHAR(500) | nullable | Logo image URL |
| `website` | VARCHAR(500) | nullable | External website |
| `is_active` | BOOLEAN | default `true` | Admin can deactivate |
| `created_at` | TIMESTAMPTZ | default `now()` | Creation time |

#### `categories`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Category identifier |
| `name` | VARCHAR(255) | UNIQUE, NOT NULL | Display name |
| `slug` | VARCHAR(255) | UNIQUE, NOT NULL | URL-friendly name |
| `parent_id` | UUID | FK → categories.id, nullable | Self-referential (tree) |

#### `products`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Product identifier |
| `shop_id` | UUID | FK → shops.id, NOT NULL | Which shop sells this |
| `category_id` | UUID | FK → categories.id, NOT NULL | Product category |
| `name` | VARCHAR(255) | NOT NULL | Product name |
| `description` | TEXT | nullable | Full description |
| `price` | NUMERIC(10,2) | NOT NULL | Current price |
| `original_price` | NUMERIC(10,2) | nullable | Pre-sale price (null = not on sale) |
| `image_url` | VARCHAR(500) | nullable | Product image |
| `attributes` | JSONB | nullable | Flexible key-value specs (e.g., `{"ram": "16GB"}`) |
| `is_active` | BOOLEAN | default `true` | Admin can deactivate |
| `search_vector` | TSVECTOR | GIN indexed, computed | PostgreSQL full-text search (auto-generated from name + description) |
| `created_at` | TIMESTAMPTZ | default `now()` | Creation time |

#### `coupons`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Coupon identifier |
| `shop_id` | UUID | FK → shops.id, NOT NULL | Which shop offers this |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Coupon code (e.g., `SAVE20`) |
| `description` | TEXT | nullable | What the coupon is for |
| `discount_type` | VARCHAR(20) | NOT NULL | `'percentage'` or `'fixed'` |
| `discount_value` | NUMERIC(10,2) | NOT NULL | Amount (20 for 20%, or 10 for $10) |
| `min_purchase` | NUMERIC(10,2) | nullable | Minimum order to use coupon |
| `valid_from` | TIMESTAMPTZ | NOT NULL | When coupon becomes active |
| `valid_until` | TIMESTAMPTZ | NOT NULL | When coupon expires |
| `is_active` | BOOLEAN | default `true` | Admin can deactivate |

#### `chat_sessions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Session identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | Who owns this chat |
| `created_at` | TIMESTAMPTZ | default `now()` | Session start time |

#### `chat_messages`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Message identifier |
| `session_id` | UUID | FK → chat_sessions.id, NOT NULL | Which session |
| `role` | VARCHAR(20) | NOT NULL | `'user'` or `'assistant'` |
| `content` | TEXT | NOT NULL | Message text |
| `created_at` | TIMESTAMPTZ | default `now()` | When sent |

### Relationships

```
users  ──1:N──  shops         (a user owns many shops)
users  ──1:N──  chat_sessions (a user has many chat sessions)
shops  ──1:N──  products      (a shop has many products)
shops  ──1:N──  coupons       (a shop offers many coupons)
categories ──1:N── products   (a category has many products)
categories ──1:N── categories (self-referential tree: parent → children)
chat_sessions ──1:N── chat_messages (a session has many messages)
```

**Cascade deletes**: Deleting a user cascades to their shops/chat sessions. Deleting a shop cascades to its products/coupons. Deleting a chat session cascades to its messages.

---

## 6. Environment Variables

### Backend `.env` (used by both FastAPI and NestJS)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | Neon PostgreSQL connection string (must start with `postgresql://`) |
| `UPSTASH_REDIS_URL` | Yes | — | Upstash Redis REST URL |
| `UPSTASH_REDIS_TOKEN` | Yes | — | Upstash Redis auth token |
| `SECRET_KEY` | Yes | — | JWT signing secret (min 16 chars). Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DEBUG` | No | `false` | Enables Swagger docs, verbose logging |
| `GEMINI_API_KEY` | No | `""` | Google Gemini API key (required for AI chatbot) |
| `GOOGLE_CLIENT_ID` | No | `""` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | `""` | Google OAuth client secret |
| `FRONTEND_URL` | No | `http://localhost:3000` | Allowed CORS origin |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | JWT refresh token lifetime |

### Frontend `.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:8000/api/v1` | Backend API base URL |

> **Switching backends**: Set `VITE_API_URL=http://localhost:8001/api/v1` to point to NestJS if running on a different port.

---

## 7. Authentication System

### How It Works

1. **Tokens are stored in httpOnly cookies** (not localStorage) — this prevents XSS attacks from stealing tokens
2. **Access token** (30 min): Short-lived, used for every API request
3. **Refresh token** (7 days): Used only to get new access tokens when the old one expires
4. **Token blacklisting**: On logout, both tokens are added to Redis so they can't be reused

### Auth Flow Diagram

```
┌──────────┐                          ┌──────────┐
│ Frontend │                          │ Backend  │
└────┬─────┘                          └────┬─────┘
     │  POST /auth/login                   │
     │  { email, password }                │
     │ ──────────────────────────────────► │
     │                                     │ Verify password
     │                                     │ Create access + refresh tokens
     │  200 OK + Set-Cookie:               │
     │    access_token=... (httpOnly)      │
     │    refresh_token=... (httpOnly)     │
     │ ◄────────────────────────────────── │
     │                                     │
     │  GET /products                      │
     │  Cookie: access_token=...           │
     │ ──────────────────────────────────► │
     │                                     │ Decode JWT, verify user
     │  200 OK { products: [...] }         │
     │ ◄────────────────────────────────── │
     │                                     │
     │  (access token expires after 30m)   │
     │                                     │
     │  GET /products → 401                │
     │ ──────────────────────────────────► │
     │ ◄────────────────────────────────── │
     │                                     │
     │  POST /auth/refresh                 │
     │  Cookie: refresh_token=...          │
     │ ──────────────────────────────────► │
     │                                     │ Verify refresh token
     │  200 OK + new cookies               │ Blacklist old refresh token
     │ ◄────────────────────────────────── │ Issue new token pair
     │                                     │
     │  (retry original request)           │
     │ ──────────────────────────────────► │
```

### Frontend Auto-Refresh

The API client (`frontend/src/lib/api.ts`) handles token refresh automatically:

1. If a request returns **401** and the token hasn't been refreshed yet:
   - Call `POST /auth/refresh`
   - If refresh succeeds → retry the original request
   - If refresh fails → user needs to log in again
2. A **singleton promise** prevents multiple parallel refresh calls

### User Roles

| Role | Permissions |
|---|---|
| `user` | Browse products, use chat, compare products |
| `shop_admin` | All of `user` + create/edit/delete own shop's products and coupons |
| `admin` | All of `shop_admin` + access admin dashboard, manage all users/shops/products/coupons |

### Google OAuth Flow

1. Frontend: User clicks "Sign in with Google"
2. Frontend: Calls `GET /auth/google` → backend returns Google's OAuth consent URL
3. Frontend: Redirects user to Google
4. Google: User signs in, grants permissions → redirects to `frontend/auth/google/callback`
5. Frontend: Reads the `code` from URL, sends `POST /auth/google/callback { code }`
6. Backend: Exchanges code for Google access token → fetches Google user profile → creates or finds user → sets cookies

---

## 8. API Reference

All endpoints are prefixed with `/api/v1`. Both backends implement the same contract.

### Auth (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Create account. Body: `{ email, password, name }`. Returns user + sets cookies. |
| `POST` | `/auth/login` | No | Login. Body: `{ email, password }`. Returns user + sets cookies. |
| `POST` | `/auth/logout` | No | Blacklist tokens + clear cookies. Returns 204. |
| `POST` | `/auth/refresh` | Cookie | Exchange refresh token for new token pair. |
| `GET` | `/auth/me` | Yes | Get current user profile. |
| `GET` | `/auth/google` | No | Get Google OAuth consent URL. |
| `POST` | `/auth/google/callback` | No | Exchange Google auth code. Body: `{ code }`. |

### Products (`/products`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/products` | No | List products. Query params below. |
| `GET` | `/products/:id` | No | Get product by ID (with shop/category names). |
| `POST` | `/products` | Yes | Create product. Must own the shop. |
| `PATCH` | `/products/:id` | Yes | Update product. Must own the shop. |
| `DELETE` | `/products/:id` | Yes | Delete product. Must own the shop. Returns 204. |

**`GET /products` query params**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number (1-based) |
| `page_size` | int | 20 | Items per page (1–100) |
| `search` | string | — | Full-text search (uses PostgreSQL `tsvector`) |
| `category` | string | — | Category slug or UUID |
| `shop_id` | UUID | — | Filter by shop |
| `min_price` | float | — | Minimum price |
| `max_price` | float | — | Maximum price |
| `on_sale` | bool | false | Only products where `original_price > price` |

**Paginated response format** (all list endpoints use this):

```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "pages": 3
}
```

### Shops (`/shops`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/shops` | No | List active shops. Params: `page`, `page_size`, `search`. |
| `GET` | `/shops/:id` | No | Get shop by ID. |
| `POST` | `/shops` | Yes | Create shop (auto-upgrades user role to `shop_admin`). |
| `PATCH` | `/shops/:id` | Yes | Update shop (owner only). |
| `DELETE` | `/shops/:id` | Yes | Delete shop + all its products/coupons (owner only). |

### Coupons (`/coupons`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/coupons` | No | List coupons. Params: `page`, `page_size`, `shop_id`, `active_only` (default true). |
| `GET` | `/coupons/:id` | No | Get coupon by ID. |
| `POST` | `/coupons` | Yes | Create coupon (must own the shop). |
| `PATCH` | `/coupons/:id` | Yes | Update coupon (must own the shop). |
| `DELETE` | `/coupons/:id` | Yes | Delete coupon (must own the shop). |

### Categories (`/categories`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/categories` | No | List all categories as a nested tree. Pass `?flat=true` for a flat list. |
| `GET` | `/categories/:id` | No | Get category by ID. |
| `POST` | `/categories` | Admin | Create category. Body: `{ name, slug, parent_id? }`. |
| `PATCH` | `/categories/:id` | Admin | Update category. |
| `DELETE` | `/categories/:id` | Admin | Delete category (fails if products reference it). |

### Compare (`/compare`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/compare?ids=uuid1&ids=uuid2` | No | Compare 2–5 products. Returns products + `attribute_keys` (union of all JSONB keys). |

**Response**:
```json
{
  "products": [
    {
      "id": "...",
      "name": "MacBook Pro",
      "price": 1999.99,
      "original_price": 2299.99,
      "attributes": { "ram": "16GB", "storage": "512GB" },
      "shop_name": "Apple Store",
      "category_name": "Laptops",
      "on_sale": true
    }
  ],
  "attribute_keys": ["ram", "storage"]
}
```

### Chat (`/chat`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/chat/sessions` | Yes | Create a new chat session. |
| `GET` | `/chat/sessions` | Yes | List user's chat sessions. |
| `GET` | `/chat/sessions/:id` | Yes | Get session with all messages. |
| `DELETE` | `/chat/sessions/:id` | Yes | Delete session and its messages. |
| `POST` | `/chat/sessions/:id/messages` | Yes | Send message + receive AI response via **SSE stream**. |

**SSE stream events** from `POST /chat/sessions/:id/messages`:

| Event | Data | When |
|---|---|---|
| `status` | `{ "message": "Searching products..." }` | AI is executing a tool |
| `chunk` | `{ "text": "Here are some..." }` | Text content from AI |
| `done` | `{ "text": "full response" }` | Complete response ready |
| `error` | `{ "message": "Something went wrong" }` | Error occurred |

### Admin (`/admin`)

**All admin endpoints require `admin` role.**

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/stats` | Dashboard stats (counts of users, shops, products, coupons). |
| `GET` | `/admin/users` | List all users. Params: `page`, `page_size`, `search`, `role`. |
| `PATCH` | `/admin/users/:id/role` | Change user role. Body: `{ role }`. |
| `GET` | `/admin/shops` | List all shops (incl. inactive) with owner info. Params: `page`, `page_size`, `search`, `is_active`. |
| `PATCH` | `/admin/shops/:id/toggle-active` | Toggle shop active/inactive. |
| `GET` | `/admin/products` | List all products (incl. inactive) with shop/category. Params: `page`, `page_size`, `search`, `is_active`, `shop_id`. |
| `PATCH` | `/admin/products/:id/toggle-active` | Toggle product active/inactive. |
| `GET` | `/admin/coupons` | List all coupons with shop info. Params: `page`, `page_size`, `search`, `is_active`, `shop_id`. |
| `PATCH` | `/admin/coupons/:id/toggle-active` | Toggle coupon active/inactive. |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Basic health check. Returns `{ "status": "ok" }`. |
| `GET` | `/health/ready` | Deep health check (verifies DB + Redis). Returns 503 if either is down. |

---

## 9. Frontend Deep Dive

### Routing (TanStack Router)

TanStack Router uses **file-based routing** similar to Next.js:

| File | Route | Description |
|---|---|---|
| `__root.tsx` | (layout) | Root layout: `<Header>`, `<Outlet>`, `<Footer>`, `<ChatWidget>`, `<CompareBar>`, `<Toaster>` |
| `index.tsx` | `/` | Landing/home page |
| `products/index.tsx` | `/products` | Product listing with filter sidebar |
| `products/$productId.tsx` | `/products/:id` | Product detail page |
| `shops/index.tsx` | `/shops` | Shop listing |
| `shops/$shopId.tsx` | `/shops/:id` | Shop detail page |
| `deals.tsx` | `/deals` | Active coupons + on-sale products |
| `compare.tsx` | `/compare` | Side-by-side product comparison |
| `auth/login.tsx` | `/auth/login` | Login form |
| `auth/register.tsx` | `/auth/register` | Registration form |
| `auth/google/callback.tsx` | `/auth/google/callback` | Google OAuth code handler |
| `admin.tsx` | `/admin` (layout) | Admin layout with `beforeLoad` auth guard |
| `admin/index.tsx` | `/admin` | Dashboard stats cards |
| `admin/users.tsx` | `/admin/users` | User management table |
| `admin/shops.tsx` | `/admin/shops` | Shop management table |
| `admin/products.tsx` | `/admin/products` | Product management (CRUD) |
| `admin/coupons.tsx` | `/admin/coupons` | Coupon management (CRUD) |

### Data Fetching (TanStack Query)

All API calls go through `lib/api.ts` and are wrapped in TanStack Query hooks:

#### Query Options Pattern

```typescript
// Define once in lib/queries.ts
export const productsQueryOptions = (filters) =>
  queryOptions({
    queryKey: ['products', filters],     // Cache key
    queryFn: () => api.get('/products'), // Fetch function
  })

// Use in components
const { data, isLoading } = useQuery(productsQueryOptions({ page: 1 }))

// Use in route loaders (pre-fetch before render)
queryClient.ensureQueryData(productsQueryOptions({ page: 1 }))
```

#### Mutations Pattern

```typescript
// Define in lib/queries.ts
export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/products', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] }) // Refetch
      toast.success('Product created')
    },
  })
}

// Use in components
const { mutate, isPending } = useCreateProduct()
mutate({ name: 'New Product', price: 9.99, ... })
```

### Key Query Keys

| Key Pattern | What It Caches |
|---|---|
| `['auth', 'me']` | Current user (5 min stale time) |
| `['products', filters]` | Product list (auto-refetch on filter change) |
| `['products', id]` | Single product |
| `['shops', filters]` | Shop list |
| `['shops', id]` | Single shop |
| `['categories', { flat }]` | Categories (10 min stale time) |
| `['coupons', filters]` | Coupon list |
| `['compare', ids]` | Comparison data |
| `['admin', 'stats']` | Admin dashboard stats |
| `['admin', 'users', filters]` | Admin user list |
| `['admin', 'shops', filters]` | Admin shop list |
| `['admin', 'products', filters]` | Admin product list |
| `['admin', 'coupons', filters]` | Admin coupon list |

### API Client (`lib/api.ts`)

The `api` object wraps `fetch()` with:

- **Base URL**: Prepends `VITE_API_URL`
- **Credentials**: Always sends `credentials: 'include'` for cross-origin cookies
- **JSON**: Auto-serializes request body and parses response
- **Timeout**: 30-second timeout via `AbortController`
- **Auto-refresh**: On 401, tries to refresh the token and retries once
- **Error handling**: Throws `ApiError` with `status` and `detail`

```typescript
// Usage
const products = await api.get<PaginatedResponse<Product>>('/products?page=1')
const user = await api.post<User>('/auth/login', { email, password })
await api.delete('/products/some-uuid')
```

### Compare System (`lib/compare.ts`)

Uses `useSyncExternalStore` for a **module-level global store** (no React context provider needed):

```typescript
// Add/remove products from comparison list
toggleCompare(productId)  // Called from ProductCard

// Read the list reactively in any component
const { ids, count, isFull, toggle, clear } = useCompareList()
```

- Max 5 products
- The `CompareBar` component appears at the bottom when products are selected
- Navigates to `/compare?ids=...` when the user clicks "Compare"

### Chat System (`lib/chat.ts`)

The `useChat` hook manages:

1. **Session creation**: Auto-creates on first message
2. **Optimistic UI**: User messages appear immediately
3. **SSE streaming**: Reads `fetch` response as a `ReadableStream`, parses SSE events manually
4. **Status indicators**: Shows "Searching products..." etc. during tool execution
5. **Abort handling**: Cancels in-flight requests on unmount

```typescript
const { messages, isLoading, statusMessage, sendMessage, clearChat } = useChat()
```

### Component Highlights

| Component | Description |
|---|---|
| `Header` | Top nav with links (Products, Shops, Deals, Compare). Shows `UserMenu` when logged in, login button when not. Admin link for admin users. |
| `ChatWidget` | Floating bubble (bottom-right). Opens a chat panel. Shows suggestion chips for first message. Auth-gated. |
| `ChatMessage` | Renders messages with user/assistant avatars. Basic markdown formatting. Streaming indicator. |
| `ProductCard` | Product card with image, name, price, sale badge, shop name. Compare toggle button (top-right). |
| `CompareBar` | Floating bar at bottom showing selected product count. Navigate/clear buttons. |
| `AdminDataTable` | Reusable table with search, pagination, and action columns. Used on all admin management pages. |
| `StatsCard` | Simple card showing a metric (label + number). Used on admin dashboard. |
| `CreateProductForm` | Form with shop/category selects, name, price fields. Validates and submits via mutation. |
| `CreateCouponForm` | Form with shop select, code, discount type/value, date pickers. |

---

## 10. FastAPI Backend Deep Dive

### Application Bootstrap (`main.py`)

The FastAPI app is configured with:

1. **Lifespan**: Startup/shutdown logging
2. **Global exception handler**: Catches unhandled errors, returns 500 with `X-Request-ID`
3. **Request logging middleware**: Logs method, path, status, duration, request ID
4. **Rate limiting**: 60 requests/minute per IP (via custom middleware)
5. **CORS**: Only allows the frontend origin, credentials enabled
6. **Swagger docs**: Available at `/api/v1/docs` when `DEBUG=true`

### Configuration (`core/config.py`)

Uses `pydantic-settings` to load and validate environment variables:

```python
class Settings(BaseSettings):
    database_url: str           # Required — fails fast if missing
    secret_key: str = Field(min_length=16)
    debug: bool = False         # Optional with default
    ...
```

The `Settings()` instance is created at module level and imported throughout the app.

### Database (`core/database.py`)

- **Engine**: Async SQLAlchemy with `asyncpg` driver, connection pooling (5 + 10 overflow)
- **Session factory**: `async_sessionmaker` with `expire_on_commit=False`
- **Dependency**: `get_db()` is an async generator that provides a session per request, auto-commits on success, auto-rollbacks on error

```python
async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### Auth Dependencies (`core/dependencies.py`)

Two dependency functions used throughout the API:

- **`get_current_user`**: Reads `access_token` cookie → checks blacklist → decodes JWT → loads user from DB → returns `User` or raises 401
- **`get_current_admin`**: Chains `get_current_user` → checks `role == 'admin'` → returns `User` or raises 403

Usage:
```python
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
```

### Security (`core/security.py`)

- **`hash_password(password)`**: bcrypt hash
- **`verify_password(plain, hashed)`**: bcrypt verify
- **`create_access_token(data)`**: JWT with 30min expiry, type="access"
- **`create_refresh_token(data)`**: JWT with 7-day expiry, type="refresh"
- **`decode_token(token)`**: JWT decode

### Redis (`core/redis.py`)

Uses `upstash-redis` async client (HTTP-based, no connection pool needed).

Used for:
- **Token blacklisting**: `SET blacklist:{token} 1 EX {ttl}`
- **Response caching**: Products and coupons cached for 60 seconds with versioned keys
- **Rate limiting**: Per-IP request counters

### Models (SQLAlchemy ORM)

Each model maps to a PostgreSQL table. Key patterns:

- **UUID primary keys**: `default=uuid.uuid4`
- **Server defaults**: `server_default="user"` / `server_default=func.now()`
- **Relationships**: `relationship(back_populates=...)` for bidirectional links
- **Cascade deletes**: `cascade="all, delete-orphan"` on parent side
- **JSONB**: `attributes` column on Product for flexible key-value specs
- **Full-text search**: `search_vector` TSVECTOR column with GIN index, auto-computed from name + description

### Schemas (Pydantic)

Schemas validate request bodies and shape responses:

- **`*Create`**: Validates POST body (e.g., `ProductCreate`)
- **`*Update`**: Validates PATCH body — all fields optional
- **`*Response`**: Shapes the JSON response (strips sensitive fields like `password_hash`)
- **`PaginatedResponse[T]`**: Generic wrapper for paginated lists

### Migrations (Alembic)

Located in `app/migrations/versions/`. Key migrations:

1. `12b827b4c094_create_initial_tables.py` — All core tables
2. `add_missing_indexes.py` — Performance indexes on FK columns
3. `b4g2d3e5f678_add_search_vector_to_products.py` — Full-text search tsvector

Run migrations: `alembic upgrade head`
Create new: `alembic revision --autogenerate -m "description"`

---

## 11. NestJS Backend Deep Dive

### Application Bootstrap (`main.ts`)

```typescript
const app = await NestFactory.create(AppModule);
```

Configured with:

1. **Helmet**: Security headers
2. **Global exception filter**: `AllExceptionsFilter`
3. **Class serializer interceptor**: Auto-transforms entities (respects `@Exclude()` decorators)
4. **Global prefix**: `api/v1` (excluding health endpoints)
5. **CORS**: From `FRONTEND_URL` env var, credentials enabled
6. **Cookie parser**: Reads httpOnly cookies
7. **Origin verification**: Middleware checks `Origin`/`Referer` against allowed origins for mutating requests
8. **Global ValidationPipe**: Auto-validates all DTOs, strips unknown fields, transforms types

### Module System

NestJS organizes code into **modules**. Each module groups related controllers, services, and entities:

```
AppModule (root)
├── ConfigModule        (global env vars)
├── ThrottlerModule     (rate limiting: 60 req/60s)
├── DatabaseModule      (TypeORM + Neon PostgreSQL)
├── RedisModule         (ioredis + Upstash)
├── AuthModule          (login, register, JWT, OAuth)
├── UsersModule         (user entity + service)
├── CategoriesModule    (category CRUD)
├── ShopsModule         (shop CRUD)
├── ProductsModule      (product CRUD + search)
├── CouponsModule       (coupon CRUD)
├── CompareModule       (product comparison)
├── AdminModule         (admin dashboard + management)
└── HealthModule        (health checks)
```

### NestJS Request Lifecycle

```
Request → ThrottlerGuard → Controller → ValidationPipe → Guard(s) → Handler → Interceptor → Response
```

1. **ThrottlerGuard** (global): Rate limiting check
2. **Controller**: Routes the request to the correct handler method
3. **ValidationPipe** (global): Validates DTO using class-validator decorators
4. **Guards** (route-level): `JwtAuthGuard`, `AdminGuard`
5. **Handler**: Controller method executes, calls service
6. **ClassSerializerInterceptor** (global): Transforms response (applies `@Exclude()`)

### Auth Module

**Strategy pattern**: Uses Passport.js with a JWT strategy that reads from cookies:

```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: (req) => req?.cookies?.['access_token'],
      secretOrKey: configService.get('SECRET_KEY'),
    });
  }

  async validate(payload) {
    // Check blacklist, load user from DB
    return user;
  }
}
```

**Guards**:
- `JwtAuthGuard`: Triggers JWT strategy validation
- `AdminGuard`: Checks `user.role === 'admin'`

**Custom decorator**:
```typescript
// @CurrentUser() extracts user from request
@Get('me')
@UseGuards(JwtAuthGuard)
getMe(@CurrentUser() user: User) {
  return user;
}
```

### TypeORM Entities

TypeORM entities use decorators to define columns and relationships:

```typescript
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: new NumericTransformer() })
  price: number;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, any> | null;

  @ManyToOne(() => Shop, (shop) => shop.products)
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;
}
```

**NumericTransformer**: Converts PostgreSQL's `numeric` strings to JavaScript numbers.

### DTOs (Data Transfer Objects)

DTOs use `class-validator` decorators for runtime validation:

```typescript
export class CreateProductDto {
  @IsUUID()
  shop_id: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}
```

Query DTOs use `class-transformer` for type conversion:

```typescript
export class QueryProductsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  min_price?: number;
}
```

### Service Pattern

Services contain business logic and use injected repositories:

```typescript
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Shop) private shopRepo: Repository<Shop>,
  ) {}

  async findAll(query: QueryProductsDto) {
    const qb = this.productRepo.createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.is_active = :active', { active: true });

    if (query.search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${query.search}%` });
    }
    // ... more filters, pagination
  }
}
```

### Compare Module

Exports `CompareService` so it can be reused by the AI chatbot module:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [CompareController],
  providers: [CompareService],
  exports: [CompareService],  // ← Available to other modules
})
export class CompareModule {}
```

### Key Differences from FastAPI

| Concern | FastAPI | NestJS |
|---|---|---|
| Dependency Injection | `Depends(get_current_user)` function | `@Injectable()` + constructor injection |
| Validation | Pydantic schemas (type hints) | class-validator decorators |
| ORM | SQLAlchemy (async, Python) | TypeORM (sync-style with async repos) |
| Guards | Dependency functions | `@UseGuards()` decorator |
| Response shaping | `response_model=Schema` | `ClassSerializerInterceptor` + `@Exclude()` |
| SSE Streaming | `StreamingResponse` + async generator | `Observable` from rxjs |
| Rate Limiting | Custom middleware | `@nestjs/throttler` |

---

## 12. AI Chatbot System

### Architecture

```
User → Chat Widget → POST /chat/sessions/:id/messages → Backend
                                                           │
                                                    ┌──────┴──────┐
                                                    │ Gemini API  │
                                                    │ (gemini-    │
                                                    │  2.0-flash) │
                                                    └──────┬──────┘
                                                           │
                                                  Function Calling
                                                    (up to 5 rounds)
                                                           │
                                                    ┌──────┴──────┐
                                                    │  Database   │
                                                    │  Queries    │
                                                    └─────────────┘
```

### How Function Calling Works

1. The user sends a message (e.g., "Show me laptops under $1000")
2. The backend sends the conversation history + **tool declarations** to Gemini
3. Gemini decides it needs data and returns a **function call**: `search_products({ query: "laptops", max_price: 1000 })`
4. The backend **executes the function** against the database
5. The backend sends the **results back to Gemini**
6. Gemini formulates a **natural-language response** using the data
7. Steps 3–6 can repeat up to **5 times** if Gemini needs more data

### Available AI Tools

| Tool | Parameters | What It Does |
|---|---|---|
| `search_products` | `query`, `category`, `min_price`, `max_price`, `on_sale` | Search products by name/category/price. Returns up to 10 matches. |
| `get_product_details` | `product_id` (required) | Get full details of a specific product. |
| `find_coupons` | `shop_name` | Find active coupons, optionally filtered by shop. |
| `get_shop_info` | `shop_name` (required) | Get shop details + products + coupons. |
| `compare_products` | `product_ids` (required, 2–5) | Compare products side by side. |

### System Prompt

The AI is instructed to:
- Always use tools for real data (never make up products/prices)
- Include name, price, and shop when mentioning products
- Highlight discounts and sale prices
- Include coupon codes, amounts, and expiry dates
- Be concise with bullet points
- Suggest alternatives when no results found

### SSE Event Flow

```
Frontend                    Backend                    Gemini
   │                          │                          │
   │ POST message             │                          │
   │ ───────────────────────► │                          │
   │                          │ Send history + tools     │
   │                          │ ────────────────────────►│
   │                          │                          │
   │                          │ Function call response   │
   │                          │ ◄────────────────────────│
   │ event: status            │                          │
   │ "Searching products..."  │                          │
   │ ◄─────────────────────── │ Execute DB query         │
   │                          │ Send results back        │
   │                          │ ────────────────────────►│
   │                          │                          │
   │                          │ Text response            │
   │                          │ ◄────────────────────────│
   │ event: chunk             │                          │
   │ "Here are some..."       │                          │
   │ ◄─────────────────────── │                          │
   │                          │                          │
   │ event: done              │                          │
   │ "full response"          │                          │
   │ ◄─────────────────────── │ Save to chat_messages    │
```

### Implementation Status

| Backend | Status |
|---|---|
| FastAPI | Fully implemented (Phase 6 complete) |
| NestJS | **Not yet implemented** (Phase 6 pending) — entities exist, AI service not built |

---

## 13. Caching Strategy

### What Gets Cached

| Data | Cache Key Pattern | TTL | Invalidation |
|---|---|---|---|
| Product lists | `products:list:v{version}:{params}` | 60s | Version bump on create/update/delete |
| Product details | `product:detail:{id}` | 60s | Delete on update |
| Coupon lists | `coupons:list:v{version}:{params}` | 60s | Version bump on create/update/delete |
| Coupon details | `coupon:detail:{id}` | 60s | Delete on update |
| Token blacklist | `blacklist:{token}` | Token TTL | Never (expires with token) |
| Rate limits | `rate_limit:{ip}` | 60s | Auto-expire |

### Version-Based Cache Invalidation

Instead of deleting every cached variant when data changes, we use a **version counter**:

1. Each cache key includes a version: `products:list:v3:page=1:search=laptop`
2. When any product changes, we increment the version: `INCR products:list:version`
3. New requests build keys with the new version → cache miss → fresh data
4. Old cached entries expire naturally after 60 seconds

This is more efficient than scanning and deleting hundreds of cached variants.

### Graceful Degradation

All Redis operations are wrapped in try/catch. If Redis is down:
- Cache reads return `null` → data is fetched from PostgreSQL directly
- Cache writes silently fail → system continues without caching
- A warning is logged for monitoring

---

## 14. Key Patterns & Conventions

### Error Handling

**Backend responses** follow this format:
```json
{ "detail": "Product not found" }
```

Standard HTTP status codes:
| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete success) |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (wrong role/not owner) |
| 404 | Not Found |
| 409 | Conflict (email already exists) |
| 422 | Validation Error (invalid body/params) |
| 429 | Rate Limited |
| 500 | Internal Server Error |

**Frontend** catches errors via `ApiError`:
```typescript
try {
  await api.post('/auth/login', data)
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.status, error.detail)
  }
}
```

### Pagination Envelope

All list endpoints return:
```typescript
interface PaginatedResponse<T> {
  items: T[]
  total: number       // Total matching records
  page: number        // Current page (1-based)
  page_size: number   // Items per page
  pages: number       // Total pages (ceil(total / page_size))
}
```

### Ownership Authorization Pattern

For create/update/delete on products and coupons:

1. Load the resource (product/coupon)
2. Load its parent shop (via relation or separate query)
3. Check if `shop.owner_id === current_user.id` OR `current_user.role === 'admin'`
4. If not → 403 Forbidden

### Naming Conventions

| Layer | Convention | Example |
|---|---|---|
| Database tables | snake_case, plural | `chat_messages` |
| Python variables | snake_case | `current_user` |
| TypeScript variables | camelCase | `currentUser` |
| API endpoints | kebab-case | `/toggle-active` |
| Query params | snake_case | `page_size`, `shop_id` |
| Response fields | snake_case | `created_at`, `shop_name` |
| React components | PascalCase | `ProductCard` |
| CSS classes | Tailwind utilities | `flex items-center gap-2` |

### Cookie Settings

Both backends set auth cookies with:
```
httpOnly: true        # Can't be read by JavaScript (XSS protection)
sameSite: 'lax'       # Prevents CSRF
secure: true          # HTTPS only (in production)
path: '/'             # Sent on all routes
```

---

## 15. Common Tasks & How-Tos

### Add a new API endpoint

**FastAPI**:
1. Add route function in the relevant `app/api/*.py` file
2. Create/update Pydantic schemas in `app/schemas/`
3. If new model needed, add in `app/models/` and create a migration

**NestJS**:
1. Add method in the relevant controller (`*.controller.ts`)
2. Add business logic in the service (`*.service.ts`)
3. Create/update DTO in the module's `dto/` folder
4. If new entity needed, add in `entities/` and create a migration

### Add a new frontend page

1. Create a file in `frontend/src/routes/` following the file-based routing convention
2. Export a `Route` with `component` and optionally `loader` / `beforeLoad`
3. Add query options in `lib/queries.ts` if fetching data
4. Add types in `lib/types.ts` if new response shapes

### Add a new admin management page

1. Create route file at `frontend/src/routes/admin/newpage.tsx`
2. Use `AdminDataTable` component for the table
3. Add query options + mutations in `lib/queries.ts`
4. Add a navigation link in `AdminSidebar.tsx`
5. Add backend endpoints if needed (protected by `get_current_admin`)

### Run database migrations

```bash
# FastAPI — Create migration from model changes
cd backend
alembic revision --autogenerate -m "add_new_column"
alembic upgrade head

# NestJS — Create migration from entity changes
cd backend-nest
pnpm run migration:generate -- -n AddNewColumn
pnpm run migration:run
```

### Add a new shadcn/ui component

```bash
cd frontend
npx shadcn@latest add <component-name>
```

Components are installed to `src/components/ui/`.

### Test the API manually

```bash
# FastAPI — use Swagger UI
# Visit http://localhost:8000/api/v1/docs (when DEBUG=true)

# Or use curl
curl http://localhost:8000/api/v1/products?page=1&page_size=5
curl http://localhost:8000/health/ready
```

### Switch between backends

1. Stop the current backend
2. Start the other backend on port 8000
3. (Optional) Update `VITE_API_URL` in `frontend/.env` if using a different port

Both backends implement the exact same API contract, so the frontend works with either one without any code changes.

---

## Appendix: FastAPI ↔ NestJS ↔ Next.js Concept Map

| Concept | FastAPI (Python) | NestJS (TypeScript) | Next.js (React) |
|---|---|---|---|
| Route definition | `@router.get("/path")` | `@Get('path')` | `app/api/path/route.ts` |
| Request body | Pydantic model param | `@Body() dto: CreateDto` | `await request.json()` |
| Query params | `Query(default)` param | `@Query() dto: QueryDto` | `searchParams.get()` |
| Path params | Function param with type | `@Param('id') id: string` | `params.id` |
| Auth guard | `Depends(get_current_user)` | `@UseGuards(JwtAuthGuard)` | `middleware.ts` |
| Get current user | `user = Depends(get_current_user)` | `@CurrentUser() user: User` | `getServerSession()` |
| Validation | Pydantic auto-validates | `class-validator` + `ValidationPipe` | Zod `.parse()` |
| ORM model | SQLAlchemy class + `Base` | TypeORM class + `@Entity()` | Prisma `model` |
| DB query | `select(Model).where(...)` | `repo.createQueryBuilder()` | `prisma.model.findMany()` |
| Eager loading | `joinedload(Model.relation)` | `leftJoinAndSelect()` | `include: { relation: true }` |
| Migration tool | Alembic | TypeORM CLI | Prisma Migrate |
| Env config | `pydantic-settings` | `@nestjs/config` | `next.config.ts` env |
| HTTP client | `httpx.AsyncClient` | Built-in `fetch` | `fetch` |
| DI | `Depends()` function | Constructor injection | React Context |
| Module system | Manual router includes | `@Module({ imports })` | File-system routes |
| SSE streaming | `StreamingResponse` + async gen | `Observable<MessageEvent>` | Streaming response |
