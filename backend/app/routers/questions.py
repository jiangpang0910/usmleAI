"""
API router for USMLE question endpoints.

Provides endpoints to list and retrieve questions from the knowledge bank.
Supports filtering by topic, USMLE step, difficulty, and question type,
with pagination via a limit parameter.
Responses are cached in Redis to reduce database load on repeated requests.
"""

import json
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.knowledge import Question
from app.schemas.knowledge import QuestionResponse
from app.cache import build_cache_key, cache_get, cache_set

# Create router with /api/questions prefix and "questions" tag for API docs
router = APIRouter(prefix="/api/questions", tags=["questions"])

# Cache TTL constants (in seconds)
# List endpoints use shorter TTL since they aggregate multiple records
LIST_CACHE_TTL = 300  # 5 minutes for question listings
# Single-item endpoints use longer TTL since individual questions rarely change
ITEM_CACHE_TTL = 600  # 10 minutes for single question detail


@router.get("/", response_model=list[QuestionResponse])
def list_questions(
    topic_id: Optional[UUID] = Query(
        None,
        description="Filter questions by topic UUID.",
    ),
    usmle_step: Optional[str] = Query(
        None,
        description="Filter by USMLE step (step1, step2ck, step3).",
    ),
    difficulty: Optional[str] = Query(
        None,
        description="Filter by difficulty level (easy, medium, hard).",
    ),
    question_type: Optional[str] = Query(
        None,
        description="Filter by question type (single_best_answer, sequential, etc.).",
    ),
    limit: int = Query(
        10,
        ge=1,
        le=50,
        description="Maximum number of questions to return (1-50, default 10).",
    ),
    db: Session = Depends(get_db),
):
    """
    List questions from the knowledge bank with optional filters.

    Supports filtering by topic, USMLE step, difficulty, and question type.
    Results are limited to prevent large response payloads (default 10, max 50).
    Each question includes its answer options with explanations.
    Results are cached in Redis so repeated identical queries skip the database.
    """
    # Build a cache key incorporating all filter parameters
    # Different parameter combinations produce different cache entries
    cache_key = build_cache_key(
        "questions",
        topic_id=str(topic_id) if topic_id else None,
        usmle_step=usmle_step,
        difficulty=difficulty,
        question_type=question_type,
        limit=str(limit),
    )

    # Check Redis cache first — returns None on miss or if Redis is down
    cached = cache_get(cache_key)
    if cached is not None:
        # Cache hit: return pre-serialized JSON directly to avoid
        # double-serialization by FastAPI's response encoder
        return Response(content=cached, media_type="application/json")

    # Cache miss: query the database as normal
    # Start with a base query for all questions
    query = db.query(Question)

    # Apply optional filters based on query parameters
    if topic_id:
        query = query.filter(Question.topic_id == topic_id)

    if usmle_step:
        query = query.filter(Question.usmle_step == usmle_step)

    if difficulty:
        query = query.filter(Question.difficulty == difficulty)

    if question_type:
        query = query.filter(Question.question_type == question_type)

    # Apply the limit to cap the number of results returned
    questions = query.limit(limit).all()

    # Serialize the ORM objects to JSON-compatible dicts using Pydantic
    # mode="json" ensures UUIDs are serialized as strings
    serialized = json.dumps(
        [QuestionResponse.model_validate(q).model_dump(mode="json") for q in questions]
    )

    # Store the serialized JSON in Redis with the list TTL
    cache_set(cache_key, serialized, ttl=LIST_CACHE_TTL)

    return questions


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get a single question by ID, including all answer options.

    Returns the full question with its clinical vignette, metadata,
    and all answer options with per-option explanations.
    Raises 404 if the question ID does not exist.
    Result is cached in Redis with a longer TTL since individual questions rarely change.
    """
    # Build cache key using the question's UUID as the distinguishing parameter
    cache_key = build_cache_key("question", question_id=str(question_id))

    # Check Redis cache before hitting the database
    cached = cache_get(cache_key)
    if cached is not None:
        # Cache hit: return pre-serialized JSON directly
        return Response(content=cached, media_type="application/json")

    # Cache miss: look up the question by its UUID primary key
    question = db.query(Question).filter(Question.id == question_id).first()

    # Return 404 if no question found with this ID
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Serialize the ORM object to JSON for caching
    # mode="json" converts UUIDs and other non-JSON types to strings
    serialized = json.dumps(
        QuestionResponse.model_validate(question).model_dump(mode="json")
    )

    # Store in Redis with the longer single-item TTL
    cache_set(cache_key, serialized, ttl=ITEM_CACHE_TTL)

    return question
