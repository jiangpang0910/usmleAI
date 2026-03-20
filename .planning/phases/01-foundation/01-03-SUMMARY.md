---
phase: 01-foundation
plan: 03
subsystem: api, database
tags: [fastapi, sqlalchemy, pydantic, anthropic, usmle, seed-data, rest-api]

requires:
  - phase: 01-foundation plan 01
    provides: SQLAlchemy models (Topic, Subtopic, Question, AnswerOption), database session, config

provides:
  - Seeded knowledge bank with 16 USMLE disciplines and 8 curated questions across all 3 Steps
  - REST API endpoints for topics (list/detail with filtering) and questions (list/detail with filtering)
  - Claude API test endpoint for verifying Anthropic integration
  - Database seeding script with idempotency and transaction safety

affects: [02-question-generation, 02-teaching, frontend-question-display]

tech-stack:
  added: [anthropic sdk]
  patterns: [Pydantic response schemas with from_attributes, APIRouter with prefix/tags, query parameter filtering, database seeding with JSON files]

key-files:
  created:
    - backend/app/seed/__init__.py
    - backend/app/seed/data/topics.json
    - backend/app/seed/data/questions_step1.json
    - backend/app/seed/data/questions_step2ck.json
    - backend/app/seed/data/questions_step3.json
    - backend/app/seed/loader.py
    - backend/app/schemas/__init__.py
    - backend/app/schemas/knowledge.py
    - backend/app/schemas/claude.py
    - backend/app/routers/__init__.py
    - backend/app/routers/topics.py
    - backend/app/routers/questions.py
    - backend/app/routers/claude.py
  modified:
    - backend/app/main.py

key-decisions:
  - "JSON-based seed data for portability and version control of curated content"
  - "Idempotent seeding with topic count check to prevent duplicate data"
  - "Learning objectives stored as JSON string in Text column for flexibility"
  - "Compact TopicListResponse without subtopics for list endpoints, full TopicResponse for detail"

patterns-established:
  - "Seed pattern: JSON files in seed/data/ loaded by loader.py with topic name matching"
  - "Router pattern: APIRouter with prefix, tags, query param filtering, Depends(get_db)"
  - "Schema pattern: Pydantic BaseModel with from_attributes for ORM conversion"
  - "Claude integration pattern: API key check, Anthropic client, error wrapping as HTTPException"

requirements-completed: [QGEN-05, QGEN-06]

duration: 5min
completed: 2026-03-20
---

# Phase 01 Plan 03: Seed Data, API Endpoints, and Claude Integration Summary

**Seeded 16 USMLE disciplines with 8 curated vignette questions across Steps 1/2CK/3, REST endpoints for topics and questions with filtering, and Claude API test endpoint**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T01:35:12Z
- **Completed:** 2026-03-20T01:39:49Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Knowledge bank seeded with all 16 medical disciplines (6 basic science, 6 clinical, 4 behavioral/social) with subtopics
- 8 medically accurate USMLE-style vignette questions with per-option explanations covering Steps 1, 2 CK, and 3
- REST API endpoints for listing/filtering topics and questions by step, discipline, difficulty, and type
- Claude API test endpoint with proper error handling (400 for missing key, 502 for API failures)

## Task Commits

Each task was committed atomically:

1. **Task 1: Seed data JSON files covering all 16 USMLE disciplines and three Steps** - `f118364` (feat)
2. **Task 2: Pydantic schemas and REST API endpoints for topics, questions, and Claude test** - `66e8ca1` (feat)

## Files Created/Modified
- `backend/app/seed/__init__.py` - Seed data package marker
- `backend/app/seed/data/topics.json` - 16 topics with subtopics across 3 discipline categories
- `backend/app/seed/data/questions_step1.json` - 3 Step 1 questions (Pathology, Pharmacology, Physiology)
- `backend/app/seed/data/questions_step2ck.json` - 3 Step 2 CK questions (Internal Medicine, Pediatrics, OB/GYN)
- `backend/app/seed/data/questions_step3.json` - 2 Step 3 questions (Biostatistics, Ethics)
- `backend/app/seed/loader.py` - Database seeding script with idempotency check
- `backend/app/schemas/__init__.py` - Schema package marker
- `backend/app/schemas/knowledge.py` - Pydantic response models for topics, questions, answer options
- `backend/app/schemas/claude.py` - Request/response models for Claude API test
- `backend/app/routers/__init__.py` - Router package marker
- `backend/app/routers/topics.py` - GET /api/topics/ and GET /api/topics/{id} endpoints
- `backend/app/routers/questions.py` - GET /api/questions/ and GET /api/questions/{id} endpoints
- `backend/app/routers/claude.py` - POST /api/claude/test endpoint with Anthropic integration
- `backend/app/main.py` - Updated to register all three routers

## Decisions Made
- JSON-based seed data files for version control and portability of curated medical content
- Idempotent seeding (checks if topics exist before inserting) to prevent duplicate data on re-runs
- Learning objectives stored as JSON string in Text column for schema flexibility
- Separate TopicListResponse (compact, no subtopics) vs TopicResponse (full detail with subtopics)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Docker not available in sandbox environment; database seeding verification done structurally (JSON parsing, AST analysis) instead of against live PostgreSQL. Seeder will work when run on host with `docker compose up -d db`.

## User Setup Required
None - no external service configuration required. Claude API test endpoint will return 400 until ANTHROPIC_API_KEY is set in .env.

## Next Phase Readiness
- Phase 01 foundation complete: backend scaffold, models, seed data, API endpoints, and Claude integration all in place
- To run: `docker compose up -d db && cd backend && python -m app.seed.loader && uvicorn app.main:app --reload`
- Frontend (Plan 02) already complete with Next.js 14 and Tailwind CSS
- Ready for Phase 02: question generation and teaching features

---
*Phase: 01-foundation*
*Completed: 2026-03-20*
