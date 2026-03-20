"""
Pydantic response schemas for the USMLE knowledge bank API.

Defines the shape of JSON responses for topics, subtopics, questions,
and answer options. Uses from_attributes mode for automatic conversion
from SQLAlchemy ORM objects to Pydantic models.
"""

from pydantic import BaseModel
from uuid import UUID
from typing import Optional


class SubtopicResponse(BaseModel):
    """
    Response schema for a subtopic within a topic.

    Represents a specific area within a broader topic,
    e.g., "Heart Failure" under "Cardiology".
    """

    # Unique identifier for the subtopic
    id: UUID

    # Display name of the subtopic
    name: str

    # Optional description of what this subtopic covers
    description: Optional[str]

    # Enable automatic conversion from SQLAlchemy ORM objects
    model_config = {"from_attributes": True}


class TopicResponse(BaseModel):
    """
    Detailed response schema for a single topic, including its subtopics.

    Used for GET /api/topics/{topic_id} to return full topic details
    with nested subtopic information.
    """

    # Unique identifier for the topic
    id: UUID

    # Display name of the topic (e.g., "Cardiology", "Pharmacology")
    name: str

    # Discipline category: "basic_science", "clinical_science", or "behavioral_social"
    discipline: str

    # Optional longer description of the topic
    description: Optional[str]

    # List of subtopics nested under this topic
    subtopics: list[SubtopicResponse]

    # Enable automatic conversion from SQLAlchemy ORM objects
    model_config = {"from_attributes": True}


class TopicListResponse(BaseModel):
    """
    Lightweight response schema for topic listings.

    Used for GET /api/topics/ to return a compact list of topics
    without nested subtopic data (for performance).
    """

    # Unique identifier for the topic
    id: UUID

    # Display name of the topic
    name: str

    # Discipline category
    discipline: str

    # Optional description
    description: Optional[str]

    # Enable automatic conversion from SQLAlchemy ORM objects
    model_config = {"from_attributes": True}


class AnswerOptionResponse(BaseModel):
    """
    Response schema for a single answer option within a question.

    Each question has 4-5 answer options (A through E), with
    exactly one marked as correct. Includes per-option explanations
    for detailed teaching feedback.
    """

    # Unique identifier for the answer option
    id: UUID

    # Answer label: "A", "B", "C", "D", or "E"
    label: str

    # The text content of this answer choice
    text: str

    # Whether this is the correct answer
    is_correct: bool

    # Explanation for why this option is right or wrong
    explanation: Optional[str]

    # Enable automatic conversion from SQLAlchemy ORM objects
    model_config = {"from_attributes": True}


class QuestionResponse(BaseModel):
    """
    Response schema for a USMLE-style question with its answer options.

    Includes the clinical vignette (stem), metadata about the question
    (type, step, difficulty, source), and all answer options with
    explanations for teaching purposes.
    """

    # Unique identifier for the question
    id: UUID

    # The clinical vignette and question text
    stem: str

    # Question format: "single_best_answer", "sequential", etc.
    question_type: str

    # Which USMLE Step this targets: "step1", "step2ck", "step3"
    usmle_step: str

    # Difficulty level: "easy", "medium", "hard"
    difficulty: str

    # Source: "curated" (human-written) or "ai_generated" (Claude-created)
    source: str

    # Detailed explanation of the correct answer
    explanation: Optional[str]

    # JSON-encoded list of learning objectives
    learning_objectives: Optional[str]

    # Foreign key to the parent topic
    topic_id: UUID

    # Optional foreign key to a subtopic
    subtopic_id: Optional[UUID]

    # All answer options (A, B, C, D, E) with explanations
    answer_options: list[AnswerOptionResponse]

    # Enable automatic conversion from SQLAlchemy ORM objects
    model_config = {"from_attributes": True}
