# Codebase Structure

**Analysis Date:** 2026-03-20

## Directory Layout

```
usmleAI/                          # Monorepo root
├── backend/                      # Python FastAPI backend
│   ├── app/                      # Application package
│   │   ├── models/               # SQLAlchemy ORM model definitions
│   │   │   ├── __init__.py       # Re-exports all models for convenience
│   │   │   └── knowledge.py      # Topic, Subtopic, Question, AnswerOption models
│   │   ├── config.py             # App settings via pydantic-settings
│   │   ├── database.py           # SQLAlchemy engine, session, Base, get_db
│   │   ├── main.py               # FastAPI app, CORS, lifespan, health check
│   │   └── __init__.py
│   ├── .env.example              # Template for required environment variables
│   └── requirements.txt          # Python dependencies
├── frontend/                     # Next.js 14 frontend (App Router)
│   ├── app/                      # Next.js App Router directory
│   │   ├── globals.css           # Global CSS / Tailwind base styles
│   │   ├── layout.tsx            # Root layout — HTML shell, font, global styles
│   │   └── page.tsx              # Root page at "/" — renders Dashboard
│   ├── components/               # React components
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx     # Main landing page component
│   │   └── ui/                   # Reusable primitive components (shadcn-style)
│   │       ├── button.tsx        # Button with CVA variants
│   │       └── card.tsx          # Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
│   ├── lib/                      # Frontend utility modules
│   │   ├── api.ts                # Generic apiFetch wrapper and typed API functions
│   │   └── utils.ts              # cn() Tailwind class merge utility
│   ├── next.config.mjs           # Next.js configuration
│   ├── tailwind.config.ts        # Tailwind CSS configuration
│   ├── tsconfig.json             # TypeScript configuration
│   ├── postcss.config.mjs        # PostCSS configuration
│   └── package.json              # Frontend dependencies
├── .planning/                    # Project planning docs (not shipped)
│   ├── phases/                   # Phase implementation plans
│   ├── research/                 # Research notes
│   ├── config.json               # GSD planning tool config
│   ├── PROJECT.md                # Product requirements and decisions
│   ├── REQUIREMENTS.md           # Detailed requirements
│   ├── ROADMAP.md                # Phase roadmap
│   └── STATE.md                  # Current project state
├── docker-compose.yml            # PostgreSQL 16 dev database service
└── .gitignore                    # Git ignore rules
```

## Directory Purposes

**`usmleAI/backend/app/`:**
- Purpose: All Python application code
- Contains: FastAPI app instance, routes, models, config, database setup
- Key files: `main.py` (entry point), `database.py` (DB session), `config.py` (settings)

**`usmleAI/backend/app/models/`:**
- Purpose: SQLAlchemy ORM model definitions for the knowledge bank schema
- Contains: `knowledge.py` with `Topic`, `Subtopic`, `Question`, `AnswerOption` classes
- Key files: `__init__.py` re-exports all four models for clean imports elsewhere

**`usmleAI/frontend/app/`:**
- Purpose: Next.js App Router pages and global styles
- Contains: `layout.tsx` (root layout), `page.tsx` (root route), `globals.css`
- Key files: `layout.tsx` wraps every page; `page.tsx` is the `/` route

**`usmleAI/frontend/components/ui/`:**
- Purpose: Low-level reusable UI primitives (shadcn-style), not feature-specific
- Contains: `button.tsx`, `card.tsx`
- Note: Add new primitives here when they are generic and reusable across features

**`usmleAI/frontend/components/dashboard/`:**
- Purpose: Feature-specific components for the dashboard screen
- Contains: `Dashboard.tsx`
- Note: Follow this pattern — one subdirectory per feature/page

**`usmleAI/frontend/lib/`:**
- Purpose: Shared frontend utilities and API client
- Contains: `api.ts` (fetch wrapper), `utils.ts` (cn utility)
- Key files: All new API functions belong in `api.ts`

## Key File Locations

**Entry Points:**
- `usmleAI/backend/app/main.py`: FastAPI application — start with `uvicorn app.main:app`
- `usmleAI/frontend/app/page.tsx`: Root Next.js page at `/`
- `usmleAI/frontend/app/layout.tsx`: Root layout wrapping all pages

**Configuration:**
- `usmleAI/backend/app/config.py`: All backend settings (DATABASE_URL, ANTHROPIC_API_KEY, DEBUG)
- `usmleAI/backend/.env.example`: Template showing required env vars
- `usmleAI/frontend/next.config.mjs`: Next.js configuration
- `usmleAI/frontend/tailwind.config.ts`: Tailwind CSS configuration
- `usmleAI/docker-compose.yml`: PostgreSQL 16 development database

**Core Logic:**
- `usmleAI/backend/app/database.py`: SQLAlchemy engine, session factory, `get_db` dependency
- `usmleAI/backend/app/models/knowledge.py`: All ORM models (Topic, Subtopic, Question, AnswerOption)
- `usmleAI/frontend/lib/api.ts`: All frontend API calls

**Testing:**
- No test files present yet — testing infrastructure not established

## Naming Conventions

**Files:**
- Python: `snake_case.py` (e.g., `knowledge.py`, `database.py`, `config.py`)
- TypeScript/TSX: `PascalCase.tsx` for components (e.g., `Dashboard.tsx`, `button.tsx`), `camelCase.ts` for utilities (e.g., `api.ts`, `utils.ts`)
- Next.js App Router reserved files: lowercase (`page.tsx`, `layout.tsx`, `globals.css`)

**Directories:**
- Python packages: `snake_case/` (e.g., `app/`, `models/`)
- Frontend feature dirs: `lowercase/` (e.g., `dashboard/`, `ui/`)
- Next.js App Router: lowercase segments matching URL paths

**Python Classes:** `PascalCase` (e.g., `Topic`, `Question`, `Settings`)
**Python Functions:** `snake_case` (e.g., `get_db`, `health_check`)
**TypeScript Interfaces:** `PascalCase` (e.g., `QuickStartAction`, `USMLEStep`, `ButtonProps`)
**TypeScript Functions/Components:** `PascalCase` for components (e.g., `Dashboard`, `Button`), `camelCase` for utilities (e.g., `apiFetch`, `cn`)

## Where to Add New Code

**New API Endpoint (backend):**
- Route handler: add to `usmleAI/backend/app/main.py` or create a new router file at `usmleAI/backend/app/routers/<name>.py`
- New model: add to `usmleAI/backend/app/models/knowledge.py` or create `usmleAI/backend/app/models/<name>.py` and register in `__init__.py`
- Import new model in `main.py` before `create_all` to ensure table creation

**New Frontend Page:**
- Create `usmleAI/frontend/app/<route>/page.tsx` for the Next.js route
- Create `usmleAI/frontend/components/<feature>/` directory for feature components

**New API Function (frontend):**
- Add typed function to `usmleAI/frontend/lib/api.ts` using `apiFetch<ResponseType>`

**New Reusable UI Component:**
- Add to `usmleAI/frontend/components/ui/<component>.tsx`
- Follow the `React.forwardRef` + `cn()` pattern from `button.tsx` and `card.tsx`

**New Feature Component:**
- Create `usmleAI/frontend/components/<feature>/<ComponentName>.tsx`
- Use `"use client"` directive only if the component needs interactivity (event handlers, state)

**Utilities:**
- Shared frontend helpers: `usmleAI/frontend/lib/utils.ts`
- Backend helpers: create `usmleAI/backend/app/utils.py`

## Special Directories

**`usmleAI/frontend/.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No (in `.gitignore`)

**`usmleAI/frontend/node_modules/`:**
- Purpose: Frontend npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No

**`usmleAI/.planning/`:**
- Purpose: GSD planning tool files — project docs, phase plans, roadmap
- Generated: No (hand-authored)
- Committed: Yes

**`usmleAI/backend/app/__pycache__/` and `usmleAI/backend/app/models/__pycache__/`:**
- Purpose: Python bytecode cache
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-03-20*
