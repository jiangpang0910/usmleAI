"""
Pydantic schemas for study session, answer history, and adaptive learning endpoints.

Defines request and response models for:
- Recording individual answers to the history database
- Querying per-topic performance summaries
- Starting adaptive study sessions that prioritize weak areas
"""

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field


class RecordAnswerRequest(BaseModel):
    """
    Request schema for recording an answer to the history database.

    Called after the existing /api/answers/submit endpoint so that both
    answer validation (immediate feedback) and history persistence happen.
    """

    # The UUID of the question that was answered
    question_id: UUID

    # The label the student selected, e.g., "A", "B", "C"
    selected_option_label: str

    # Whether the student's answer was correct (determined by submit endpoint)
    is_correct: bool

    # The topic this question belongs to (denormalized for fast aggregation)
    topic_id: UUID

    # Difficulty level of the question (copied at answer time)
    difficulty: str

    # How many seconds the student spent on this question (optional)
    time_spent_seconds: Optional[int] = None


class RecordAnswerResponse(BaseModel):
    """
    Response schema after successfully recording an answer to history.

    Returns the new answer record's ID and key metadata for confirmation.
    """

    # UUID of the newly created UserAnswer record
    id: UUID

    # Whether the recorded answer was correct
    is_correct: bool

    # When the answer was recorded
    created_at: datetime

    # Enable automatic conversion from SQLAlchemy ORM objects
    model_config = {"from_attributes": True}


class TopicPerformance(BaseModel):
    """
    Performance metrics for a single topic.

    Represents the student's accuracy on a specific topic, computed
    from aggregated UserAnswer records. Used in performance summaries
    and to identify weak areas for adaptive learning.
    """

    # UUID of the topic
    topic_id: UUID

    # Human-readable topic name (e.g., "Cardiology")
    topic_name: str

    # Total number of questions answered in this topic
    total_answered: int

    # Number of correctly answered questions in this topic
    correct_count: int

    # Accuracy ratio: correct_count / total_answered (0.0 to 1.0)
    accuracy: float


class AdaptiveSessionRequest(BaseModel):
    """
    Request schema for starting an adaptive study session.

    The adaptive engine analyzes the student's answer history to identify
    weak topics (accuracy < 60%) and generates a question set that
    prioritizes those areas: 70% weak topics, 30% other topics.
    """

    # Number of questions for this adaptive session (default 20, range 5-40)
    question_count: int = Field(default=20, ge=5, le=40)

    # Optional USMLE step filter to restrict questions to a specific step
    usmle_step: Optional[str] = None


class AdaptiveQuestionInfo(BaseModel):
    """
    Minimal question metadata returned in adaptive session responses.

    Contains just the question ID and key metadata so the frontend
    can fetch full question details as needed during the session.
    """

    # UUID of the question
    question_id: UUID

    # Topic this question belongs to
    topic_id: UUID

    # Difficulty level of this question
    difficulty: str


class AdaptiveSessionResponse(BaseModel):
    """
    Response schema for a newly created adaptive study session.

    Returns the session ID, selected questions prioritizing weak areas,
    and the student's current weak topics for display in the UI.
    """

    # UUID of the newly created adaptive session
    session_id: UUID

    # List of selected questions with metadata for frontend consumption
    questions: list[AdaptiveQuestionInfo]

    # Topics where the student's accuracy is below 60% threshold
    weak_topics: list[TopicPerformance]


class PerformanceSummaryResponse(BaseModel):
    """
    Response schema for the overall performance summary endpoint.

    Provides aggregate statistics across all topics, including
    total questions answered, overall accuracy, and per-topic breakdowns.
    """

    # Total number of questions answered across all topics
    total_answered: int

    # Overall accuracy ratio across all topics (0.0 to 1.0)
    overall_accuracy: float

    # Per-topic performance breakdown sorted by accuracy ascending (weakest first)
    topics: list[TopicPerformance]
