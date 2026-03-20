"""
SQLAlchemy models for the USMLE knowledge bank.

Defines the schema for topics, subtopics, questions, and answer options
that make up the medical knowledge database. Supports all USMLE Steps
(Step 1, Step 2 CK, Step 3) with multiple question types and difficulty levels.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    ForeignKey,
    DateTime,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Topic(Base):
    """
    Top-level medical topic in the knowledge bank.

    Represents a broad subject area like "Cardiology" or "Pharmacology".
    Topics are organized by discipline (basic_science, clinical_science,
    behavioral_social) to align with USMLE content categories.
    """

    __tablename__ = "topics"

    # UUID primary key — universally unique identifier for each topic
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Topic name, e.g., "Cardiology", "Pharmacology", "Anatomy"
    name = Column(String(100), unique=True, nullable=False)

    # Discipline category aligning with USMLE content organization
    # Values: "basic_science", "clinical_science", "behavioral_social"
    discipline = Column(String(50), nullable=False)

    # Optional longer description of what this topic covers
    description = Column(Text, nullable=True)

    # Timestamp when this topic was first created in the database
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Timestamp of the last update to this topic record
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # One-to-many: a topic has many subtopics (e.g., Cardiology -> Heart Failure, Arrhythmias)
    # lazy="select" (default) avoids eagerly loading subtopics on every topic query
    subtopics = relationship("Subtopic", back_populates="topic", lazy="select")

    # One-to-many: a topic has many questions directly associated with it
    # lazy="select" prevents loading all questions when we only need topic metadata
    questions = relationship("Question", back_populates="topic", lazy="select")


class Subtopic(Base):
    """
    Second-level topic within a broader Topic.

    Represents a specific area within a topic, e.g., "Heart Failure"
    under "Cardiology" or "Beta Blockers" under "Pharmacology".
    Questions can optionally be associated with a subtopic for finer categorization.
    """

    __tablename__ = "subtopics"

    # UUID primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key linking this subtopic to its parent topic
    topic_id = Column(
        UUID(as_uuid=True), ForeignKey("topics.id"), nullable=False
    )

    # Subtopic name, e.g., "Heart Failure", "Beta Blockers"
    name = Column(String(200), nullable=False)

    # Optional description of what this subtopic covers
    description = Column(Text, nullable=True)

    # Timestamp when this subtopic was first created
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Timestamp of the last update to this subtopic
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Many-to-one: each subtopic belongs to exactly one topic
    topic = relationship("Topic", back_populates="subtopics")

    # One-to-many: a subtopic can have many questions
    questions = relationship("Question", back_populates="subtopic", lazy="select")


class Question(Base):
    """
    A USMLE-style question in the knowledge bank.

    Contains the clinical vignette (stem), metadata about the question type,
    difficulty, and USMLE step, plus an explanation of the correct answer.
    Questions are categorized by topic, optionally by subtopic, and can be
    either curated (human-written) or AI-generated.
    """

    __tablename__ = "questions"

    # UUID primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to the topic this question belongs to (required)
    topic_id = Column(
        UUID(as_uuid=True), ForeignKey("topics.id"), nullable=False
    )

    # Foreign key to the subtopic (optional — not all questions need a subtopic)
    subtopic_id = Column(
        UUID(as_uuid=True), ForeignKey("subtopics.id"), nullable=True
    )

    # The clinical vignette and question text (the "stem" of the question)
    stem = Column(Text, nullable=False)

    # Type of question — determines how the question is presented in the UI
    # Values: "single_best_answer" (most common), "sequential", "drag_and_drop", "free_response"
    question_type = Column(String(30), nullable=False, default="single_best_answer")

    # Which USMLE Step this question targets
    # Values: "step1" (basic sciences), "step2ck" (clinical knowledge), "step3" (clinical management)
    usmle_step = Column(String(10), nullable=False)

    # Difficulty level for adaptive learning and filtering
    # Values: "easy", "medium", "hard"
    difficulty = Column(String(10), nullable=False, default="medium")

    # Source of the question — whether it was human-curated or AI-generated
    # Values: "curated" (human-written baseline), "ai_generated" (Claude-created variations)
    source = Column(String(20), nullable=False, default="curated")

    # Detailed explanation of why the correct answer is right
    # Shown to the student after they answer, as a teaching tool
    explanation = Column(Text, nullable=True)

    # JSON-encoded list of learning objectives this question addresses
    # e.g., '["Identify heart failure symptoms", "Differentiate systolic vs diastolic"]'
    learning_objectives = Column(Text, nullable=True)

    # Timestamp when this question was first created
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Timestamp of the last update to this question
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Many-to-one: each question belongs to a topic
    topic = relationship("Topic", back_populates="questions")

    # Many-to-one: each question optionally belongs to a subtopic
    subtopic = relationship("Subtopic", back_populates="questions")

    # One-to-many: each question has multiple answer options (A, B, C, D, E)
    answer_options = relationship(
        "AnswerOption",
        back_populates="question",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    # Database indexes for common query patterns
    __table_args__ = (
        # Index on USMLE step for filtering questions by step
        Index("ix_questions_usmle_step", "usmle_step"),
        # Index on topic_id for fetching all questions in a topic
        Index("ix_questions_topic_id", "topic_id"),
        # Index on question_type for filtering by question format
        Index("ix_questions_question_type", "question_type"),
        # Index on difficulty for adaptive learning queries
        Index("ix_questions_difficulty", "difficulty"),
    )


class AnswerOption(Base):
    """
    A single answer option for a multiple-choice question.

    Each question typically has 4-5 answer options (A through E),
    with exactly one marked as correct. Each option can have its own
    explanation for why it is right or wrong, supporting detailed teaching.
    """

    __tablename__ = "answer_options"

    # UUID primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to the parent question — CASCADE delete removes options when question is deleted
    question_id = Column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Answer label, e.g., "A", "B", "C", "D", "E"
    label = Column(String(5), nullable=False)

    # The text content of this answer option
    text = Column(Text, nullable=False)

    # Whether this is the correct answer (exactly one per question should be True)
    is_correct = Column(Boolean, nullable=False, default=False)

    # Explanation for this specific option — why it's right or wrong
    # Enables detailed per-option teaching feedback
    explanation = Column(Text, nullable=True)

    # Timestamp when this option was first created
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Timestamp of the last update to this option
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Many-to-one: each answer option belongs to a question
    question = relationship("Question", back_populates="answer_options")
