# Requirements: usmleAI

**Defined:** 2026-03-19
**Core Value:** Medical students can practice USMLE-style questions in every format and learn *why* answers are right or wrong through AI-powered teaching

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Question Generation

- [x] **QGEN-01**: User can practice single best answer questions (vignette → pick A-E)
- [x] **QGEN-02**: User can practice sequential question sets (multi-part cases)
- [ ] **QGEN-03**: User can practice drag-and-drop/abstract format questions
- [ ] **QGEN-04**: User can submit free-response answers and get AI evaluation
- [x] **QGEN-05**: Questions cover all USMLE Steps (1, 2 CK, 3)
- [x] **QGEN-06**: Questions generated from hybrid knowledge bank (curated content + Claude AI)

### Teaching

- [x] **TEACH-01**: User sees detailed explanations (why each option is right/wrong, pathophysiology)
- [x] **TEACH-02**: User can use Socratic mode (AI guides with follow-up questions)
- [x] **TEACH-03**: User can toggle between detailed explanation and Socratic mode

### Study Modes

- [ ] **STUDY-01**: User can pick a topic/subject and get a set of practice questions
- [ ] **STUDY-02**: AI adapts question selection based on user's weak areas and adjusts difficulty
- [ ] **STUDY-03**: User can take timed exam simulations mimicking real USMLE format

### Progress Tracking

- [ ] **TRACK-01**: User can view score history per topic over time
- [ ] **TRACK-02**: System identifies and highlights user's weak areas
- [ ] **TRACK-03**: System schedules review using spaced repetition
- [ ] **TRACK-04**: User can view performance analytics dashboard with charts/trends

## v2 Requirements

### Authentication

- **AUTH-01**: User can sign up with email and password
- **AUTH-02**: User session persists across browser refresh
- **AUTH-03**: User can reset password via email link

### Social

- **SOCIAL-01**: User can share question sets with other students
- **SOCIAL-02**: Leaderboard / study group features

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | Web-first, responsive design covers mobile access |
| Video content / multimedia lectures | Focus is on question-based learning |
| Official USMLE question licensing | All content is AI-generated or user-curated |
| Real-time multiplayer quizzes | High complexity, not core to learning value |
| OAuth / social login | Deferred with all auth to v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| QGEN-05 | Phase 1 | Complete |
| QGEN-06 | Phase 1 | Complete |
| QGEN-01 | Phase 2 | Complete |
| QGEN-02 | Phase 2 | Complete |
| QGEN-03 | Phase 2 | Pending |
| QGEN-04 | Phase 2 | Pending |
| TEACH-01 | Phase 2 | Complete |
| TEACH-02 | Phase 2 | Complete |
| TEACH-03 | Phase 2 | Complete |
| STUDY-01 | Phase 3 | Pending |
| STUDY-02 | Phase 3 | Pending |
| STUDY-03 | Phase 3 | Pending |
| TRACK-01 | Phase 4 | Pending |
| TRACK-02 | Phase 4 | Pending |
| TRACK-03 | Phase 4 | Pending |
| TRACK-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation — all 16 requirements mapped*
