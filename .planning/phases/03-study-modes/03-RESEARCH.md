# Phase 3: Study Modes - Research

**Researched:** 2026-03-20
**Domain:** Adaptive learning, timed exam simulation, browser timers, question bank scaling
**Confidence:** MEDIUM-HIGH

## Summary

Phase 3 adds two new study modes (adaptive session, exam simulation) and refines the existing topic quiz. The critical technical challenges are: (1) accurate browser timers that survive background tab throttling for exam simulation, (2) an answer history persistence layer that does not currently exist but is required for adaptive question selection, and (3) scaling from 128 seeded questions to 11,500+ via the MedQA dataset import script that already exists.

The adaptive session algorithm should be kept simple — accuracy-based weak area detection with difficulty binning, not full IRT. The exam simulation needs a Web Worker timer to avoid Chrome/Firefox throttling that limits `setInterval` to once per second (or once per minute after 5 minutes) in background tabs. The MedQA import script (`backend/app/seed/import_medqa.py`) already exists and handles dataset download, topic classification, and database insertion.

**Primary recommendation:** Build answer history persistence first (new `UserAnswer` model), then adaptive selection on top of it, and use `worker-timers` for exam countdown accuracy.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dashboard cards route directly to each mode's page: "Pick a Topic" -> `/topics` (already built), "Adaptive Session" -> `/adaptive`, "Exam Simulation" -> `/exam`
- Each mode has its own setup/entry page before questions start
- Topic Quiz (STUDY-01): Already built in Phase 2, Phase 3 refines if needed but primary work is on the other two modes
- Adaptive Session (STUDY-02): Weak area = topics where user accuracy is below 60%; AI (Claude) decides difficulty per question based on full performance history; Fixed session length: 20 questions per adaptive session; Questions pulled from weak topics first, with AI adjusting difficulty dynamically
- Exam Simulation (STUDY-03): Exact mirror of real USMLE format; Step 1: 7 blocks x 40 questions x 60 minutes per block; Step 2 CK: 8 blocks x ~40 questions x 60 minutes per block; User selects USMLE Step and number of blocks (1-7) before starting; Timer hidden by default, user presses a button to show/hide it; Auto-submit when timer expires — unanswered questions count as wrong; No mid-block feedback; Optional break screen between blocks with 45-minute total break pool; Full block review after completion

### Claude's Discretion
- Adaptive question selection algorithm details
- Step 3 exam simulation adaptation (two-day format simplification)
- Break timer countdown UI
- Adaptive session performance summary format
- How to handle insufficient questions for a full exam block

### Deferred Ideas (OUT OF SCOPE)
- Teaching LLM migration to Gemini 2.0 Flash via OpenRouter — deferred as standalone quick task
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STUDY-01 | User can pick a topic/subject and get a set of practice questions | Already built in Phase 2. May need minor refinements. Existing `/topics` and `/quiz/[topicId]` pages cover this. |
| STUDY-02 | AI adapts question selection based on user's weak areas and adjusts difficulty | Requires new UserAnswer model for history tracking, accuracy-per-topic calculation, and difficulty-aware question selection algorithm. See Architecture Patterns section. |
| STUDY-03 | User can take timed exam simulations mimicking real USMLE format | Requires Web Worker timer, exam session state management, block navigation, break pool timer, and auto-submit. See exam simulation architecture. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.x | Frontend framework | Already in use, App Router pattern established |
| FastAPI | 0.115.6 | Backend API | Already in use, async endpoints established |
| SQLAlchemy | 2.0.36 | ORM | Already in use, UUID PKs + selectin loading pattern |
| PostgreSQL | - | Database | Already in use, stores questions + topics |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| worker-timers | 8.0.31 | Background-tab-safe setInterval/setTimeout | Exam simulation countdown timer that must remain accurate when user switches tabs |

### Not Needed
| Instead of | Why Not |
|------------|---------|
| Full IRT library (e.g., catsim, pyirt) | Overkill for this use case. User decision is accuracy-based (< 60% = weak). Simple SQL aggregation suffices. |
| OpenRouter / Gemini 2.0 Flash | Explicitly deferred to standalone quick task per CONTEXT.md |
| Spaced repetition library | Phase 4 concern (TRACK-03), not Phase 3 |
| React timer libraries (react-timer-hook, etc.) | worker-timers is lower-level and solves the actual problem (throttling). React wrappers add abstraction but don't solve background tab issue. |

**Installation:**
```bash
# Frontend — add worker-timers for exam countdown
cd frontend && npm install worker-timers

# Backend — no new dependencies needed (datasets already installed for MedQA import)
```

## Architecture Patterns

### Critical Gap: Answer History Persistence

The current system does NOT persist answer history. The `POST /api/answers/submit` endpoint checks correctness and returns feedback but stores nothing. Adaptive learning (STUDY-02) requires historical data to calculate weak areas.

**New model needed: `UserAnswer`**

```python
# backend/app/models/user_answer.py
class UserAnswer(Base):
    """
    Persists each answer a user submits for adaptive learning and progress tracking.
    Since auth is deferred to v2, uses a session_id (browser-generated UUID) to
    identify users. This will be migrated to user_id when auth ships.
    """
    __tablename__ = "user_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(36), nullable=False, index=True)  # Browser UUID, pre-auth
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    selected_label = Column(String(5), nullable=False)  # "A", "B", etc.
    is_correct = Column(Boolean, nullable=False)
    answered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Indexes for adaptive queries
    __table_args__ = (
        Index("ix_user_answers_session_topic", "session_id"),
        Index("ix_user_answers_question", "question_id"),
    )
```

**Why session_id instead of user_id:** Auth is deferred to v2. Use a browser-generated UUID stored in localStorage. When auth ships, migrate session_id records to authenticated user_id.

### Pattern 1: Adaptive Question Selection Algorithm

**What:** Select 20 questions targeting the user's weakest topics with appropriate difficulty.

**Algorithm (recommended):**
1. Query `user_answers` grouped by topic to calculate accuracy per topic
2. Topics with accuracy < 60% are "weak" (per user decision)
3. Rank weak topics by ascending accuracy (worst first)
4. For each weak topic, select questions the user hasn't seen, or got wrong previously
5. Difficulty selection: start at the user's current performance level, adjust up on streaks of correct answers, adjust down on streaks of incorrect answers
6. If fewer than 20 questions from weak topics, fill remainder from medium-accuracy topics

```python
# Simplified adaptive selection endpoint pattern
@router.get("/api/adaptive/questions")
async def get_adaptive_questions(session_id: str, db: Session = Depends(get_db)):
    """
    Select 20 questions targeting the user's weakest areas.
    Algorithm: accuracy-per-topic -> rank weak topics -> select unseen/missed questions.
    """
    # Step 1: Calculate accuracy per topic
    topic_stats = db.execute(text("""
        SELECT q.topic_id, t.name,
               COUNT(*) as total,
               SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) as correct
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        JOIN topics t ON q.topic_id = t.id
        WHERE ua.session_id = :sid
        GROUP BY q.topic_id, t.name
    """), {"sid": session_id}).fetchall()

    # Step 2: Identify weak topics (accuracy < 60%)
    weak_topics = [
        row for row in topic_stats
        if row.total > 0 and (row.correct / row.total) < 0.6
    ]
    # Sort by accuracy ascending (worst first)
    weak_topics.sort(key=lambda r: r.correct / r.total)

    # Step 3: Select questions from weak topics, preferring unseen
    # ... (full implementation in planning phase)
```

**When user has no history:** Fall back to random questions across all topics at medium difficulty. This is the "cold start" case.

### Pattern 2: Exam Simulation Session State

**What:** Manage timed exam blocks with state persistence across page navigations.

**Backend state model:**
```python
class ExamSession(Base):
    """
    Tracks an in-progress exam simulation with block-level state.
    """
    __tablename__ = "exam_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(36), nullable=False, index=True)
    usmle_step = Column(String(10), nullable=False)  # step1, step2ck, step3
    total_blocks = Column(Integer, nullable=False)
    current_block = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default="in_progress")  # in_progress, completed
    break_time_remaining_seconds = Column(Integer, nullable=False, default=2700)  # 45 min = 2700s
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True), nullable=True)
```

**Frontend state:** Use React `useState` + `useRef` for block-level state. Store answers in an array indexed by question position. On timer expiry, auto-submit all unanswered as wrong.

### Pattern 3: Web Worker Timer for Exam Countdown

**What:** Accurate countdown timer that works when browser tab is in background.

**Why needed:** Chrome throttles `setInterval` to max 1/second in background tabs, and to 1/minute after 5 minutes of inactivity. For a 60-minute exam block, a user switching to another tab for reference material would see their timer drift or stop counting.

```typescript
// Use worker-timers as drop-in replacement for setInterval/setTimeout
import { setInterval, clearInterval } from 'worker-timers';

/**
 * Custom hook for exam countdown timer using Web Workers.
 * Remains accurate even when browser tab is in background.
 */
function useExamTimer(durationSeconds: number, onExpire: () => void) {
    const [remaining, setRemaining] = useState(durationSeconds);
    const intervalRef = useRef<number | null>(null);
    // Track actual elapsed time using Date.now() for drift correction
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        startTimeRef.current = Date.now();
        intervalRef.current = setInterval(() => {
            // Calculate remaining from wall clock, not from decrement
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const newRemaining = Math.max(0, durationSeconds - elapsed);
            setRemaining(newRemaining);
            if (newRemaining <= 0) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                onExpire();
            }
        }, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [durationSeconds]);

    return remaining;
}
```

**Critical detail:** Always calculate remaining time from wall clock (`Date.now()`) rather than decrementing a counter. Even with Web Workers, small drift can accumulate over 60 minutes. Wall-clock comparison eliminates cumulative error.

### Pattern 4: Break Time Pool

**What:** 45-minute shared break pool across all exam blocks, matching real USMLE.

**Behavior:**
- After completing a block, user sees a break screen
- Break countdown runs from the shared pool (starts at 45:00)
- User can end break early by clicking "Start Next Block"
- Once pool is exhausted (0:00), remaining blocks start immediately (no break screen shown)
- Break timer also uses Web Worker timer (same `useExamTimer` hook)

**State management:** Track `breakTimeRemainingSeconds` in the ExamSession backend model. Update it when break ends. Frontend fetches remaining break time from backend before showing break screen.

### Recommended Project Structure (new files)
```
backend/app/
├── models/
│   ├── knowledge.py          # Existing (Topic, Question, AnswerOption)
│   └── user_answer.py        # NEW: UserAnswer model for history tracking
├── routers/
│   ├── questions.py           # Existing (extend with adaptive endpoint)
│   ├── adaptive.py            # NEW: Adaptive question selection
│   └── exam.py                # NEW: Exam session management
├── schemas/
│   ├── adaptive.py            # NEW: Adaptive request/response schemas
│   └── exam.py                # NEW: Exam session schemas

frontend/
├── app/
│   ├── adaptive/
│   │   └── page.tsx           # NEW: Adaptive session setup + quiz
│   ├── exam/
│   │   └── page.tsx           # NEW: Exam setup page (step/block selection)
│   └── exam/[sessionId]/
│       └── page.tsx           # NEW: Active exam block view
├── components/
│   ├── exam/
│   │   ├── ExamTimer.tsx      # NEW: Web Worker countdown timer
│   │   ├── BreakScreen.tsx    # NEW: Between-block break with pool timer
│   │   └── BlockReview.tsx    # NEW: Post-exam block review
│   └── adaptive/
│       └── AdaptiveSummary.tsx # NEW: Session performance summary
├── hooks/
│   └── useExamTimer.ts        # NEW: Web Worker timer hook
└── lib/
    └── session.ts             # NEW: Browser session ID management (localStorage)
```

### Anti-Patterns to Avoid
- **Storing exam state only in React state:** If user refreshes mid-exam, they lose everything. Persist critical state (current block, answers, time remaining) to backend.
- **Using setInterval directly for exam timer:** Will drift or stop in background tabs. Always use worker-timers.
- **Calculating adaptive questions client-side:** The question pool is 11,500+. Always do selection server-side with SQL queries.
- **Full IRT implementation:** Massive complexity for marginal benefit at this scale. Accuracy-per-topic is sufficient and matches the user's decision (< 60% = weak).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background-safe timers | Custom Web Worker timer wrapper | `worker-timers` (npm, 8.0.31) | Handles cross-browser Worker lifecycle, cleanup, and fallback. Battle-tested. |
| UUID generation in browser | Custom ID generator | `crypto.randomUUID()` | Native browser API, cryptographically secure, zero dependencies. Supported in all modern browsers. |
| Exam structure constants | Hardcoded block/timing values | Read from `usmle_exam_structure.json` | Schema already exists, is version-controlled, and represents the official format. |

**Key insight:** The exam structure schema (`backend/app/schemas/usmle_exam_structure.json`) already defines block counts, timing, and question formats per Step. Use this as the source of truth rather than hardcoding values in the frontend or backend.

## Common Pitfalls

### Pitfall 1: Timer Drift in Background Tabs
**What goes wrong:** `setInterval(fn, 1000)` gets throttled to once/minute in background tabs after 5 minutes. A 60-minute exam timer could show 55 minutes remaining when only 5 have actually passed.
**Why it happens:** Chrome 88+ and Firefox aggressively throttle timers to save CPU/battery.
**How to avoid:** Use `worker-timers` for all countdown timers. Always calculate remaining time from `Date.now()` wall clock, not from a decrementing counter.
**Warning signs:** Timer appears to "catch up" or jump when user returns to the tab.

### Pitfall 2: Lost Exam State on Page Refresh
**What goes wrong:** User accidentally refreshes during block 5 of 7 and loses all progress.
**Why it happens:** Exam state stored only in React component state.
**How to avoid:** Persist exam session state to the backend. On page load, check for an in-progress session and resume it. Store answers server-side as they are submitted.
**Warning signs:** Users reporting lost exam progress.

### Pitfall 3: Cold Start for Adaptive Sessions
**What goes wrong:** New user with no answer history gets an error or empty question set when starting an adaptive session.
**Why it happens:** Adaptive algorithm depends on historical data that doesn't exist yet.
**How to avoid:** Detect cold start (no `user_answers` for this session_id) and fall back to random medium-difficulty questions across diverse topics. Show a message: "As you answer more questions, sessions will adapt to your weak areas."
**Warning signs:** Empty or error responses from `/api/adaptive/questions`.

### Pitfall 4: Insufficient Questions for Full Exam Blocks
**What goes wrong:** User selects Step 3 exam with 6 blocks (240 questions) but only 180 Step 3 questions exist in the database.
**Why it happens:** MedQA dataset has uneven distribution across steps and topics.
**How to avoid:** On exam setup, check available question count for the selected step. If insufficient, limit max blocks or warn the user. The setup page should show "X questions available" and cap block selection accordingly.
**Warning signs:** Exam blocks with duplicate or missing questions.

### Pitfall 5: Break Pool Double-Spend
**What goes wrong:** Break time gets consumed while user is on break screen AND while they are answering questions, or break pool goes negative.
**Why it happens:** Not properly pausing/resuming the break timer, or race conditions between frontend timer and backend state.
**How to avoid:** Backend is the source of truth for break time remaining. When break starts, record the timestamp. When break ends (user clicks or time runs out), calculate actual break duration and subtract from pool. Never let frontend-only state determine break time.
**Warning signs:** Break time remaining doesn't match expectations, or negative values.

### Pitfall 6: No-Auth User Identity
**What goes wrong:** User clears localStorage and loses all adaptive history.
**Why it happens:** Session ID stored in localStorage, no server-side backup without auth.
**How to avoid:** Accept this limitation since auth is deferred to v2. Document the limitation clearly. When auth ships, provide a migration path to link session_id records to authenticated user_id.
**Warning signs:** Users reporting "reset" adaptive sessions.

## Code Examples

### Browser Session ID Management
```typescript
// frontend/lib/session.ts
/**
 * Get or create a persistent session ID for this browser.
 * Used as a pre-auth user identifier until auth ships in v2.
 * Stored in localStorage so it survives page refreshes.
 */
export function getSessionId(): string {
    const KEY = "usmleai_session_id";
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(KEY, id);
    }
    return id;
}
```

### Exam Setup Page - Available Question Check
```typescript
// Pattern for exam setup validation
async function checkQuestionAvailability(step: string): Promise<number> {
    const res = await fetch(`/api/questions/count?usmle_step=${step}`);
    const data = await res.json();
    return data.count;
}

// In setup page: cap max blocks based on available questions
const questionsPerBlock = 40;
const available = await checkQuestionAvailability(selectedStep);
const maxBlocks = Math.floor(available / questionsPerBlock);
```

### Auto-Submit on Timer Expiry
```typescript
/**
 * Auto-submit handler for when exam block timer reaches zero.
 * Marks all unanswered questions as wrong and submits the block.
 */
function handleTimerExpiry(
    answers: Map<number, string>,  // questionIndex -> selectedLabel
    questions: Question[],
    sessionId: string,
    blockNumber: number
) {
    // Fill in unanswered questions with null (counted as wrong)
    const finalAnswers = questions.map((q, i) => ({
        question_id: q.id,
        selected_label: answers.get(i) || null,  // null = unanswered = wrong
        is_correct: answers.has(i)
            ? q.answer_options.find(o => o.label === answers.get(i))?.is_correct ?? false
            : false,
    }));

    // Submit block results to backend
    submitBlockResults(sessionId, blockNumber, finalAnswers);
}
```

### Step 3 Simplification (Claude's Discretion)

Step 3 is a two-day exam. Recommendation: simplify to a single-session format.
- Day 1: 6 blocks of MCQs (same as Step 1/2 CK pattern)
- Day 2: Skip CCS case simulations (not implemented in the question bank)
- Present Step 3 as "6 blocks x 40 questions x 60 min" in the setup page
- Add a note: "Step 3 Day 2 CCS simulations are not included in this version"

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setInterval` for timers | Web Worker timers | Chrome 88 (2021) | Background tabs no longer reliable with main-thread timers |
| Full IRT (Item Response Theory) | Simple accuracy-based adaptive selection | Ongoing | IRT requires calibrated item parameters, impractical for AI-generated questions |
| Server-side timer enforcement | Client timer + server validation | Standard practice | Server records start time; on submit, validates elapsed time is within allowed window |

**USMLE format change (May 2026):** Step 1 is transitioning from 7 blocks x 40 questions x 60 min to 14 blocks x 20 questions x 30 min. The exam structure schema (`usmle_exam_structure.json`) documents both formats. For now, implement the current format (7 x 40 x 60) as specified in CONTEXT.md decisions. The schema can be updated when the transition takes effect.

## Open Questions

1. **MedQA dataset distribution across steps**
   - What we know: The import script exists and handles ~11,451 questions. Questions are classified into 16 topics by keyword matching.
   - What's unclear: Exact count per USMLE step after import. Step 2&3 questions are split 50/50 via alternating assignment, which is a rough heuristic.
   - Recommendation: After running import, query counts per step. If any step has < 280 questions (one full exam), add a question count validation to the exam setup page.

2. **Sequential/abstract questions in exam blocks**
   - What we know: MedQA dataset is all single_best_answer (4-option). The existing question bank has sequential and abstract format questions.
   - What's unclear: Should exam blocks mix question types like the real USMLE, or stick to SBA only?
   - Recommendation: Start with SBA only for exam blocks (matches MedQA data). Note in UI that exam simulation uses SBA format.

3. **Adaptive difficulty "AI adjustment"**
   - What we know: CONTEXT.md says "AI (Claude) decides difficulty per question based on full performance history."
   - What's unclear: Whether this means calling Claude API for each question selection, or a simpler algorithmic approach.
   - Recommendation: Use algorithmic difficulty selection (easy/medium/hard based on recent streak), NOT Claude API calls. Calling Claude for 20 question selections would be slow and expensive. Reserve Claude for teaching/explanations.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (backend), none yet (frontend) |
| Config file | none — see Wave 0 |
| Quick run command | `cd backend && python -m pytest tests/ -x -q` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STUDY-01 | Topic quiz already works | smoke | Manual — already functional | N/A |
| STUDY-02 | Adaptive selects weak-topic questions | unit | `python -m pytest tests/test_adaptive.py -x` | Wave 0 |
| STUDY-02 | Cold start returns diverse questions | unit | `python -m pytest tests/test_adaptive.py::test_cold_start -x` | Wave 0 |
| STUDY-02 | UserAnswer model persists correctly | unit | `python -m pytest tests/test_models.py::test_user_answer -x` | Wave 0 |
| STUDY-03 | Exam session creation with correct block count | unit | `python -m pytest tests/test_exam.py::test_create_session -x` | Wave 0 |
| STUDY-03 | Auto-submit marks unanswered as wrong | unit | `python -m pytest tests/test_exam.py::test_auto_submit -x` | Wave 0 |
| STUDY-03 | Break pool decrements correctly | unit | `python -m pytest tests/test_exam.py::test_break_pool -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/ -x -q`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/` directory — does not exist
- [ ] `backend/tests/conftest.py` — test database fixtures, session factory
- [ ] `backend/tests/test_adaptive.py` — adaptive selection algorithm tests
- [ ] `backend/tests/test_exam.py` — exam session management tests
- [ ] `backend/tests/test_models.py` — UserAnswer model persistence tests
- [ ] Framework install: `pip install pytest pytest-asyncio httpx` + add to requirements.txt

## Sources

### Primary (HIGH confidence)
- Project codebase — `backend/app/models/knowledge.py`, `backend/app/routers/answers.py`, `backend/app/seed/import_medqa.py` (read directly)
- `backend/app/schemas/usmle_exam_structure.json` — official exam structure schema (read directly)
- `03-CONTEXT.md` — user decisions and locked constraints (read directly)

### Secondary (MEDIUM confidence)
- [Chrome timer throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88) — Chrome 88+ throttles background timers
- [worker-timers npm](https://github.com/chrisguttandin/worker-timers) — v8.0.31, verified via `npm view`
- [Why browsers throttle timers](https://nolanlawson.com/2025/08/31/why-do-browsers-throttle-javascript-timers/) — Nolan Lawson, 2025
- [GBaker/MedQA-USMLE-4-options](https://huggingface.co/datasets/GBaker/MedQA-USMLE-4-options) — HuggingFace dataset page
- [Web Worker timer patterns](https://hackwild.com/article/web-worker-timers/) — Implementation patterns for accurate timers

### Tertiary (LOW confidence)
- Adaptive learning algorithm details from [DEV.to article](https://dev.to/bytesupreme/how-to-create-a-personalized-learning-platform-with-adaptive-algorithms-using-python-4p8) — general patterns, not medical-specific
- [FreeCodeCamp adaptive learning systems](https://www.freecodecamp.org/news/adaptive-learning-systems/) — conceptual overview

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use or verified on npm registry
- Architecture: MEDIUM-HIGH — patterns are straightforward, but answer history model is new and untested
- Pitfalls: HIGH — timer throttling is well-documented, cold start is a known pattern
- Adaptive algorithm: MEDIUM — simple accuracy-based approach is sound but "AI adjusts difficulty" user requirement is interpreted as algorithmic (not Claude API calls), which is a discretion call

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable domain, no fast-moving dependencies)
