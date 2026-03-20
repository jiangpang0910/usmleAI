"""
API router for study session endpoints.

Provides endpoints for:
- POST /api/sessions/record-answer: Persist an answer to the history database
- GET /api/sessions/performance: Query per-topic accuracy and overall performance
- POST /api/sessions/adaptive/start: Start an adaptive session prioritizing weak topics
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.knowledge import Question, Topic
from app.models.session import StudySession, UserAnswer
from app.schemas.session import (
    RecordAnswerRequest,
    RecordAnswerResponse,
    TopicPerformance,
    AdaptiveSessionRequest,
    AdaptiveSessionResponse,
    AdaptiveQuestionInfo,
    PerformanceSummaryResponse,
)

# Create router with /api/sessions prefix and "sessions" tag for API docs
router = APIRouter(prefix="/api/sessions", tags=["sessions"])

# Accuracy threshold below which a topic is considered "weak"
# Students scoring below 60% on a topic get extra practice in adaptive mode
WEAK_TOPIC_THRESHOLD = 0.6

# Proportion of adaptive questions drawn from weak topics (70%)
WEAK_TOPIC_QUESTION_RATIO = 0.7


def _compute_topic_performance(db: Session) -> list[TopicPerformance]:
    """
    Compute per-topic accuracy from aggregated UserAnswer records.

    Queries the user_answers table grouped by topic_id, joins topics
    for human-readable names, and calculates accuracy as correct/total.

    Args:
        db: SQLAlchemy database session.

    Returns:
        List of TopicPerformance objects sorted by accuracy ascending
        (weakest topics first).
    """
    # Aggregate correct count and total count per topic using SQL functions
    # case() creates a conditional sum: count only rows where is_correct=True
    results = (
        db.query(
            UserAnswer.topic_id,
            Topic.name.label("topic_name"),
            func.count(UserAnswer.id).label("total_answered"),
            func.sum(
                case(
                    (UserAnswer.is_correct == True, 1),  # noqa: E712 -- SQLAlchemy requires == for boolean comparison
                    else_=0,
                )
            ).label("correct_count"),
        )
        .join(Topic, UserAnswer.topic_id == Topic.id)
        .group_by(UserAnswer.topic_id, Topic.name)
        .all()
    )

    # Convert query results to TopicPerformance schema objects
    performances = []
    for row in results:
        total = row.total_answered
        correct = row.correct_count or 0
        # Calculate accuracy ratio (guard against division by zero)
        accuracy = correct / total if total > 0 else 0.0
        performances.append(
            TopicPerformance(
                topic_id=row.topic_id,
                topic_name=row.topic_name,
                total_answered=total,
                correct_count=correct,
                accuracy=accuracy,
            )
        )

    # Sort by accuracy ascending so weakest topics appear first
    performances.sort(key=lambda p: p.accuracy)

    return performances


@router.post("/record-answer", response_model=RecordAnswerResponse)
def record_answer(
    request: RecordAnswerRequest,
    db: Session = Depends(get_db),
):
    """
    Record a student's answer to the history database.

    Called after the existing /api/answers/submit endpoint so that both
    answer validation (immediate feedback) and persistent history tracking
    happen. This data powers performance analytics and adaptive learning.

    Args:
        request: Contains question_id, selected label, correctness, topic, difficulty.
        db: SQLAlchemy database session (injected by FastAPI).

    Returns:
        RecordAnswerResponse with the new record's ID and metadata.
    """
    # Create a new UserAnswer record from the request data
    answer = UserAnswer(
        question_id=request.question_id,
        selected_option_label=request.selected_option_label,
        is_correct=request.is_correct,
        topic_id=request.topic_id,
        difficulty=request.difficulty,
        time_spent_seconds=request.time_spent_seconds,
    )

    # Persist the answer to the database
    db.add(answer)
    db.commit()
    db.refresh(answer)

    # Return confirmation with the new record's UUID and metadata
    return RecordAnswerResponse(
        id=answer.id,
        is_correct=answer.is_correct,
        created_at=answer.created_at,
    )


@router.get("/performance", response_model=PerformanceSummaryResponse)
def get_performance(
    db: Session = Depends(get_db),
):
    """
    Get the student's overall performance summary across all topics.

    Queries all UserAnswer records, groups by topic, and computes
    per-topic accuracy. Returns both aggregate stats and per-topic breakdown.

    Args:
        db: SQLAlchemy database session (injected by FastAPI).

    Returns:
        PerformanceSummaryResponse with total answers, overall accuracy,
        and per-topic performance list.
    """
    # Compute per-topic performance using the shared helper
    topics = _compute_topic_performance(db)

    # Calculate aggregate statistics across all topics
    total_answered = sum(t.total_answered for t in topics)
    total_correct = sum(t.correct_count for t in topics)
    # Overall accuracy ratio (guard against no answers yet)
    overall_accuracy = total_correct / total_answered if total_answered > 0 else 0.0

    return PerformanceSummaryResponse(
        total_answered=total_answered,
        overall_accuracy=overall_accuracy,
        topics=topics,
    )


@router.post("/adaptive/start", response_model=AdaptiveSessionResponse)
def start_adaptive_session(
    request: AdaptiveSessionRequest,
    db: Session = Depends(get_db),
):
    """
    Start an adaptive study session that prioritizes weak topics.

    Analyzes the student's answer history to identify weak areas (accuracy
    below 60%), then selects questions with 70% from weak topics and 30%
    from other topics. Creates a StudySession record and returns the
    selected question set.

    Args:
        request: Contains question_count and optional usmle_step filter.
        db: SQLAlchemy database session (injected by FastAPI).

    Returns:
        AdaptiveSessionResponse with session ID, question list, and weak topics.
    """
    # Step 1: Compute per-topic performance to identify weak areas
    topic_performances = _compute_topic_performance(db)

    # Step 2: Identify weak topics (accuracy below the 60% threshold)
    weak_topics = [t for t in topic_performances if t.accuracy < WEAK_TOPIC_THRESHOLD]
    weak_topic_ids = [t.topic_id for t in weak_topics]

    # Step 3: Calculate how many questions to draw from weak vs strong topics
    # If no weak topics exist (new user or all strong), treat all topics equally
    if weak_topic_ids:
        # 70% from weak topics, 30% from other topics
        weak_count = int(request.question_count * WEAK_TOPIC_QUESTION_RATIO)
        other_count = request.question_count - weak_count
    else:
        # No weak topics -- draw all questions from the general pool
        weak_count = 0
        other_count = request.question_count

    # Step 4: Create the adaptive study session record
    session = StudySession(
        session_type="adaptive",
        usmle_step=request.usmle_step,
        total_questions=request.question_count,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Step 5: Build the base query with optional USMLE step filter
    base_query = db.query(Question)
    if request.usmle_step:
        base_query = base_query.filter(Question.usmle_step == request.usmle_step)

    # Step 6: Query questions from weak topics (randomized)
    weak_questions = []
    if weak_count > 0 and weak_topic_ids:
        weak_questions = (
            base_query.filter(Question.topic_id.in_(weak_topic_ids))
            .order_by(func.random())
            .limit(weak_count)
            .all()
        )

    # Step 7: Query questions from other topics (randomized)
    other_questions = []
    if other_count > 0:
        other_query = base_query
        if weak_topic_ids:
            # Exclude weak topics to avoid overlap
            other_query = other_query.filter(~Question.topic_id.in_(weak_topic_ids))
        other_questions = (
            other_query.order_by(func.random())
            .limit(other_count)
            .all()
        )

    # Step 8: If we got fewer weak questions than requested, fill from other topics
    # This handles cases where weak topics have few questions available
    total_selected = len(weak_questions) + len(other_questions)
    if total_selected < request.question_count:
        remaining = request.question_count - total_selected
        # Get IDs of already-selected questions to avoid duplicates
        selected_ids = [q.id for q in weak_questions + other_questions]
        fill_query = base_query
        if selected_ids:
            fill_query = fill_query.filter(~Question.id.in_(selected_ids))
        fill_questions = (
            fill_query.order_by(func.random())
            .limit(remaining)
            .all()
        )
        other_questions.extend(fill_questions)

    # Combine weak and other questions into the final set
    all_questions = weak_questions + other_questions

    # Step 9: Convert to response format with minimal metadata
    question_infos = [
        AdaptiveQuestionInfo(
            question_id=q.id,
            topic_id=q.topic_id,
            difficulty=q.difficulty,
        )
        for q in all_questions
    ]

    return AdaptiveSessionResponse(
        session_id=session.id,
        questions=question_infos,
        weak_topics=weak_topics,
    )
