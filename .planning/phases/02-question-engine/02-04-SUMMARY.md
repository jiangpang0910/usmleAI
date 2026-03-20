---
phase: 02-question-engine
plan: 04
subsystem: ui, api
tags: [drag-and-drop, abstract, free-response, html5-dnd, claude-evaluation, usmle-formats]

# Dependency graph
requires:
  - phase: 02-question-engine/02-02
    provides: SBA quiz flow, QuestionView routing, AnswerOption component, TeachingPanel
provides:
  - Drag-and-drop question component with HTML5 DnD API and mobile dropdown fallback
  - Abstract/research format component with structured section cards and table rendering
  - Free-response component with textarea input and Claude AI evaluation (0-10 scoring)
  - Seed data for drag-and-drop, abstract, and free-response question types (2 each)
  - Free-response evaluation backend endpoint with Claude scoring
  - QuestionView routing for all 5 USMLE question formats
affects: [03-study-modes, 04-progress-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HTML5 Drag and Drop API for desktop with mobile dropdown fallback
    - Structured stem parsing for abstract sections (## Objective, ## Methods, ## Results, ## Conclusion)
    - AI-evaluated free-response with score extraction from Claude output

key-files:
  created:
    - frontend/components/quiz/DragDropView.tsx
    - frontend/components/quiz/AbstractView.tsx
    - frontend/components/quiz/FreeResponseView.tsx
    - backend/app/seed/data/questions_dnd.json
    - backend/app/seed/data/questions_abstract.json
    - backend/app/seed/data/questions_freeresponse.json
  modified:
    - frontend/components/quiz/QuestionView.tsx
    - backend/app/seed/loader.py
    - backend/app/routers/answers.py
    - backend/app/schemas/teaching.py
    - frontend/lib/types.ts
    - frontend/lib/api.ts

key-decisions:
  - "DnD uses answer_option text format 'ItemName -> TargetZone' with stem-parsed target zones"
  - "Abstract sections parsed by splitting on markdown ## headers with color-coded Card rendering"
  - "Free-response minimum 20 characters before submission, score extracted via regex from Claude response"
  - "Mobile fallback for drag-and-drop uses dropdown selects instead of touch DnD library"

patterns-established:
  - "Format-specific view components: each question type gets its own *View.tsx with Question + onComplete props"
  - "QuestionView as router: delegates to format-specific views via question_type conditional checks"

requirements-completed: [QGEN-03, QGEN-04]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 2 Plan 4: Drag-and-Drop, Abstract, and Free-Response Formats Summary

**Three new USMLE question formats with drag-and-drop matching (HTML5 DnD + mobile fallback), research abstract parsing with section cards, and AI-evaluated free-response with 0-10 scoring**

## Performance

- **Duration:** 4 min (verification of pre-existing work from background execution)
- **Started:** 2026-03-20T05:32:33Z
- **Completed:** 2026-03-20T05:36:56Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- All 5 USMLE question formats now supported end-to-end (SBA, sequential, drag-and-drop, abstract, free-response)
- DragDropView with HTML5 Drag and Drop API for desktop and dropdown fallback for mobile accessibility
- AbstractView parses research abstracts into color-coded section cards (Objective, Methods, Results, Conclusion) with optional table rendering
- FreeResponseView sends student answers to Claude for AI evaluation with 0-10 scoring and constructive feedback
- 6 new seed questions across 3 formats (2 DnD, 2 abstract, 2 free-response)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seed data, free-response endpoint, frontend types** - `2953d59` (feat)
2. **Task 2: Create DragDropView, AbstractView, FreeResponseView, integrate into QuestionView** - `4d1d69b` (feat)

## Files Created/Modified
- `backend/app/seed/data/questions_dnd.json` - 2 drag-and-drop questions (Pharmacology, Anatomy)
- `backend/app/seed/data/questions_abstract.json` - 2 abstract/research questions (Biostatistics)
- `backend/app/seed/data/questions_freeresponse.json` - 2 free-response questions (Internal Medicine)
- `backend/app/seed/loader.py` - Added 3 new seed files to question_files list
- `backend/app/routers/answers.py` - Added /submit-free-response endpoint with Claude evaluation
- `backend/app/schemas/teaching.py` - Added FreeResponseSubmitRequest and FreeResponseEvaluation schemas
- `frontend/lib/types.ts` - Added FreeResponseSubmitRequest and FreeResponseEvaluation interfaces
- `frontend/lib/api.ts` - Added submitFreeResponse API function
- `frontend/components/quiz/DragDropView.tsx` - Drag-and-drop with HTML5 DnD API and mobile dropdown fallback
- `frontend/components/quiz/AbstractView.tsx` - Research abstract with section cards, table rendering, and SBA options
- `frontend/components/quiz/FreeResponseView.tsx` - Free-response with textarea, character count, and AI evaluation display
- `frontend/components/quiz/QuestionView.tsx` - Routes all 5 question types to their respective view components

## Decisions Made
- DnD uses answer_option text format "ItemName -> TargetZone" with stem-parsed target zones for flexible matching
- Abstract sections parsed by splitting on markdown ## headers with color-coded Card rendering (blue/gray/green/amber)
- Free-response minimum 20 characters before submission; score extracted via regex from Claude response with fallback to 5
- Mobile fallback for drag-and-drop uses dropdown selects (simpler and more reliable than touch DnD libraries)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript Map iteration error in DragDropView**
- **Found during:** Task 2 (DragDropView component)
- **Issue:** Using `for...of map.entries()` caused TS2802 error requiring `--downlevelIteration` flag
- **Fix:** Wrapped all Map.entries() calls with Array.from() to produce a standard iterable
- **Files modified:** frontend/components/quiz/DragDropView.tsx
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 4d1d69b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor TypeScript compatibility fix. No scope creep.

## Issues Encountered
None beyond the Map iteration TypeScript fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 USMLE question formats are complete and routed through QuestionView
- Question grid navigation and results summary (02-05) can proceed
- Teaching feedback works across all question types via TeachingPanel

## Self-Check: PASSED

All 6 key files found on disk. Both task commits (2953d59, 4d1d69b) verified in git history.

---
*Phase: 02-question-engine*
*Completed: 2026-03-20*
