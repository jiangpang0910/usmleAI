---
phase: 03-study-modes
plan: 03
subsystem: api
tags: [fastapi, pydantic, usmle, exam-simulation, sqlalchemy]

# Dependency graph
requires:
  - phase: 03-01
    provides: StudySession and UserAnswer models, session schemas, QuestionResponse schema
provides:
  - Exam simulation API with USMLE-accurate block/timing structure
  - POST /api/sessions/exam/start endpoint returning full QuestionResponse objects per block
  - POST /api/sessions/exam/submit-block endpoint for graded answer submission
  - EXAM_CONFIGS constant encoding Step 1/2CK/3 block structure
  - BREAK_POOL_SECONDS constant (2700s / 45 minutes)
affects: [03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [chunked-block-splitting, full-object-serialization-in-blocks]

key-files:
  created:
    - backend/app/schemas/exam.py
    - backend/app/routers/exam.py
  modified:
    - backend/app/main.py

key-decisions:
  - "Return full QuestionResponse objects in blocks (not IDs) to match frontend ExamBlock.questions type"
  - "Use 'X' as selected_option_label for unanswered questions since UserAnswer column is non-nullable"
  - "Step 3 uses Day 1 MCQ format only (6 blocks); CCS not simulated in v1"

patterns-established:
  - "Block chunking: split question list into groups of questions_per_block for exam blocks"
  - "Partial blocks: gracefully handle insufficient question pool by using available questions"

requirements-completed: [STUDY-03]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 03 Plan 03: Exam Simulation Backend Summary

**Exam simulation API with USMLE-accurate block/timing (Step 1: 7x40x60, Step 2 CK: 8x40x60, Step 3: 6x40x60), 45-min break pool, and full QuestionResponse objects per block**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T06:06:09Z
- **Completed:** 2026-03-20T06:08:08Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Exam session creation splits questions into timed blocks per USMLE step structure
- Each block returns full QuestionResponse objects (stem, options, metadata) matching frontend ExamBlock type
- Block submission validates answers, creates UserAnswer records, and updates session correct_count
- EXAM_CONFIGS encodes real USMLE format; BREAK_POOL_SECONDS = 2700 (45 minutes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create exam schemas and exam session API router** - `b5be882` (feat)

## Files Created/Modified
- `backend/app/schemas/exam.py` - Pydantic schemas for exam session creation, block structure, and result submission with USMLE constants
- `backend/app/routers/exam.py` - Exam API router with /start and /submit-block endpoints
- `backend/app/main.py` - Added exam router registration

## Decisions Made
- Return full QuestionResponse objects in blocks (not IDs) to match frontend ExamBlock.questions: Question[] type contract
- Use "X" as selected_option_label for unanswered/timed-out questions since UserAnswer.selected_option_label is non-nullable
- Step 3 simulates Day 1 MCQ format only (6 blocks of 40 at 60 min); Day 2 CCS not in v1

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Exam simulation backend is complete and registered in main.py
- Ready for Plan 04 (frontend exam simulation UI) to consume these endpoints
- Frontend can call POST /api/sessions/exam/start and render blocks directly from response

---
*Phase: 03-study-modes*
*Completed: 2026-03-20*
