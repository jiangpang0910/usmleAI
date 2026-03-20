# Technology Stack

**Analysis Date:** 2026-03-20

## Overview

usmleAI is a full-stack monorepo with two separate projects:
- **usmleAI** (`/home/jiangpang/usmleAI/`) — AI-powered USMLE study platform (primary project)
- **firstproj / braintutor** (`/home/jiangpang/firstproj/`) — 3D brain visualization app (secondary project)

All sections below describe the **usmleAI** project unless otherwise noted.

---

## Languages

**Primary:**
- TypeScript 5.9.3 — Frontend (Next.js), strict mode enabled
- Python 3.12.3 — Backend (FastAPI)

**Secondary:**
- CSS (via Tailwind utility classes) — Styling

---

## Runtime

**Frontend Environment:**
- Node.js 18.19.1

**Backend Environment:**
- Python 3.12.3

**Package Manager (Frontend):**
- npm (package-lock.json present at `/home/jiangpang/usmleAI/frontend/package-lock.json`)

**Package Manager (braintutor project):**
- pnpm 10.32.1 (pnpm-workspace.yaml at `/home/jiangpang/firstproj/pnpm-workspace.yaml`)

---

## Frameworks

**Frontend Core:**
- Next.js 14.2.35 — React framework with App Router, SSR/SSG
  - Config: `/home/jiangpang/usmleAI/frontend/next.config.mjs` (minimal)
- React 18.3.1 — UI library
  - Entry: `/home/jiangpang/usmleAI/frontend/app/layout.tsx`, `/home/jiangpang/usmleAI/frontend/app/page.tsx`

**Backend Core:**
- FastAPI 0.115.6 — Python async web framework, OpenAPI docs auto-generated
  - Entry: `/home/jiangpang/usmleAI/backend/app/main.py`
- Uvicorn 0.34.0 (standard extras) — ASGI server for FastAPI

**ORM / Database:**
- SQLAlchemy 2.0.36 — ORM and query builder
  - Session management: `/home/jiangpang/usmleAI/backend/app/database.py`
- Alembic 1.14.1 — Database migrations (installed but no migration directory detected yet)

**Settings:**
- pydantic-settings 2.7.1 — Environment-based configuration with .env file support
  - Config class: `/home/jiangpang/usmleAI/backend/app/config.py`

---

## UI Component Library

**shadcn/ui (component pattern):**
- Components live at `/home/jiangpang/usmleAI/frontend/components/ui/`
- Uses Radix UI primitives: `@radix-ui/react-slot ^1.2.4`
- Styling utilities: `clsx ^2.1.1`, `tailwind-merge ^3.5.0`, `class-variance-authority ^0.7.1`
- Icon library: `lucide-react ^0.577.0`

**Tailwind CSS 3.4.19:**
- Config: `/home/jiangpang/usmleAI/frontend/tailwind.config.ts`
- PostCSS config: `/home/jiangpang/usmleAI/frontend/postcss.config.mjs`
- Plugin: `tailwindcss-animate ^1.0.7`
- Dark mode: class-based strategy (configured, not yet fully implemented)

**Typography:**
- Google Fonts — Inter (loaded via `next/font/google` in layout)

---

## Key Dependencies

**Frontend:**
- `next ^14.2.35` — Framework
- `react ^18.3.1` — UI library
- `@radix-ui/react-slot ^1.2.4` — Headless UI primitives
- `class-variance-authority ^0.7.1` — Component variant management
- `tailwind-merge ^3.5.0` — Merge Tailwind classes without conflicts
- `clsx ^2.1.1` — Conditional className builder
- `lucide-react ^0.577.0` — Icon set

**Backend (Python):**
- `fastapi==0.115.6` — Web framework
- `uvicorn[standard]==0.34.0` — ASGI server
- `sqlalchemy==2.0.36` — ORM
- `psycopg2-binary==2.9.10` — PostgreSQL adapter
- `alembic==1.14.1` — Schema migrations
- `pydantic-settings==2.7.1` — Settings management
- `anthropic==0.43.0` — Anthropic Claude SDK
- `python-dotenv==1.0.1` — .env file loading

---

## Configuration

**Environment (Backend):**
- Loaded via `pydantic-settings` from `.env` file or environment variables
- Config class: `/home/jiangpang/usmleAI/backend/app/config.py`
- Example: `/home/jiangpang/usmleAI/backend/.env.example`
- Required variables:
  - `DATABASE_URL` — PostgreSQL connection string
  - `ANTHROPIC_API_KEY` — Anthropic Claude API key

**Environment (Frontend):**
- `NEXT_PUBLIC_API_URL` — Backend base URL (defaults to `http://localhost:8000`)
- Read in: `/home/jiangpang/usmleAI/frontend/lib/api.ts`

**TypeScript (Frontend):**
- Config: `/home/jiangpang/usmleAI/frontend/tsconfig.json`
- Strict mode enabled
- Path alias: `@/*` maps to project root (`./`)
- Module resolution: `bundler`

**Build:**
- Frontend: `next build` (TypeScript checked by Next.js build pipeline)
- Backend: no build step — Python runs directly via Uvicorn

---

## Database

**Engine:** PostgreSQL 16 (via Docker Compose)
- Docker Compose: `/home/jiangpang/usmleAI/docker-compose.yml`
- Container: `usmleai-db`
- Port: 5432

**Schema management:**
- Tables auto-created on startup via `Base.metadata.create_all()` in the FastAPI lifespan handler
- Alembic installed for future migration management

---

## Platform Requirements

**Development:**
- Docker (for PostgreSQL via `docker-compose up`)
- Python 3.12+
- Node.js 18+
- npm

**Production:**
- Deployment target not yet configured (no CI/CD or hosting config detected)

---

## braintutor Project Stack (seconday reference)

Location: `/home/jiangpang/firstproj/`

- **Frontend:** React 19, Vite 6, Three.js 0.183.2, @react-three/fiber 9.5, @react-three/drei 10.7, Zustand 5, TypeScript 5
- **Backend:** Fastify 5, TypeScript 5, tsx (dev runner)
- **Shared:** Workspace package `@braintutor/shared`
- **Testing:** Vitest 2, @testing-library/react 16
- **Package manager:** pnpm (workspace monorepo)

---

*Stack analysis: 2026-03-20*
