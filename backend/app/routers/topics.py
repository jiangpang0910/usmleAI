"""
API router for USMLE topic endpoints.

Provides endpoints to list and retrieve medical topics organized
by discipline (basic_science, clinical_science, behavioral_social).
Supports filtering by USMLE step and discipline category.
Responses are cached in Redis to reduce database load on repeated requests.
"""

import json
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.knowledge import Topic, Question
from app.schemas.knowledge import TopicListResponse, TopicResponse
from app.cache import build_cache_key, cache_get, cache_set

# Create router with /api/topics prefix and "topics" tag for API docs
router = APIRouter(prefix="/api/topics", tags=["topics"])

# Cache TTL constants (in seconds)
# List endpoints use shorter TTL since they aggregate multiple records
LIST_CACHE_TTL = 300  # 5 minutes for topic listings
# Single-item endpoints use longer TTL since individual topics rarely change
ITEM_CACHE_TTL = 600  # 10 minutes for single topic detail


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
    Supports optional filtering by USMLE step and by discipline category.
    Results are cached in Redis to avoid repeated database queries.
    """
    # Build a cache key that includes the query parameters so different
    # filter combinations get separate cache entries
    cache_key = build_cache_key("topics", step=step, discipline=discipline)

    # Check Redis cache first — returns None on miss or if Redis is down
    cached = cache_get(cache_key)
    if cached is not None:
        # Cache hit: return pre-serialized JSON directly to avoid
        # double-serialization by FastAPI's response encoder
        return Response(content=cached, media_type="application/json")

    # Cache miss: query the database as normal
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

    # Serialize the ORM objects to JSON-compatible dicts using Pydantic
    # mode="json" ensures UUIDs are serialized as strings
    serialized = json.dumps(
        [TopicListResponse.model_validate(t).model_dump(mode="json") for t in topics]
    )

    # Store the serialized JSON in Redis with the list TTL
    cache_set(cache_key, serialized, ttl=LIST_CACHE_TTL)

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
    Result is cached in Redis with a longer TTL since individual topics rarely change.
    """
    # Build cache key using the topic's UUID as the distinguishing parameter
    cache_key = build_cache_key("topic", topic_id=str(topic_id))

    # Check Redis cache before hitting the database
    cached = cache_get(cache_key)
    if cached is not None:
        # Cache hit: return pre-serialized JSON directly
        return Response(content=cached, media_type="application/json")

    # Cache miss: look up the topic by its UUID primary key
    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    # Return 404 if no topic found with this ID
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Serialize the ORM object to JSON for caching
    # mode="json" converts UUIDs and other non-JSON types to strings
    serialized = json.dumps(
        TopicResponse.model_validate(topic).model_dump(mode="json")
    )

    # Store in Redis with the longer single-item TTL
    cache_set(cache_key, serialized, ttl=ITEM_CACHE_TTL)

    return topic
