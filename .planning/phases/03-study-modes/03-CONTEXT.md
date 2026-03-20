# Phase 3: Study Modes - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Three study modes: topic-based quiz (refine existing), adaptive session (new), and timed exam simulation (new). Users can structure their practice by topic, by AI-driven weak area targeting, or in a timed full exam simulation. Progress tracking and analytics are a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Mode Selection UX
- Dashboard cards route directly to each mode's page: "Pick a Topic" → `/topics` (already built), "Adaptive Session" → `/adaptive`, "Exam Simulation" → `/exam`
- Each mode has its own setup/entry page before questions start

### Topic Quiz (STUDY-01)
- Already built in Phase 2 (topic picker → quiz flow)
- Phase 3 refines if needed but primary work is on the other two modes

### Adaptive Session (STUDY-02)
- Weak area = topics where user accuracy is below 60%
- AI (Claude) decides difficulty per question based on full performance history
- Fixed session length: 20 questions per adaptive session
- Questions pulled from weak topics first, with AI adjusting difficulty dynamically

### Exam Simulation (STUDY-03)
- Exact mirror of real USMLE format:
  - Step 1: 7 blocks × 40 questions × 60 minutes per block
  - Step 2 CK: 8 blocks × ~40 questions × 60 minutes per block
  - Step 3: TBD (two-day format — Claude's discretion on how to handle)
- User selects USMLE Step and number of blocks (1-7) before starting
- Timer hidden by default, user presses a button to show/hide it
- Auto-submit when timer expires — unanswered questions count as wrong
- No mid-block feedback (answers reviewed only after completing all blocks)
- Optional break screen between blocks with 45-minute total break pool (matches real USMLE). Once 45 min used up, remaining blocks start immediately
- Full block review after completion: every question with correct/incorrect status, explanations available on click

### Claude's Discretion
- Adaptive question selection algorithm details
- Step 3 exam simulation adaptation (two-day format simplification)
- Break timer countdown UI
- Adaptive session performance summary format
- How to handle insufficient questions for a full exam block

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Exam Structure
- `backend/app/schemas/usmle_exam_structure.json` — Official USMLE exam structure with block counts, timing, and question formats per Step

### Existing Question Flow
- `frontend/components/quiz/QuestionView.tsx` — Existing question view (reuse for exam sim blocks)
- `frontend/components/quiz/ResultsSummary.tsx` — Existing results summary (reuse/extend for block review)
- `frontend/components/dashboard/Dashboard.tsx` — Dashboard with quick-start cards (wire remaining buttons)
- `frontend/lib/api.ts` — API client
- `frontend/lib/types.ts` — TypeScript types

### Backend
- `backend/app/routers/questions.py` — Question retrieval with filtering (extend for adaptive/exam queries)
- `backend/app/models/knowledge.py` — Question model with difficulty, topic, usmle_step fields

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- QuestionView component — reuse for all modes (already handles SBA, sequential, drag-drop, etc.)
- ResultsSummary component — extend for exam block review
- Topic picker page — already complete for STUDY-01
- Dashboard cards — two remaining buttons need wiring (Adaptive, Exam Sim)

### Established Patterns
- Next.js App Router pages at `/topics`, `/quiz/[topicId]`
- FastAPI routers with Pydantic schemas
- Navy blue medical school theme

### Integration Points
- Need new backend endpoints for adaptive question selection and exam session management
- Need user answer history storage for adaptive weak area tracking
- QuestionView needs a "no feedback" mode for exam simulation (defer explanations)

</code_context>

<specifics>
## Specific Ideas

- Exam simulation should feel like the real USMLE — high pressure, timed, no feedback during blocks
- Adaptive sessions should feel like a smart tutor — picking exactly the right questions for the user
- Break time pool is shared across all blocks (45 min total, not 45 min per break)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-study-modes*
*Context gathered: 2026-03-20*
