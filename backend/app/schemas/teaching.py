"""
Pydantic schemas for answer submission and AI-powered teaching endpoints.

Defines request and response models for:
- Answer submission (checking if a student's answer is correct)
- Claude-generated explanations (detailed explanation or Socratic teaching modes)

These schemas support the core question engine workflow: answer a question,
get immediate feedback, then request AI-powered teaching if needed.
"""

from pydantic import BaseModel
from uuid import UUID
from typing import Optional


class AnswerSubmitRequest(BaseModel):
    """
    Request schema for submitting an answer to a USMLE question.

    The student selects one option (by label) for a given question.
    The server validates the selection and returns correctness feedback.
    """

    # The UUID of the question being answered
    question_id: UUID

    # The label the user picked, e.g., "A", "B", "C", "D", or "E"
    selected_option_label: str


class OptionFeedback(BaseModel):
    """
    Per-option feedback included in the answer submission response.

    Provides details about each answer option so the student can see
    which option was correct and read per-option explanations.
    """

    # Answer label: "A", "B", "C", "D", or "E"
    label: str

    # The text content of this answer choice
    text: str

    # Whether this option is the correct answer
    is_correct: bool

    # Explanation for why this option is right or wrong (may be None)
    explanation: Optional[str]

    # Enable automatic conversion from SQLAlchemy ORM objects
    model_config = {"from_attributes": True}


class AnswerSubmitResponse(BaseModel):
    """
    Response schema for answer submission.

    Returns whether the student's answer was correct, reveals the correct
    answer, and provides per-option feedback for teaching purposes.
    """

    # The UUID of the question that was answered
    question_id: UUID

    # The label the user selected (echoed back for confirmation)
    selected_option_label: str

    # Whether the selected option is the correct answer
    is_correct: bool

    # The label of the correct answer (always revealed after submission)
    correct_option_label: str

    # The text of the correct answer option
    correct_option_text: str

    # The question's stored explanation from the database (not Claude-generated)
    explanation: Optional[str]

    # Per-option breakdown showing correctness and explanations for each choice
    options_feedback: list[OptionFeedback]

    # Enable automatic conversion from SQLAlchemy ORM objects
    model_config = {"from_attributes": True}


class ExplanationRequest(BaseModel):
    """
    Request schema for AI-powered teaching explanations.

    Supports two teaching modes:
    - "explanation": Detailed breakdown of why the correct answer is right
      and why each incorrect option is wrong.
    - "socratic": Guided questioning to help the student reason through
      the problem without directly revealing the answer.

    For Socratic mode, conversation_history enables multi-turn dialogue
    so Claude can build on previous exchanges with the student.
    """

    # The UUID of the question to explain
    question_id: UUID

    # Teaching mode: "explanation" for detailed breakdown, "socratic" for guided questioning
    teaching_mode: str = "explanation"

    # What the user picked, for personalized feedback (optional)
    user_answer_label: Optional[str] = None

    # Previous conversation turns for Socratic follow-up (list of {"role": str, "content": str})
    conversation_history: list[dict] = []


class ExplanationResponse(BaseModel):
    """
    Response schema for AI-powered teaching explanations.

    Returns the Claude-generated content along with metadata about
    which model and teaching mode were used.
    """

    # The UUID of the question that was explained
    question_id: UUID

    # The teaching mode used: "explanation" or "socratic"
    teaching_mode: str

    # The Claude-generated explanation or Socratic response
    content: str

    # The Claude model identifier used to generate the response
    model: str


class FreeResponseSubmitRequest(BaseModel):
    """
    Request schema for free-response answer submission.

    The student writes a free-text clinical reasoning response
    that will be evaluated by Claude AI for correctness and completeness.
    """

    # The UUID of the question being answered
    question_id: UUID

    # The student's written answer / clinical reasoning
    user_response: str


class FreeResponseEvaluation(BaseModel):
    """
    Response schema for AI-evaluated free-response answer.

    Returns a scored evaluation from Claude with detailed feedback
    including key points identified, missed items, and improvement suggestions.
    """

    # The question that was answered
    question_id: UUID

    # 0-10 score from Claude evaluation (10 = perfect response)
    score: int

    # Claude's evaluation with key points, missed items, suggestions
    feedback: str

    # The stored explanation as reference (model answer)
    model_answer: str

    # Claude model used for evaluation
    model: str
