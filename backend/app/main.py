"""
FastAPI application entry point.

Creates the main application instance with CORS middleware
and provides a health check endpoint at the root path.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create the FastAPI application instance with metadata for API docs
app = FastAPI(
    title="usmleAI API",
    description="USMLE Study Platform API",
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
