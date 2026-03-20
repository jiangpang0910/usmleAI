"""
FastAPI application entry point.

Creates the main application instance with CORS middleware
and provides a health check endpoint at the root path.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

# Import models so they are registered with Base.metadata before create_all
import app.models.knowledge  # noqa: F401
import app.models.session  # noqa: F401

# Import API routers for topics, questions, answers, Claude AI, and sessions
from app.routers import topics, questions, answers, claude, sessions


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler — runs on startup and shutdown.

    On startup: creates all database tables defined by SQLAlchemy models
    if they don't already exist. This ensures the schema is ready
    without requiring a separate migration step during development.
    """
    # Create all tables that don't exist yet (safe to call repeatedly)
    Base.metadata.create_all(bind=engine)
    yield

# Create the FastAPI application instance with metadata for API docs
app = FastAPI(
    title="usmleAI API",
    description="USMLE Study Platform API",
    lifespan=lifespan,
)

# Configure CORS middleware to allow requests from the Next.js frontend
# In development, the frontend runs on http://localhost:3000
app.add_middleware(
    CORSMiddleware,
    # Allowed origins — the Next.js development server
    allow_origins=["http://localhost:3000"],
    # Allow cookies and authorization headers to be sent cross-origin
    allow_credentials=True,
    # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_methods=["*"],
    # Allow all headers in cross-origin requests
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    """
    Health check endpoint.

    Returns a simple JSON response indicating the API is running.
    Used by monitoring tools and load balancers to verify service health.
    """
    return {"status": "healthy", "app": "usmleAI"}


# Register API routers — each handles a group of related endpoints
# Topics router: GET /api/topics/ and GET /api/topics/{topic_id}
app.include_router(topics.router)

# Questions router: GET /api/questions/ and GET /api/questions/{question_id}
app.include_router(questions.router)

# Answers router: POST /api/answers/submit
app.include_router(answers.router)

# Claude router: POST /api/claude/test and POST /api/claude/explain
app.include_router(claude.router)

# Sessions router: POST /api/sessions/record-answer, GET /api/sessions/performance,
# POST /api/sessions/adaptive/start
app.include_router(sessions.router)
