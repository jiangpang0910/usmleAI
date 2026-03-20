"""
API router for answer submission endpoints.

Provides endpoints for:
- POST /api/answers/submit: Standard answer submission for SBA/abstract/sequential questions
- POST /api/answers/submit-free-response: Free-response answer submission with AI evaluation
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from anthropic import Anthropic

from app.config import settings
from app.database import get_db
from app.models.knowledge import Question
from app.schemas.teaching import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    FreeResponseSubmitRequest,
    FreeResponseEvaluation,
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


# System prompt for evaluating free-response clinical reasoning answers
FREE_RESPONSE_SYSTEM_PROMPT = (
    "You are a medical education evaluator for USMLE preparation. "
    "Evaluate the student's free-response answer to this clinical question. "
    "Provide: 1) A score from 0-10, 2) Key points the student correctly identified, "
    "3) Important points the student missed, 4) Specific suggestions for improvement. "
    "Be constructive and educational."
)


@router.post("/submit-free-response", response_model=FreeResponseEvaluation)
async def submit_free_response(
    request: FreeResponseSubmitRequest,
    db: Session = Depends(get_db),
):
    """
    Submit a free-response answer for AI evaluation.

    Sends the student's written clinical reasoning to Claude for scoring
    and feedback. The AI compares the response against the stored model
    answer and provides a 0-10 score with constructive feedback.

    Args:
        request: Contains the question_id and the student's written response.
        db: SQLAlchemy database session (injected by FastAPI).

    Returns:
        FreeResponseEvaluation with score, feedback, model answer, and model info.

    Raises:
        HTTPException 400: If ANTHROPIC_API_KEY is not configured.
        HTTPException 404: If the question_id does not exist.
        HTTPException 502: If the Claude API call fails.
    """
    # Verify the API key is configured before attempting the call
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="ANTHROPIC_API_KEY not configured. Set it in .env or environment variables.",
        )

    # Look up the question by UUID
    question = db.query(Question).filter(Question.id == request.question_id).first()

    # Return 404 if the question doesn't exist in the database
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Build the user message with the question, model answer, and student response
    user_message = (
        f"Question:\n{question.stem}\n\n"
        f"Model Answer:\n{question.explanation or 'No model answer available.'}\n\n"
        f"Student's Response:\n{request.user_response}"
    )

    try:
        # Create an Anthropic client with the configured API key
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Send the evaluation request to Claude
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            system=FREE_RESPONSE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        # Extract the score from Claude's response (look for "X/10" pattern)
        response_text = message.content[0].text
        score = _extract_score(response_text)

        # Return the evaluation with score, feedback, and model answer
        return FreeResponseEvaluation(
            question_id=question.id,
            score=score,
            feedback=response_text,
            model_answer=question.explanation or "",
            model=message.model,
        )
    except HTTPException:
        raise
    except Exception as e:
        # Wrap any Claude API errors in a 502 Bad Gateway response
        raise HTTPException(
            status_code=502,
            detail=f"Claude API error: {str(e)}",
        )


def _extract_score(response_text: str) -> int:
    """
    Extract a numeric score from Claude's evaluation response.

    Looks for patterns like "Score: 7/10", "7/10", or "score of 7" in the
    response text. Falls back to 5 if no score pattern is found.

    Args:
        response_text: The full text response from Claude's evaluation.

    Returns:
        int: The extracted score clamped between 0 and 10.
    """
    import re

    # Try to find "X/10" pattern first (most common format)
    match = re.search(r"(\d+)\s*/\s*10", response_text)
    if match:
        return max(0, min(10, int(match.group(1))))

    # Try "score of X" or "score: X" pattern
    match = re.search(r"score\s*(?:of|:)\s*(\d+)", response_text, re.IGNORECASE)
    if match:
        return max(0, min(10, int(match.group(1))))

    # Default to 5 if no score pattern found
    return 5
