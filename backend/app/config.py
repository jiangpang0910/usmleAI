"""
Application configuration module.

Uses pydantic-settings to load configuration from environment variables
and .env files. All settings have sensible defaults for local development.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Reads from a .env file if present, with environment variables
    taking precedence over .env values.
    """

    # PostgreSQL connection string for SQLAlchemy
    # Default points to the Docker Compose PostgreSQL service
    DATABASE_URL: str = "postgresql://usmleai:usmleai_dev@localhost:5432/usmleai"

    # Anthropic API key for Claude AI integration (legacy, kept for compatibility)
    ANTHROPIC_API_KEY: str = ""

    # OpenRouter API key for teaching features (explanation + Socratic modes)
    # Get your key at https://openrouter.ai/keys
    OPENROUTER_API_KEY: str = ""

    # OpenRouter model to use for teaching
    # Kimi K2 is free on OpenRouter: moonshotai/kimi-k2:free
    OPENROUTER_MODEL: str = "moonshotai/kimi-k2:free"

    # Redis connection string for caching API responses
    # Default points to the Docker Compose Redis service on standard port
    REDIS_URL: str = "redis://localhost:6379/0"

    # Google OAuth 2.0 client ID from Google Cloud Console
    # Used by authlib to initiate the OAuth consent flow
    GOOGLE_CLIENT_ID: str = ""

    # Google OAuth 2.0 client secret from Google Cloud Console
    # Used by authlib to exchange authorization codes for tokens
    GOOGLE_CLIENT_SECRET: str = ""

    # Secret key for signing JWT access tokens
    # MUST be changed in production — generate with: python -c "import secrets; print(secrets.token_hex(32))"
    JWT_SECRET: str = "dev-secret-change-me"

    # Algorithm used for JWT signing (HS256 = HMAC-SHA256)
    JWT_ALGORITHM: str = "HS256"

    # Number of hours before a JWT access token expires
    JWT_EXPIRY_HOURS: int = 24

    # Display name for the application, used in API docs and health check
    APP_NAME: str = "usmleAI"

    # Debug mode flag — enables detailed error responses in development
    DEBUG: bool = True

    # Pydantic-settings configuration: load from .env file if it exists
    model_config = {"env_file": ".env"}


# Module-level settings instance, imported by other modules
# Usage: from app.config import settings
settings = Settings()
