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

    # Anthropic API key for Claude AI integration
    # Must be set in .env or environment for AI features to work
    ANTHROPIC_API_KEY: str = ""

    # Display name for the application, used in API docs and health check
    APP_NAME: str = "usmleAI"

    # Debug mode flag — enables detailed error responses in development
    DEBUG: bool = True

    # Pydantic-settings configuration: load from .env file if it exists
    model_config = {"env_file": ".env"}


# Module-level settings instance, imported by other modules
# Usage: from app.config import settings
settings = Settings()
