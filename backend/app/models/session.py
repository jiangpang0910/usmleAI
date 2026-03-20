"""
SQLAlchemy models for study session tracking and answer history.

Defines the schema for StudySession and UserAnswer tables that power
adaptive learning, performance analytics, and exam simulation features.
UserAnswer records persist every answer a student submits, enabling
per-topic accuracy calculations and weak-area identification.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    Integer,
    ForeignKey,
    DateTime,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class StudySession(Base):
    """
    A study session grouping a set of answered questions.

    Sessions can be one of three types:
    - "topic_quiz": Standard topic-based practice (STUDY-01)
    - "adaptive": AI-selected questions prioritizing weak areas (STUDY-02)
    - "exam_simulation": Timed exam blocks mimicking real USMLE format (STUDY-03)

    Each session tracks aggregate performance (total questions, correct count)
    and links to individual UserAnswer records for detailed analytics.
    """

    __tablename__ = "study_sessions"

    # UUID primary key -- universally unique identifier for each session
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Type of study session: "topic_quiz", "adaptive", or "exam_simulation"
    session_type = Column(String(20), nullable=False)

    # Which USMLE step this session targets (optional -- may span steps)
    # Values: "step1", "step2ck", "step3", or None for mixed
    usmle_step = Column(String(10), nullable=True)

    # JSON-serialized configuration for the session
    # e.g., {"topic_id": "..."} for quiz, {"block_count": 4} for exam
    config_json = Column(Text, nullable=True)

    # When the student started this session
    started_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # When the student finished the session (null if still in progress)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Total number of questions assigned to this session
    total_questions = Column(Integer, nullable=True)

    # Running count of correctly answered questions in this session
    correct_count = Column(Integer, default=0)

    # Timestamp when this session record was first created
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Timestamp of the last update to this session record
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # One-to-many: a session has many user answers
    # selectin loading for efficient eager loading when querying sessions
    # cascade delete-orphan removes answers if the session is deleted
    answers = relationship(
        "UserAnswer",
        back_populates="session",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    # Database indexes for common query patterns
    __table_args__ = (
        # Index on session_type for filtering by study mode
        Index("ix_study_sessions_session_type", "session_type"),
        # Index on usmle_step for filtering by USMLE step
        Index("ix_study_sessions_usmle_step", "usmle_step"),
    )


class UserAnswer(Base):
    """
    A single answer submitted by a student to a question.

    Records the student's choice, correctness, and timing for every
    question attempted. topic_id is denormalized (copied from the question)
    for fast per-topic aggregation without joining the questions table.
    Links optionally to a StudySession for grouped analytics.
    """

    __tablename__ = "user_answers"

    # UUID primary key -- universally unique identifier for each answer
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to the study session this answer belongs to
    # Nullable for backward compatibility -- standalone answers without a session
    session_id = Column(
        UUID(as_uuid=True), ForeignKey("study_sessions.id"), nullable=True
    )

    # Foreign key to the question that was answered (required)
    question_id = Column(
        UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False
    )

    # Denormalized topic_id copied from the question at answer time
    # Avoids joining the questions table for per-topic accuracy queries
    topic_id = Column(
        UUID(as_uuid=True), ForeignKey("topics.id"), nullable=False
    )

    # The label the student selected, e.g., "A", "B", "C", "D", "E"
    selected_option_label = Column(String(5), nullable=False)

    # Whether the student's answer was correct
    is_correct = Column(Boolean, nullable=False)

    # How many seconds the student spent on this question (optional)
    time_spent_seconds = Column(Integer, nullable=True)

    # Difficulty level copied from the question at answer time
    # Denormalized for efficient history queries without question joins
    difficulty = Column(String(10), nullable=False)

    # Timestamp when this answer was submitted
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Many-to-one: each answer optionally belongs to a study session
    session = relationship("StudySession", back_populates="answers")

    # Many-to-one: each answer references the question that was answered
    question = relationship("Question")

    # Database indexes for common query patterns
    __table_args__ = (
        # Index on topic_id for per-topic accuracy aggregation
        Index("ix_user_answers_topic_id", "topic_id"),
        # Index on question_id for looking up answers to a specific question
        Index("ix_user_answers_question_id", "question_id"),
        # Index on is_correct for filtering correct/incorrect answers
        Index("ix_user_answers_is_correct", "is_correct"),
    )
