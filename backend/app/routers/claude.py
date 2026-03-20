"""
API router for Claude AI integration and teaching endpoints.

Provides endpoints for:
- Testing the Anthropic Claude API connection (POST /test)
- AI-powered teaching explanations with explanation and Socratic modes (POST /explain)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from anthropic import Anthropic

from app.config import settings
from app.database import get_db
from app.models.knowledge import Question
from app.schemas.claude import ClaudeTestRequest, ClaudeTestResponse
from app.schemas.teaching import ExplanationRequest, ExplanationResponse

# Create router with /api/claude prefix and "claude" tag for API docs
router = APIRouter(prefix="/api/claude", tags=["claude"])


@router.post("/test", response_model=ClaudeTestResponse)
async def test_claude(request: ClaudeTestRequest):
    """
    Test the Claude API connection by sending a prompt and returning the response.

    Validates that the ANTHROPIC_API_KEY is configured, then sends the
    provided prompt to Claude (claude-sonnet-4-20250514) and returns the AI response.

    Returns:
        ClaudeTestResponse with the AI-generated text, model name, and "success" status.

    Raises:
        HTTPException 400: If ANTHROPIC_API_KEY is not configured in settings.
        HTTPException 502: If the Claude API call fails (network error, invalid key, etc.).
    """
    # Verify the API key is configured before attempting the call
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="ANTHROPIC_API_KEY not configured. Set it in .env or environment variables.",
        )

    try:
        # Create an Anthropic client with the configured API key
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Send the prompt to Claude and get the response
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": request.prompt}],
        )

        # Return the successful response with model info
        return ClaudeTestResponse(
            response=message.content[0].text,
            model=message.model,
            status="success",
        )
    except Exception as e:
        # Wrap any API errors in a 502 Bad Gateway response
        raise HTTPException(
            status_code=502,
            detail=f"Claude API error: {str(e)}",
        )


# System prompt for detailed explanation mode — thorough breakdown of correct/incorrect answers
EXPLANATION_SYSTEM_PROMPT = (
    "You are a medical education expert. Provide a detailed explanation of this "
    "USMLE question. Explain why the correct answer is right and why each incorrect "
    "option is wrong. Include relevant pathophysiology, clinical reasoning, and "
    "high-yield facts for exam preparation. Be thorough but concise."
)

# System prompt for Socratic teaching mode — guide student through reasoning with questions
SOCRATIC_SYSTEM_PROMPT = (
    "You are a Socratic medical tutor. Instead of giving the answer directly, guide "
    "the student through clinical reasoning with targeted questions. Ask one question "
    "at a time to help them arrive at the correct understanding. Be encouraging but "
    "rigorous. If the student has answered incorrectly, help them understand why their "
    "reasoning was flawed without directly stating the answer."
)


@router.post("/explain", response_model=ExplanationResponse)
async def explain_question(
    request: ExplanationRequest,
    db: Session = Depends(get_db),
):
    """
    Generate an AI-powered teaching explanation for a USMLE question.

    Supports two teaching modes:
    - "explanation": Detailed breakdown of why the correct answer is right
      and why each incorrect option is wrong, with pathophysiology and high-yield facts.
    - "socratic": Guided questioning that helps the student reason through
      the problem without directly revealing the answer.

    For Socratic mode, conversation_history enables multi-turn dialogue
    so Claude can build on previous exchanges.

    Args:
        request: Contains question_id, teaching_mode, optional user_answer_label,
                 and optional conversation_history for Socratic follow-up.
        db: SQLAlchemy database session (injected by FastAPI).

    Returns:
        ExplanationResponse with Claude-generated content, model, and teaching_mode.

    Raises:
        HTTPException 400: If API key is missing or teaching_mode is invalid.
        HTTPException 404: If the question_id does not exist.
        HTTPException 502: If the Claude API call fails.
    """
    # Verify the API key is configured before attempting the call
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="ANTHROPIC_API_KEY not configured. Set it in .env or environment variables.",
        )

    # Validate teaching_mode is one of the supported values
    if request.teaching_mode not in ("explanation", "socratic"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid teaching_mode '{request.teaching_mode}'. "
                   "Must be 'explanation' or 'socratic'.",
        )

    # Look up the question by UUID with eager-loaded answer options
    question = db.query(Question).filter(Question.id == request.question_id).first()

    # Return 404 if the question doesn't exist
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Select the system prompt based on the requested teaching mode
    system_prompt = (
        EXPLANATION_SYSTEM_PROMPT
        if request.teaching_mode == "explanation"
        else SOCRATIC_SYSTEM_PROMPT
    )

    # Build the user message with question details for Claude
    # Include the stem, all options, and the correct answer
    correct_option = next(
        (opt for opt in question.answer_options if opt.is_correct),
        None,
    )

    # Format the answer options as a labeled list (e.g., "A. Option text")
    options_text = "\n".join(
        f"{opt.label}. {opt.text}" for opt in question.answer_options
    )

    # Compose the user message with question context
    user_message = (
        f"Question:\n{question.stem}\n\n"
        f"Answer Options:\n{options_text}\n\n"
        f"Correct Answer: {correct_option.label}" if correct_option else
        f"Question:\n{question.stem}\n\n"
        f"Answer Options:\n{options_text}"
    )

    # If the student provided their answer, include it for personalized feedback
    if request.user_answer_label:
        user_message += f"\n\nThe student selected: {request.user_answer_label}"

    # Build the messages list starting with the user's question context
    messages = [{"role": "user", "content": user_message}]

    # Append conversation history for Socratic multi-turn follow-up
    if request.conversation_history:
        for turn in request.conversation_history:
            messages.append({
                "role": turn["role"],
                "content": turn["content"],
            })

    try:
        # Create an Anthropic client with the configured API key
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Send the teaching request to Claude with the appropriate system prompt
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            system=system_prompt,
            messages=messages,
        )

        # Return the explanation response with content and metadata
        return ExplanationResponse(
            question_id=question.id,
            teaching_mode=request.teaching_mode,
            content=message.content[0].text,
            model=message.model,
        )
    except Exception as e:
        # Wrap any Claude API errors in a 502 Bad Gateway response
        raise HTTPException(
            status_code=502,
            detail=f"Claude API error: {str(e)}",
        )
