"""
API router for answer submission endpoints.

Provides the POST /api/answers/submit endpoint that accepts a student's
answer choice, validates it against the database, and returns whether
the answer is correct along with per-option feedback for teaching.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.knowledge import Question
from app.schemas.teaching import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    OptionFeedback,
)

# Create router with /api/answers prefix and "answers" tag for API docs
router = APIRouter(prefix="/api/answers", tags=["answers"])


@router.post("/submit", response_model=AnswerSubmitResponse)
async def submit_answer(
    request: AnswerSubmitRequest,
    db: Session = Depends(get_db),
):
    """
    Submit an answer to a USMLE question and receive correctness feedback.

    Looks up the question by ID, checks whether the student's selected
    option matches the correct answer, and returns detailed per-option
    feedback including explanations for each choice.

    Args:
        request: Contains the question_id and selected_option_label.
        db: SQLAlchemy database session (injected by FastAPI).

    Returns:
        AnswerSubmitResponse with correctness, correct answer details,
        and per-option feedback.

    Raises:
        HTTPException 404: If the question_id does not exist.
        HTTPException 400: If the selected_option_label doesn't match any option.
    """
    # Look up the question by UUID, with answer_options eager-loaded via selectin
    question = db.query(Question).filter(Question.id == request.question_id).first()

    # Return 404 if the question doesn't exist in the database
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Find the correct answer option (the one marked is_correct=True)
    correct_option = next(
        (opt for opt in question.answer_options if opt.is_correct),
        None,
    )

    # Safety check: every question should have exactly one correct option
    if not correct_option:
        raise HTTPException(
            status_code=500,
            detail="Question has no correct answer option configured",
        )

    # Find the option matching the student's selected label
    selected_option = next(
        (opt for opt in question.answer_options if opt.label == request.selected_option_label),
        None,
    )

    # Return 400 if the label doesn't match any of the question's options
    if not selected_option:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid option label '{request.selected_option_label}'. "
                   f"Valid labels: {[opt.label for opt in question.answer_options]}",
        )

    # Build per-option feedback list from all answer options
    options_feedback = [
        OptionFeedback(
            label=opt.label,
            text=opt.text,
            is_correct=opt.is_correct,
            explanation=opt.explanation,
        )
        for opt in question.answer_options
    ]

    # Determine correctness by comparing selected label to the correct option's label
    is_correct = request.selected_option_label == correct_option.label

    # Return the full answer submission response
    return AnswerSubmitResponse(
        question_id=question.id,
        selected_option_label=request.selected_option_label,
        is_correct=is_correct,
        correct_option_label=correct_option.label,
        correct_option_text=correct_option.text,
        explanation=question.explanation,
        options_feedback=options_feedback,
    )
