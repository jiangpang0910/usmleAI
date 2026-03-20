"""
API router for USMLE question endpoints.

Provides endpoints to list and retrieve questions from the knowledge bank.
Supports filtering by topic, USMLE step, difficulty, and question type,
with pagination via a limit parameter.
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.knowledge import Question
from app.schemas.knowledge import QuestionResponse

# Create router with /api/questions prefix and "questions" tag for API docs
router = APIRouter(prefix="/api/questions", tags=["questions"])


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
    """
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
    """
    # Look up the question by its UUID primary key
    question = db.query(Question).filter(Question.id == question_id).first()

    # Return 404 if no question found with this ID
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    return question
