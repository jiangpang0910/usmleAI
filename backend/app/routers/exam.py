"""
API router for exam simulation endpoints.

Provides endpoints for:
- POST /api/sessions/exam/start: Create an exam session with USMLE-accurate
  block/timing structure and full question objects per block
- POST /api/sessions/exam/submit-block: Submit answers for a completed block
  and receive graded results

The exam simulation encodes USMLE format knowledge (blocks, questions per block,
time per block, break pool) so the frontend can focus purely on rendering.
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.knowledge import Question, AnswerOption
from app.models.session import StudySession, UserAnswer
from app.schemas.knowledge import QuestionResponse
from app.schemas.exam import (
    EXAM_CONFIGS,
    BREAK_POOL_SECONDS,
    ExamSessionRequest,
    ExamSessionResponse,
    ExamBlockSchema,
    SubmitBlockRequest,
    SubmitBlockResponse,
    BlockResultItem,
)

# Create router with /api/sessions/exam prefix and "exam" tag for API docs
router = APIRouter(prefix="/api/sessions/exam", tags=["exam"])


@router.post("/start", response_model=ExamSessionResponse)
def start_exam_session(
    request: ExamSessionRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new exam simulation session with USMLE-accurate block structure.

    Validates the requested USMLE step, queries randomized questions filtered
    by step, splits them into timed blocks matching the real exam format, and
    returns full QuestionResponse objects in each block so the frontend can
    render them directly without additional API calls.

    Args:
        request: Contains exam config with usmle_step and block_count.
        db: SQLAlchemy database session (injected by FastAPI).

    Returns:
        ExamSessionResponse with session ID, blocks (with full question data),
        total question count, and break pool seconds.

    Raises:
        HTTPException 400: If the requested USMLE step is not recognized.
    """
    # Step 1: Validate that the USMLE step exists in our config
    step = request.config.usmle_step
    if step not in EXAM_CONFIGS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid USMLE step '{step}'. Must be one of: {list(EXAM_CONFIGS.keys())}",
        )

    # Step 2: Look up the exam structure for this step
    config = EXAM_CONFIGS[step]
    questions_per_block = config["questions_per_block"]
    minutes_per_block = config["minutes_per_block"]
    max_blocks = config["max_blocks"]

    # Step 3: Cap block_count at the step's maximum allowed blocks
    block_count = min(request.config.block_count, max_blocks)

    # Step 4: Calculate total questions needed across all blocks
    total_needed = block_count * questions_per_block

    # Step 5: Query randomized questions filtered by USMLE step
    # Use selectinload to eagerly load answer_options (required for QuestionResponse)
    questions = (
        db.query(Question)
        .filter(Question.usmle_step == step)
        .options(selectinload(Question.answer_options))
        .order_by(func.random())
        .limit(total_needed)
        .all()
    )

    # Step 6: Handle insufficient questions gracefully (partial blocks OK)
    # If the question pool is smaller than requested, use what's available
    actual_count = len(questions)

    # Step 7: Create a StudySession record for this exam simulation
    session = StudySession(
        session_type="exam_simulation",
        usmle_step=step,
        config_json=json.dumps({
            "block_count": block_count,
            "questions_per_block": questions_per_block,
            "minutes_per_block": minutes_per_block,
            "actual_questions": actual_count,
        }),
        total_questions=actual_count,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Step 8: Split questions into blocks of questions_per_block size
    # Each chunk becomes one timed exam block
    blocks = []
    for i in range(0, actual_count, questions_per_block):
        chunk = questions[i : i + questions_per_block]
        block_number = (i // questions_per_block) + 1

        # Serialize each question as a full QuestionResponse object
        # This matches the frontend ExamBlock.questions: Question[] type
        question_responses = [
            QuestionResponse.model_validate(q) for q in chunk
        ]

        # Build the block with block number, full questions, and time limit
        blocks.append(
            ExamBlockSchema(
                block_number=block_number,
                questions=question_responses,
                time_limit_seconds=minutes_per_block * 60,
            )
        )

    # Step 9: Return the complete exam session response
    return ExamSessionResponse(
        session_id=session.id,
        blocks=blocks,
        total_questions=actual_count,
        break_pool_seconds=BREAK_POOL_SECONDS,
    )


@router.post("/submit-block", response_model=SubmitBlockResponse)
def submit_block(
    request: SubmitBlockRequest,
    db: Session = Depends(get_db),
):
    """
    Submit answers for a completed exam block and receive graded results.

    Loads the exam session, validates each answer against the correct option,
    creates UserAnswer records for history tracking, updates the session's
    running correct_count, and returns per-question results.

    Args:
        request: Contains session_id, block_number, answers, and time_spent.
        db: SQLAlchemy database session (injected by FastAPI).

    Returns:
        SubmitBlockResponse with block number, score, and per-question results.

    Raises:
        HTTPException 404: If the session_id does not exist.
    """
    # Step 1: Load the exam session by ID (404 if not found)
    session = db.query(StudySession).filter(StudySession.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")

    # Step 2: Process each answer in the block
    results = []
    correct_in_block = 0

    for answer in request.answers:
        # Look up the correct option for this question
        correct_option = (
            db.query(AnswerOption)
            .filter(
                AnswerOption.question_id == answer.question_id,
                AnswerOption.is_correct == True,  # noqa: E712 -- SQLAlchemy requires ==
            )
            .first()
        )

        # Determine the correct label (fallback to "?" if no correct option found)
        correct_label = correct_option.label if correct_option else "?"

        # Determine if the student's answer is correct
        # Unanswered (None) is always marked incorrect
        if answer.selected_option_label is None:
            is_correct = False
        else:
            is_correct = answer.selected_option_label == correct_label

        # Count correct answers for the block score
        if is_correct:
            correct_in_block += 1

        # Create a UserAnswer record for history tracking
        # Use "X" for unanswered questions since the column is non-nullable
        user_answer = UserAnswer(
            session_id=request.session_id,
            question_id=answer.question_id,
            topic_id=answer.topic_id,
            selected_option_label=answer.selected_option_label or "X",
            is_correct=is_correct,
            difficulty=answer.difficulty,
            time_spent_seconds=request.time_spent_seconds,
        )
        db.add(user_answer)

        # Build the per-question result for the response
        results.append(
            BlockResultItem(
                question_id=answer.question_id,
                selected_label=answer.selected_option_label,
                correct_label=correct_label,
                is_correct=is_correct,
            )
        )

    # Step 3: Update the session's running correct count
    session.correct_count = (session.correct_count or 0) + correct_in_block

    # Step 4: Commit all UserAnswer records and session update to the database
    db.commit()

    # Step 5: Return the block results with score summary
    return SubmitBlockResponse(
        block_number=request.block_number,
        total=len(request.answers),
        correct=correct_in_block,
        results=results,
    )
