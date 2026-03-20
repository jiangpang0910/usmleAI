---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 02-04-PLAN.md
last_updated: "2026-03-20T05:39:15.901Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 13
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** Medical students can practice USMLE-style questions in every format and learn *why* answers are right or wrong through AI-powered teaching
**Current focus:** Phase 02 — question-engine

## Current Position

Phase: 02 (question-engine) — EXECUTING
Plan: 5 of 5

## Performance Metrics

**Velocity:**

- Total plans completed: 2
- Average duration: ~9min
- Total execution time: 0.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 3min | 2 tasks | 9 files |
| Phase 01 P02 | 14min | 2 tasks | 16 files |
| Phase 01 P03 | 5min | 2 tasks | 14 files |
| Phase 02 P01 | 2min | 2 tasks | 4 files |
| Phase 02 P02 | 15min | 3 tasks | 8 files |
| Phase 02 P03 | 8min | 2 tasks | 4 files |
| Phase 02 P05 | 278s | 2 tasks | 3 files |
| Phase 02 P04 | 4min | 2 tasks | 12 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: Claude API chosen for question generation and teaching (strong reasoning for medical content)
- Init: Hybrid content model — curated baseline + AI-generated variations
- Init: Auth deferred to v2 to ship learning value first
- [Phase 01]: Used asynccontextmanager lifespan for startup table creation (modern FastAPI pattern)
- [Phase 01]: UUID primary keys and selectin lazy loading on all models
- [Phase 01]: Next.js 14 with App Router (not Pages Router) for frontend
- [Phase 01]: next.config.mjs instead of .ts (Next.js 14 limitation)
- [Phase 01]: Tailwind CSS v3 for shadcn/ui compatibility
- [Phase 01]: JSON seed data for version-controlled curated USMLE content
- [Phase 01]: Idempotent seeding with topic count check prevents duplicate data
- [Phase 02]: Module-level constants for teaching mode system prompts (explanation vs socratic)
- [Phase 02]: conversation_history as list[dict] for flexible multi-turn Socratic dialogue
- [Phase 02]: OptionFeedback with from_attributes for per-option teaching breakdown
- [Phase 02]: Full-width single-column quiz layout with vignette on top and A-E options below
- [Phase 02]: Map-based QuestionState tracking per question index for answered/flagged status
- [Phase 02]: Auto-fetch explanation on answer submission, re-fetch on teaching mode toggle
- [Phase 02]: Used stem prefix [Case: XXX, Part N of M] convention to group sequential questions by case ID
- [Phase 02]: Fixed-position drawer with backdrop overlay for question grid navigation
- [Phase 02]: DnD uses answer_option text format ItemName -> TargetZone with stem-parsed target zones
- [Phase 02]: Abstract sections parsed by splitting on markdown ## headers with color-coded Card rendering
- [Phase 02]: Free-response: 20-char minimum, AI scoring via Claude with regex score extraction
- [Phase 02]: Mobile DnD fallback uses dropdown selects instead of touch DnD library

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260320-d4r | Generate JSON schema of USMLE exam structure | 2026-03-20 | 074de7b | [260320-d4r](./quick/260320-d4r-generate-json-schema-of-usmle-exam-struc/) |
| 260320-ij6 | Add Redis caching for topics and questions endpoints | 2026-03-20 | 61d63d3 | [260320-ij6](./quick/260320-ij6-add-redis-caching-for-topics-and-questio/) |
| 260320-ij6 | Add Redis caching for topics and questions endpoints | 2026-03-20 | 61d63d3 | [260320-ij6](./quick/260320-ij6-add-redis-caching-for-topics-and-questio/) |

## Session Continuity

Last session: 2026-03-20T05:39:15.895Z
Stopped at: Completed 02-04-PLAN.md
Resume file: None
