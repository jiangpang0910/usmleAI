"""
API router for Claude AI integration testing.

Provides a test endpoint to verify the Anthropic Claude API connection
is working correctly. Used during setup to confirm the API key is valid
and the AI can generate medical content.
"""

from fastapi import APIRouter, HTTPException

from anthropic import Anthropic

from app.config import settings
from app.schemas.claude import ClaudeTestRequest, ClaudeTestResponse

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
