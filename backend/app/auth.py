"""
JWT authentication utilities for the usmleAI API.

Provides functions to create and verify JWT access tokens,
plus FastAPI dependencies for protecting routes with optional
or required authentication.
"""

from datetime import datetime, timezone, timedelta

from fastapi import Depends, HTTPException, status
from starlette.requests import Request
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.config import settings
from app.database import get_db
from app.models.user import User


def create_access_token(user_id: str, email: str) -> str:
    """
    Create a signed JWT access token for an authenticated user.

    Encodes the user's ID (as 'sub') and email into the token payload
    with an expiration time based on JWT_EXPIRY_HOURS from settings.

    Args:
        user_id: The user's UUID as a string (stored as the 'sub' claim)
        email: The user's email address (stored for convenience)

    Returns:
        A signed JWT string that can be sent to the client
    """
    # Calculate token expiration timestamp
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)

    # Build the JWT payload with standard and custom claims
    payload = {
        "sub": user_id,       # Subject: the user's UUID
        "email": email,       # User's email for quick access without DB lookup
        "exp": expire,        # Expiration time (UTC)
    }

    # Sign and return the JWT using the configured secret and algorithm
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> User | None:
    """
    FastAPI dependency that extracts the current user from the JWT token.

    Reads the Authorization header, decodes the Bearer token, and looks up
    the user in the database. Returns None if no token is provided or if
    the token is invalid -- this is the OPTIONAL version for routes that
    work both logged-in and anonymously.

    Args:
        request: The incoming HTTP request (to read Authorization header)
        db: SQLAlchemy database session (injected by FastAPI)

    Returns:
        The authenticated User object, or None if not authenticated
    """
    # Extract the Authorization header value
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    # Extract the token string after "Bearer "
    token = auth_header.split(" ", 1)[1]

    try:
        # Decode and verify the JWT signature and expiration
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        # Invalid token (expired, bad signature, malformed) -- treat as unauthenticated
        return None

    # Look up the user in the database by their UUID
    user = db.query(User).filter(User.id == user_id).first()
    return user


async def get_current_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    """
    FastAPI dependency that REQUIRES authentication.

    Wraps get_current_user_optional and raises a 401 error if no valid
    user was found. Use this for routes that must be accessed by
    authenticated users only.

    Args:
        user: The user from get_current_user_optional (may be None)

    Returns:
        The authenticated User object

    Raises:
        HTTPException: 401 Unauthorized if user is None
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
