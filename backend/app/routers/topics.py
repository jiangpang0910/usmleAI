"""
API router for USMLE topic endpoints.

Provides endpoints to list and retrieve medical topics organized
by discipline (basic_science, clinical_science, behavioral_social).
Supports filtering by USMLE step and discipline category.
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.knowledge import Topic, Question
from app.schemas.knowledge import TopicListResponse, TopicResponse

# Create router with /api/topics prefix and "topics" tag for API docs
router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("/", response_model=list[TopicListResponse])
def list_topics(
    step: Optional[str] = Query(
        None,
        description="Filter by USMLE step (step1, step2ck, step3). "
        "Only returns topics that have at least one question for this step.",
    ),
    discipline: Optional[str] = Query(
        None,
        description="Filter by discipline category "
        "(basic_science, clinical_science, behavioral_social).",
    ),
    db: Session = Depends(get_db),
):
    """
    List all topics in the knowledge bank.

    Returns a compact list of topics without subtopic details.
    Supports optional filtering by USMLE step (only topics with questions
    for that step) and by discipline category.
    """
    # Start with a base query for all topics
    query = db.query(Topic)

    # Filter by discipline if provided (e.g., only basic_science topics)
    if discipline:
        query = query.filter(Topic.discipline == discipline)

    # Filter by USMLE step: only return topics that have at least one
    # question matching the specified step
    if step:
        query = query.filter(
            Topic.id.in_(
                db.query(Question.topic_id).filter(Question.usmle_step == step)
            )
        )

    # Order alphabetically by topic name for consistent results
    topics = query.order_by(Topic.name).all()
    return topics


@router.get("/{topic_id}", response_model=TopicResponse)
def get_topic(
    topic_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get a single topic by ID, including its subtopics.

    Returns detailed topic information with nested subtopic data.
    Raises 404 if the topic ID does not exist.
    """
    # Look up the topic by its UUID primary key
    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    # Return 404 if no topic found with this ID
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    return topic
