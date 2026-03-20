# External Integrations

**Analysis Date:** 2026-03-20

## Overview

The usmleAI project (`/home/jiangpang/usmleAI/`) has the following external integrations. The braintutor project (`/home/jiangpang/firstproj/`) has no external API integrations detected.

---

## APIs & External Services

**AI / LLM:**
- Anthropic Claude — AI-generated USMLE question variations and study assistance
  - SDK: `anthropic==0.43.0` (installed in backend)
  - Auth env var: `ANTHROPIC_API_KEY`
  - Config location: `/home/jiangpang/usmleAI/backend/app/config.py` (field `ANTHROPIC_API_KEY`)
  - Status: SDK installed, integration code not yet implemented (no route handlers importing `anthropic` were found)

**Google Fonts:**
- Inter font loaded via `next/font/google` at runtime
  - Location: `/home/jiangpang/usmleAI/frontend/app/layout.tsx`
  - No API key required; fetched by Next.js at build time

---

## Data Storage

**Databases:**
- PostgreSQL 16
  - Connection env var: `DATABASE_URL`
  - Default value: `postgresql://usmleai:usmleai_dev@localhost:5432/usmleai`
  - Client/ORM: SQLAlchemy 2.0.36 with psycopg2-binary adapter
  - Session management: `/home/jiangpang/usmleAI/backend/app/database.py`
  - Docker Compose service: `db` in `/home/jiangpang/usmleAI/docker-compose.yml`
  - Persistent volume: `pgdata`

**File Storage:**
- Local filesystem only — no cloud file storage detected

**Caching:**
- None detected

---

## Authentication & Identity

**Auth Provider:**
- None detected — no authentication middleware, session handling, or auth provider library found in either project

---

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, or similar)

**Logs:**
- FastAPI default logging via Uvicorn to stdout
- No structured logging library configured

---

## CI/CD & Deployment

**Hosting:**
- Not configured — no deployment manifests, Dockerfiles for app services, Procfiles, or platform config files detected

**CI Pipeline:**
- None detected — no GitHub Actions, CircleCI, or similar

**Container Orchestration:**
- Docker Compose used for the PostgreSQL database service only (`/home/jiangpang/usmleAI/docker-compose.yml`)
- No app-level Docker containers defined

---

## Internal Service Communication

**Frontend → Backend:**
- HTTP REST over fetch API
- API client: `/home/jiangpang/usmleAI/frontend/lib/api.ts`
- Base URL: `NEXT_PUBLIC_API_URL` env var, defaulting to `http://localhost:8000`
- CORS: Backend allows `http://localhost:3000` (Next.js dev server) via FastAPI CORSMiddleware

---

## Environment Configuration

**Required env vars (backend):**
- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — Anthropic Claude API key (required for AI features)

**Optional env vars (backend):**
- `APP_NAME` — Display name (default: `"usmleAI"`)
- `DEBUG` — Debug mode flag (default: `True`)

**Required env vars (frontend):**
- `NEXT_PUBLIC_API_URL` — Backend base URL (optional; defaults to `http://localhost:8000`)

**Secrets location:**
- Backend: `.env` file in `/home/jiangpang/usmleAI/backend/` (gitignored)
- Example file: `/home/jiangpang/usmleAI/backend/.env.example`

---

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

---

*Integration audit: 2026-03-20*
