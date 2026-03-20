"""
Pydantic schemas for exam simulation sessions.

Defines request and response models for:
- Creating exam sessions with USMLE-accurate block/timing structure
- Submitting per-block answers and receiving graded results
- Encoding USMLE exam format constants (blocks, questions, timing, break pool)

The exam simulation splits questions into timed blocks matching the real USMLE
format. Each block contains full QuestionResponse objects (not just IDs) so the
frontend can render them directly without additional fetches.
"""

from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.knowledge import QuestionResponse


# ---------------------------------------------------------------------------
# USMLE exam structure constants
# ---------------------------------------------------------------------------

# Default exam configuration per USMLE step.
# Step 3 uses Day 1 MCQ format (6 blocks). Day 2 CCS is not simulated in v1.
EXAM_CONFIGS = {
    "step1": {"max_blocks": 7, "questions_per_block": 40, "minutes_per_block": 60},
    "step2ck": {"max_blocks": 8, "questions_per_block": 40, "minutes_per_block": 60},
    "step3": {"max_blocks": 6, "questions_per_block": 40, "minutes_per_block": 60},
}

# Total break pool across all blocks: 45 minutes = 2700 seconds
BREAK_POOL_SECONDS = 2700


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class ExamConfigSchema(BaseModel):
    """
    Configuration for an exam simulation session.

    Specifies which USMLE step to simulate and how many blocks to run.
    block_count is capped at max_blocks for the selected step.
    """

    # Which USMLE step to simulate: "step1", "step2ck", or "step3"
    usmle_step: str = Field(
        ...,
        description="USMLE step to simulate. Must be one of: step1, step2ck, step3",
    )

    # How many blocks to run (capped at the step's max_blocks)
    block_count: int = Field(
        ...,
        ge=1,
        le=14,
        description="Number of blocks to run, capped at max_blocks for the step",
    )


class ExamSessionRequest(BaseModel):
    """
    Request schema for creating a new exam simulation session.

    Wraps ExamConfigSchema so the request body has a clear top-level structure.
    """

    # Exam configuration specifying step and block count
    config: ExamConfigSchema


class BlockAnswerItem(BaseModel):
    """
    A single answer within a block submission.

    Represents the student's response to one question. selected_option_label
    is None when the student did not answer (timed out or skipped).
    """

    # UUID of the question being answered
    question_id: UUID

    # The label the student selected ("A", "B", etc.), or None if unanswered/timed out
    selected_option_label: Optional[str] = None

    # Topic this question belongs to (denormalized for fast aggregation)
    topic_id: UUID

    # Difficulty level of the question
    difficulty: str


class SubmitBlockRequest(BaseModel):
    """
    Request schema for submitting answers for a completed exam block.

    Contains all answers for one block along with timing information.
    """

    # UUID of the exam session this block belongs to
    session_id: UUID

    # Which block number is being submitted (1-indexed)
    block_number: int

    # List of answers for every question in the block
    answers: list[BlockAnswerItem]

    # How many seconds the student spent on this block
    time_spent_seconds: int


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class ExamBlockSchema(BaseModel):
    """
    A single exam block containing timed questions.

    Returns FULL QuestionResponse objects (not just IDs) so the frontend
    ExamBlock.questions type gets renderable Question objects with stems,
    options, explanations, and all metadata.
    """

    # Block number within the exam (1-indexed)
    block_number: int

    # Full question objects for this block -- NOT just IDs
    # Matches frontend ExamBlock.questions: Question[] type contract
    questions: list[QuestionResponse]

    # Time limit for this block in seconds (e.g., 3600 for 60 minutes)
    time_limit_seconds: int


class ExamSessionResponse(BaseModel):
    """
    Response schema for a newly created exam simulation session.

    Contains the session ID, all blocks with full question data, and
    the break pool time. The frontend renders blocks directly from this.
    """

    # UUID of the created exam session
    session_id: UUID

    # List of exam blocks, each containing full question objects
    blocks: list[ExamBlockSchema]

    # Total number of questions across all blocks
    total_questions: int

    # Total break pool in seconds (45 minutes = 2700 seconds)
    break_pool_seconds: int


class BlockResultItem(BaseModel):
    """
    Result for a single question after block submission.

    Shows what the student selected, what the correct answer was,
    and whether they got it right.
    """

    # UUID of the question
    question_id: UUID

    # What the student selected (None if unanswered)
    selected_label: Optional[str]

    # The correct answer label
    correct_label: str

    # Whether the student's answer was correct
    is_correct: bool


class SubmitBlockResponse(BaseModel):
    """
    Response schema after submitting a block's answers.

    Returns the block number, score summary, and per-question results
    so the frontend can display detailed feedback.
    """

    # Which block these results are for
    block_number: int

    # Total number of questions in this block
    total: int

    # Number of correct answers in this block
    correct: int

    # Per-question breakdown of results
    questions: list[BlockResultItem]
