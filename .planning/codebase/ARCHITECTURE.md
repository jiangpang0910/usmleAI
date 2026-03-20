# Architecture

**Analysis Date:** 2026-03-20

## Pattern Overview

**Overall:** Full-stack monorepo with a decoupled frontend/backend architecture

**Key Characteristics:**
- Next.js 14 frontend (App Router) communicates with a FastAPI backend over HTTP REST
- Backend is stateless — all persistence is in PostgreSQL via SQLAlchemy ORM
- Frontend is thin: UI rendering, state, and API calls only; no business logic
- Claude AI (Anthropic SDK) is wired into the backend for question generation and teaching
- Docker Compose orchestrates the PostgreSQL database in development

## Layers

**Frontend — Presentation Layer:**
- Purpose: Render the UI, handle user interactions, call the backend API
- Location: `usmleAI/frontend/`
- Contains: Next.js pages, React components, Tailwind CSS styles, API client
- Depends on: Backend REST API (`http://localhost:8000` in dev, `NEXT_PUBLIC_API_URL` in prod)
- Used by: End users via browser

**Backend — Application Layer:**
- Purpose: Handle HTTP requests, apply business logic, orchestrate Claude AI calls, manage database operations
- Location: `usmleAI/backend/app/`
- Contains: FastAPI application, SQLAlchemy models, config, database setup
- Depends on: PostgreSQL (via SQLAlchemy), Claude API (via Anthropic SDK)
- Used by: Frontend (HTTP), direct API clients

**Data Layer — Persistence:**
- Purpose: Store all knowledge bank content (topics, subtopics, questions, answer options)
- Location: PostgreSQL database (Dockerized in dev, connection string in `usmleAI/backend/app/config.py`)
- Contains: Four tables — `topics`, `subtopics`, `questions`, `answer_options`
- Depends on: Docker Compose `db` service (`usmleAI/docker-compose.yml`)
- Used by: Backend via SQLAlchemy session (`usmleAI/backend/app/database.py`)

**Shared UI Primitives:**
- Purpose: Reusable, styled base components for the frontend
- Location: `usmleAI/frontend/components/ui/`
- Contains: `button.tsx`, `card.tsx` — built on Radix UI primitives + CVA variants
- Depends on: `@radix-ui/react-slot`, `class-variance-authority`, `usmleAI/frontend/lib/utils.ts`
- Used by: Feature components (e.g., `components/dashboard/Dashboard.tsx`)

## Data Flow

**Page Load / Dashboard Render:**

1. Browser requests `/` from Next.js
2. `usmleAI/frontend/app/page.tsx` renders and returns `<Dashboard />`
3. `usmleAI/frontend/components/dashboard/Dashboard.tsx` renders using static data arrays
4. No API calls on initial load — dashboard content is currently hardcoded

**Backend API Request (e.g., health check):**

1. Frontend calls `apiFetch("/")` from `usmleAI/frontend/lib/api.ts`
2. `apiFetch` sends `fetch(API_BASE_URL + endpoint)` with JSON headers
3. FastAPI receives the request at `usmleAI/backend/app/main.py`
4. Route handler executes, queries DB or calls Claude if needed
5. JSON response returned to frontend

**Database Session Lifecycle:**

1. Request arrives at a FastAPI route
2. Route declares `db: Session = Depends(get_db)` to receive a session
3. `get_db()` in `usmleAI/backend/app/database.py` yields a `SessionLocal()` instance
4. Route handler performs ORM queries on `db`
5. Session is closed in the `finally` block of `get_db()` after response

**Application Startup:**

1. Uvicorn starts, FastAPI `lifespan` context manager runs
2. All model modules are imported so SQLAlchemy registers their tables
3. `Base.metadata.create_all(bind=engine)` creates any missing tables
4. App begins accepting requests

**State Management:**
- No client-side state management library (no Redux, Zustand, etc.)
- React component local state (`useState`) used for UI interactions
- Server-authoritative: all persistent state lives in PostgreSQL

## Key Abstractions

**SQLAlchemy ORM Models:**
- Purpose: Define the knowledge bank schema as Python classes
- Examples: `usmleAI/backend/app/models/knowledge.py` — `Topic`, `Subtopic`, `Question`, `AnswerOption`
- Pattern: All models inherit from `Base` (declarative base in `usmleAI/backend/app/database.py`); UUIDs as primary keys; timezone-aware timestamps; eager loading via `lazy="selectin"`

**`apiFetch` Generic Client:**
- Purpose: Single typed fetch wrapper for all frontend-to-backend calls
- Location: `usmleAI/frontend/lib/api.ts`
- Pattern: `apiFetch<ResponseType>(endpoint, options?)` — throws on non-2xx, returns parsed JSON

**Settings / Config:**
- Purpose: Centralize all configuration with environment variable loading
- Location: `usmleAI/backend/app/config.py`
- Pattern: `pydantic-settings` `BaseSettings` class; module-level `settings` singleton imported throughout backend

**shadcn-style UI Components:**
- Purpose: Composable, styled primitives for building UI
- Location: `usmleAI/frontend/components/ui/`
- Pattern: `React.forwardRef` components; CVA variant system for `Button`; `cn()` utility for class merging; Radix UI `Slot` for polymorphic rendering

**`cn()` Utility:**
- Purpose: Merge Tailwind class strings with conflict resolution
- Location: `usmleAI/frontend/lib/utils.ts`
- Pattern: `cn(...inputs: ClassValue[])` — wraps `clsx` + `tailwind-merge`

## Entry Points

**Frontend Web Entry:**
- Location: `usmleAI/frontend/app/page.tsx`
- Triggers: Browser navigates to `/`
- Responsibilities: Render root page (currently mounts `<Dashboard />`)

**Frontend Layout:**
- Location: `usmleAI/frontend/app/layout.tsx`
- Triggers: Every page load
- Responsibilities: Provides HTML shell, Inter font, global CSS

**Backend API Entry:**
- Location: `usmleAI/backend/app/main.py`
- Triggers: Uvicorn process starts (`uvicorn app.main:app`)
- Responsibilities: Creates FastAPI app, registers CORS middleware, defines health check endpoint at `GET /`, runs `create_all` on startup

**Database Connection:**
- Location: `usmleAI/backend/app/database.py`
- Triggers: Imported by `main.py` and model files at startup
- Responsibilities: Creates SQLAlchemy engine and `SessionLocal` factory; exposes `get_db` FastAPI dependency

## Error Handling

**Strategy:** Fail-fast with descriptive errors; no global error boundary yet

**Patterns:**
- Frontend: `apiFetch` throws `Error("API error: {status} {statusText}")` on non-2xx responses; no try/catch wrappers in components yet
- Backend: FastAPI default exception handling returns structured JSON error responses for unhandled exceptions; no custom exception handlers defined yet
- Database: `get_db()` ensures session closure in `finally` block even on exception; no rollback logic defined

## Cross-Cutting Concerns

**Logging:** No structured logging configured; Python default logging and FastAPI/uvicorn request logs only
**Validation:** Pydantic validates all FastAPI request/response schemas automatically; `pydantic-settings` validates config on startup
**Authentication:** Not implemented — no auth middleware, no user sessions, no JWT tokens (planned for a future phase)
**CORS:** Configured in `usmleAI/backend/app/main.py` — allows `http://localhost:3000` in development with full credentials/methods/headers

---

*Architecture analysis: 2026-03-20*
