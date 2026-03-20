# Roadmap: usmleAI

## Overview

Starting from nothing, this roadmap builds a USMLE study platform in four phases. Phase 1 establishes the knowledge bank and project foundation. Phase 2 delivers the core question engine with all question formats and teaching modes — the heart of the product. Phase 3 adds structured study modes so users can practice by topic, adaptively, or under timed exam conditions. Phase 4 closes the loop with progress tracking, weak area identification, and performance analytics so users know where to focus next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffolding, knowledge bank structure, and Claude API integration
- [x] **Phase 2: Question Engine** - All question formats, AI-powered generation, and teaching modes (completed 2026-03-20)
- [ ] **Phase 3: Study Modes** - Topic quiz, adaptive sessions, and timed exam simulation
- [ ] **Phase 4: Progress Tracking** - Score history, weak area identification, spaced repetition, and analytics

## Phase Details

### Phase 1: Foundation
**Goal**: The project runs, serves a working web page, connects to the Claude API, and has a seeded knowledge bank structure covering USMLE Steps 1, 2 CK, and 3 topics
**Depends on**: Nothing (first phase)
**Requirements**: QGEN-05, QGEN-06
**Success Criteria** (what must be TRUE):
  1. The application starts and serves a working web interface in a browser
  2. The system can retrieve topics and questions from the knowledge bank for all three USMLE Steps
  3. Claude API responds to a test prompt confirming the integration is live
  4. The knowledge bank contains at least a baseline set of curated content entries (not empty)
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — FastAPI backend scaffold, PostgreSQL setup, and knowledge bank SQLAlchemy models
- [ ] 01-02-PLAN.md — Next.js frontend scaffold with Tailwind/shadcn and dashboard landing page
- [ ] 01-03-PLAN.md — Knowledge bank seed data, REST API endpoints, and Claude API integration

### Phase 2: Question Engine
**Goal**: Users can answer questions in every USMLE format and receive AI-powered teaching feedback — whether as detailed explanations or Socratic dialogue
**Depends on**: Phase 1
**Requirements**: QGEN-01, QGEN-02, QGEN-03, QGEN-04, TEACH-01, TEACH-02, TEACH-03
**Success Criteria** (what must be TRUE):
  1. User can answer a single best answer (SBA) vignette question and see which option is correct with a full explanation of why each option is right or wrong
  2. User can work through a sequential multi-part case where each question builds on the prior answer
  3. User can complete a drag-and-drop or abstract format question and receive feedback
  4. User can submit a free-response answer and receive an AI evaluation of their response
  5. User can toggle between detailed explanation mode and Socratic mode, and the teaching style changes immediately for the next answer
**Plans**: 5 plans

Plans:
- [ ] 02-01-PLAN.md — Backend API: answer submission endpoint, Claude explanation/Socratic endpoint, teaching schemas
- [ ] 02-02-PLAN.md — Frontend SBA flow: topic picker, question view, answer options, teaching panel with mode toggle
- [ ] 02-03-PLAN.md — Sequential item sets: seed data and multi-part case UI with locking
- [ ] 02-04-PLAN.md — Drag-and-drop, abstract, and free-response: seed data, evaluation endpoint, and format-specific UIs
- [ ] 02-05-PLAN.md — Question grid navigation, flag/bookmark button, and end-of-session results summary

### Phase 3: Study Modes
**Goal**: Users can structure their practice the way they want — by topic, by AI-driven weak area targeting, or in a timed full exam simulation
**Depends on**: Phase 2
**Requirements**: STUDY-01, STUDY-02, STUDY-03
**Success Criteria** (what must be TRUE):
  1. User can select a subject (e.g., Cardiology, Pharmacology) and receive a set of questions scoped to that topic
  2. User can start an adaptive session where the AI selects questions based on their past performance and adjusts difficulty as the session progresses
  3. User can take a timed exam simulation with blocks that mirror the real USMLE format (time limits, question count, no mid-block feedback)
**Plans**: 5 plans

Plans:
- [ ] 03-01-PLAN.md — Backend session models, answer history tracking, performance aggregation, adaptive question selection endpoint, and all frontend types/API functions
- [ ] 03-02-PLAN.md — Adaptive session frontend: setup page with weak topic preview, quiz flow, and dashboard button wiring
- [ ] 03-03-PLAN.md — Exam simulation backend: session creation with USMLE-accurate block/timing structure and block result submission
- [ ] 03-04-PLAN.md — Exam simulation frontend: timed blocks, no-feedback mode, break screen, block review, and dashboard button wiring
- [ ] 03-05-PLAN.md — OpenRouter migration: swap explain endpoint from Claude API to Gemini 2.0 Flash via OpenRouter

### Phase 4: Progress Tracking
**Goal**: Users can see how they are performing over time, understand which areas need the most work, and have the system surface review material at the right intervals
**Depends on**: Phase 3
**Requirements**: TRACK-01, TRACK-02, TRACK-03, TRACK-04
**Success Criteria** (what must be TRUE):
  1. User can view a score history chart showing their performance per topic across multiple sessions
  2. The system surfaces a clear list of the user's weakest areas based on their answer history
  3. The system schedules previously-missed or low-confidence questions for re-review using spaced repetition logic
  4. User can view a performance analytics dashboard with summary charts, score trends, and progress toward coverage goals
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Planning complete | - |
| 2. Question Engine | 5/5 | Complete   | 2026-03-20 |
| 3. Study Modes | 0/5 | Planning complete | - |
| 4. Progress Tracking | 0/TBD | Not started | - |
