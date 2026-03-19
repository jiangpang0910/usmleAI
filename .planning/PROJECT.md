# usmleAI

## What This Is

A web-based USMLE question generator and teaching platform powered by Claude. It combines a curated knowledge bank with AI-generated content to create comprehensive practice questions across all USMLE Steps (1, 2 CK, and 3), supporting every question format found on the exam. Users can study through topic-based quizzes, adaptive AI-driven sessions, or full timed exam simulations — with Claude teaching them through both detailed explanations and Socratic dialogue.

## Core Value

Medical students can practice USMLE-style questions in every format and learn *why* answers are right or wrong through AI-powered teaching — not just answer checking.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Question generation across all USMLE Steps (1, 2 CK, 3)
- [ ] Multiple question formats: single best answer, sequential sets, drag-and-drop/abstract, free-response
- [ ] Hybrid knowledge bank: curated content + Claude-generated questions
- [ ] Two teaching modes: detailed explanations and Socratic method (user-togglable)
- [ ] Topic-based quiz mode (pick subject, get question set, review)
- [ ] Adaptive session mode (AI selects questions based on weak areas, adjusts difficulty)
- [ ] Exam simulation mode (timed blocks mimicking real USMLE format)
- [ ] Full progress tracking: score history, weak area identification, spaced repetition, performance analytics
- [ ] User accounts (for personal use and sharing with other med students)

### Out of Scope

- Mobile native app — web-first, responsive design covers mobile access
- Video content or multimedia lectures — focus is on question-based learning
- Official USMLE question licensing — all content is AI-generated or user-curated

## Context

- Target users: the builder (personal study) and fellow medical students
- USMLE is a high-stakes standardized exam; question quality and medical accuracy are critical
- The platform should feel like a modern study tool, not a legacy question bank
- Claude API will power question generation and teaching interactions
- Content needs to cover the full breadth of USMLE topics (anatomy, physiology, biochemistry, pathology, pharmacology, clinical medicine, etc.)

## Constraints

- **AI Provider**: Claude API — powers question generation and teaching
- **Platform**: Web application — accessible from any device with a browser
- **Content Accuracy**: Medical content must be accurate and up-to-date; include disclaimers that this is a study aid, not medical advice

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Claude API for AI | Builder already uses Claude, strong reasoning for medical content | — Pending |
| Web app over native | Broader access, faster development, responsive covers mobile | — Pending |
| Hybrid content model | Curated content ensures quality baseline, AI fills gaps and generates variations | — Pending |
| Dual teaching modes | Different learning styles benefit from different approaches | — Pending |

---
*Last updated: 2026-03-19 after initialization*
