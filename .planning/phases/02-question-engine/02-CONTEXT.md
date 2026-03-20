# Phase 2: Question Engine - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

All USMLE question formats working with AI-powered teaching feedback. Users can answer single best answer, sequential item sets, drag-and-drop/abstract, and free-response questions. After answering, users get AI-generated explanations or Socratic dialogue (togglable). Study modes and progress tracking are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Question Answering UI
- Full-width single column layout: vignette on top, answer options below, submit button at bottom
- Click to select an option (highlights it), then click Submit to confirm — prevents accidental answers
- Progress shown as both a top bar ("Q3 of 40") AND a clickable question grid (sidebar/drawer) showing answered/unanswered/flagged
- Flag/bookmark button in question header — flagged questions accessible for review later
- Inline images supported (X-rays, ECGs, pathology slides) — clickable to zoom

### Answer Reveal Behavior (mode-dependent)
- **Topic quiz mode:** Show explanation immediately after each question (inline on same page)
- **Exam simulation mode:** No per-question feedback — review all answers only after completing the entire block
- Correct answer highlights green, user's wrong answer highlights red

### Teaching Feedback
- Claude generates explanations live via API (not pre-written) — enables personalized, contextual feedback
- Explanation depth: Claude's discretion (per-option breakdown vs correct-answer-focused, depending on question complexity)
- Socratic mode: Claude's discretion on implementation (chat-style dialogue vs step-by-step hints)
- Toggle button on the explanation view to switch between Explanation and Socratic mode — default is explanation

### Question Format Interactions
- **Sequential item sets:** Lock + warning before proceeding — "You won't be able to change this answer." Then previous question locks.
- **Drag-and-drop:** Full drag-and-drop UI with draggable labels that snap into target zones
- **Free-response:** Large text area for user to type reasoning, Claude evaluates and scores after submission
- **Abstract/research format:** Rendered with proper sections (Objective, Methods, Results, Conclusion) and formatted data tables

### Navigation Flow
- Dashboard → "Pick a Topic" → Topic picker page (list of 16 disciplines grouped by category, showing question count per topic) → Select topic → Questions start
- Between questions: Previous/Next buttons at bottom + question grid for jumping to any question
- End of session: Results summary page showing score breakdown, time taken, list of wrong answers with links to review, then back to dashboard

### Claude's Discretion
- Exact explanation depth and format per question
- Socratic mode interaction pattern (chat vs hints)
- Loading state design while waiting for Claude API response
- Question grid drawer/sidebar behavior (always visible vs toggle)
- Mobile responsive adaptations of drag-and-drop

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Question Schema
- `backend/app/schemas/usmle_exam_structure.json` — Complete USMLE exam structure with all question formats, metadata, and exam block definitions
- `backend/app/models/knowledge.py` — SQLAlchemy models defining Question, AnswerOption, Topic, Subtopic

### API Endpoints
- `backend/app/routers/questions.py` — Existing question retrieval endpoints (GET with filtering)
- `backend/app/routers/claude.py` — Claude API test endpoint (extend for explanation generation)
- `backend/app/routers/topics.py` — Topic listing endpoints

### Frontend
- `frontend/components/dashboard/Dashboard.tsx` — Dashboard with quick-start buttons (wire up navigation)
- `frontend/lib/api.ts` — API client for FastAPI backend
- `frontend/components/ui/button.tsx` — shadcn/ui Button component (6 variants)
- `frontend/components/ui/card.tsx` — shadcn/ui Card component

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` and `Button` shadcn/ui components — use for question cards, option buttons, result cards
- `apiFetch` utility in `lib/api.ts` — use for all backend calls
- Dashboard quick-start buttons — wire "Pick a Topic" to new topic picker page

### Established Patterns
- Next.js App Router with "use client" for interactive components
- Tailwind CSS utility classes with navy blue theme (globals.css custom properties)
- FastAPI routers with Pydantic schemas for request/response validation

### Integration Points
- Dashboard buttons need `onClick` handlers routing to `/topics`, `/quiz/[topicId]` etc.
- New FastAPI endpoints needed: POST `/api/claude/explain` for generating explanations
- Question model already supports `question_type` field for format differentiation
- `usmle_exam_structure.json` schema defines all question format structures

</code_context>

<specifics>
## Specific Ideas

- Answer reveal is mode-dependent: immediate feedback for topic quizzes, deferred for exam simulations
- Topic picker groups disciplines by category (Basic Sciences, Clinical Sciences, Behavioral/Social) with question counts
- Results summary page at end of session shows wrong answers with review links

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-question-engine*
*Context gathered: 2026-03-20*
