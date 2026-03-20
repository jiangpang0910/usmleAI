# Phase 4: Progress Tracking - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Score history, weak area identification, spaced repetition scheduling, and performance analytics dashboard. Users can see how they're performing over time, identify weak areas, get review reminders, and view comprehensive analytics. No new question formats or study modes — those are done.

</domain>

<decisions>
## Implementation Decisions

### Score History Display
- Both overall and per-topic breakdown — user can drill into individual disciplines
- Preset time range toggles: Last 7 days, 30 days, 90 days, All time
- Chart type and visualization: Claude's discretion

### Weak Area Identification
- Ranked list from weakest to strongest with score % and trend arrows (improving/declining/flat)
- "Practice Weak Areas" button that starts an adaptive session focused on weakest topics
- Links directly to practice — not just informational

### Spaced Repetition
- "Due for review" section on the main dashboard — e.g., "You have 12 questions due for review" with a start button
- Transparent schedule — users can see when each question is due, how many times reviewed, confidence level
- Algorithm choice: Claude's discretion (SM-2 or similar)

### Analytics Dashboard
- Separate /analytics page (not cluttering the main dashboard)
- Key metrics to display:
  - Overall accuracy percentage
  - Total questions answered count
  - Study streak (consecutive days with sessions)
  - Topic coverage map (which topics practiced and how thoroughly)
- Score history charts live on this page
- Weak areas summary visible here too

### Claude's Discretion
- Chart library choice (recharts, chart.js, etc.)
- Spaced repetition algorithm (SM-2, Leitner, or custom)
- Exact chart type for score history (line, bar, or mixed)
- Analytics page layout and card arrangement
- Topic coverage visualization style (progress bars, heat map, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Layer
- `backend/app/models/session.py` — StudySession and UserAnswer models (answer history already tracked)
- `backend/app/schemas/session.py` — Session Pydantic schemas
- `backend/app/routers/sessions.py` — Session API with performance aggregation endpoint

### Frontend
- `frontend/lib/types.ts` — Session, adaptive, and exam TypeScript interfaces
- `frontend/lib/api.ts` — Existing API functions for session operations
- `frontend/components/dashboard/Dashboard.tsx` — Dashboard to add "Due for review" section
- `frontend/app/globals.css` — Navy blue theme CSS variables

### Question Schema
- `backend/app/models/knowledge.py` — Question and AnswerOption models
- `backend/app/schemas/usmle_exam_structure.json` — USMLE exam structure reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StudySession` and `UserAnswer` models — answer history already stored per session
- `GET /api/sessions/performance` endpoint — already aggregates performance data
- `Card` and `Button` shadcn/ui components — use for analytics cards and metric displays
- `apiFetch` utility — use for all new API calls
- Adaptive session already uses weak topic calculation — reuse for weak area identification

### Established Patterns
- Next.js App Router with "use client" for interactive components
- Tailwind CSS with navy blue theme
- FastAPI routers with Pydantic schemas
- Full-width single column layout

### Integration Points
- Dashboard needs "Due for review" section added
- New /analytics route needed
- Weak areas list needs "Practice" button linking to adaptive session with pre-selected topics
- Spaced repetition needs new backend model for tracking review schedules per question per user

</code_context>

<specifics>
## Specific Ideas

- Weak areas ranked list with trend arrows (↑ improving, → flat, ↓ declining) — like the preview mockup shown
- "Practice Weak Areas" button immediately starts an adaptive session on those topics
- Analytics should feel like a data dashboard — not cluttered, but information-rich

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-progress-tracking*
*Context gathered: 2026-03-20*
