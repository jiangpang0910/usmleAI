"""
Authentication router for Google OAuth login.

Handles the OAuth 2.0 flow: redirecting users to Google's consent screen,
processing the callback with authorization code exchange, creating/updating
user records, and issuing JWT access tokens.
"""

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends
from starlette.requests import Request
from starlette.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.auth import create_access_token, get_current_user

# Create the API router with a prefix and tag for OpenAPI docs grouping
router = APIRouter(prefix="/api/auth", tags=["auth"])

# Initialize the authlib OAuth client for Google
# Uses OpenID Connect discovery to automatically configure endpoints
oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/google/login")
async def google_login(request: Request):
    """
    Initiate the Google OAuth login flow.

    Generates the authorization URL and redirects the user to Google's
    consent screen. After the user grants permission, Google redirects
    back to the /google/callback endpoint with an authorization code.
    """
    # Build the callback URL that Google will redirect to after consent
    redirect_uri = "http://localhost:8000/api/auth/google/callback"

    # Use authlib to generate the authorization URL and redirect
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """
    Handle the Google OAuth callback after user consent.

    Exchanges the authorization code for tokens, extracts user profile
    info from the ID token, creates or updates the User record in the
    database, and redirects to the frontend with a JWT access token.
    """
    # Exchange the authorization code for access + ID tokens
    token = await oauth.google.authorize_access_token(request)

    # Extract user info from the ID token (sub, email, name, picture)
    user_info = token.get("userinfo")

    # Look up existing user by Google's unique subject identifier
    google_id = user_info["sub"]
    user = db.query(User).filter(User.google_id == google_id).first()

    if user:
        # Returning user -- update profile fields in case they changed
        user.name = user_info.get("name")
        user.picture_url = user_info.get("picture")
        db.commit()
        db.refresh(user)
    else:
        # New user -- create a record with their Google profile data
        user = User(
            google_id=google_id,
            email=user_info["email"],
            name=user_info.get("name"),
            picture_url=user_info.get("picture"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Generate a JWT access token for the authenticated user
    jwt_token = create_access_token(
        user_id=str(user.id),
        email=user.email,
    )

    # Redirect to the frontend with the JWT as a URL query parameter
    # The frontend extracts this token and stores it in localStorage
    return RedirectResponse(url=f"http://localhost:3000?token={jwt_token}")


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """
    Return the authenticated user's profile.

    Protected endpoint that requires a valid JWT Bearer token.
    Returns the user's basic profile information for display
    in the frontend header.
    """
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url,
    }


@router.post("/logout")
async def logout():
    """
    Logout endpoint (no-op on server side).

    JWT authentication is stateless, so logout is handled entirely
    on the client by deleting the stored token. This endpoint exists
    for API completeness and future extensibility (e.g., token blocklist).
    """
    return {"ok": True}
