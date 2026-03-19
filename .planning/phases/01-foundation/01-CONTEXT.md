# Phase 1: Foundation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding, knowledge bank structure, and Claude API integration. The app starts, serves a working web page, connects to Claude API, and has a seeded knowledge bank covering all USMLE Steps (1, 2 CK, 3). No question answering UI, no teaching modes, no study modes — those are later phases.

</domain>

<decisions>
## Implementation Decisions

### Tech Stack
- Frontend: Next.js with Tailwind CSS and shadcn/ui components
- Backend: Python FastAPI (separate service from Next.js frontend)
- Database: PostgreSQL with rich schema
- AI: Claude API via Anthropic Python SDK
- Monorepo: Next.js frontend + FastAPI backend in same project

### Knowledge Bank Structure
- Topics organized by discipline (Anatomy, Physiology, Biochemistry, Pathology, Pharmacology, Microbiology, Internal Medicine, Surgery, Pediatrics, OB/GYN, Psychiatry, Emergency Med, Biostatistics, Epidemiology, Ethics, Patient Safety)
- Seed data via JSON files loaded on first run
- Rich metadata per question: step, topic, subtopic, difficulty, source (curated/AI), explanation, learning objectives
- All disciplines seeded from the start — basic sciences, clinical sciences, and behavioral/social

### Web App Initial Look
- Dashboard as landing page with quick-start buttons (Pick a topic, Start adaptive session, Exam sim)
- Clean & modern visual style (Linear/Notion-inspired — minimal chrome, whitespace, content-focused)
- shadcn/ui component library (Radix-based, customizable, Tailwind-native)

### Claude API Integration
- Frontend calls FastAPI backend, which calls Claude API (never expose API key to browser)
- No streaming for v1 — wait for full response, show loading state
- API key stored as server-side environment variable (.env)

### Claude's Discretion
- Exact database schema design (tables, relationships, indexes)
- FastAPI project structure and module organization
- Next.js app router vs pages router choice
- Loading state design (spinner, skeleton, etc.)
- Exact question count per discipline in seed data

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above. This is a greenfield project.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- FastAPI backend will expose REST endpoints consumed by Next.js frontend
- PostgreSQL will be accessed from FastAPI via an ORM (SQLAlchemy or equivalent)
- Claude API accessed from FastAPI via anthropic Python package

</code_context>

<specifics>
## Specific Ideas

- Dashboard should feel modern like Linear or Notion — not like a legacy medical question bank
- Knowledge bank should cover the full breadth of USMLE disciplines from day one
- Keep API key management simple — server-side .env, no user-provided keys in v1

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-19*
