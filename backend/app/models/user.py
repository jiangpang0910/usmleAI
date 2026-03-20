"""
SQLAlchemy model for authenticated users.

Stores user profiles created via Google OAuth login.
Each user is identified by their Google account ID and
linked to study progress data for personalized learning.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class User(Base):
    """
    Registered user authenticated via Google OAuth.

    Created on first login when the OAuth callback receives the user's
    Google profile. The google_id is the unique identifier from Google's
    'sub' claim in the ID token.
    """

    __tablename__ = "users"

    # UUID primary key -- universally unique identifier for each user
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Google's unique user identifier (the 'sub' claim from the ID token)
    # Used to match returning users on subsequent logins
    google_id = Column(String(100), unique=True, nullable=False)

    # User's email address from their Google profile
    # Used for display and as a secondary lookup key
    email = Column(String(255), unique=True, nullable=False)

    # Display name from the Google profile (e.g., "Jane Doe")
    # May be null if the Google account has no display name set
    name = Column(String(255), nullable=True)

    # URL to the user's Google profile picture
    # Used for avatar display in the dashboard header
    picture_url = Column(Text, nullable=True)

    # Timestamp when this user first logged in and was created
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Timestamp of the last update to this user record (e.g., profile refresh on login)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
