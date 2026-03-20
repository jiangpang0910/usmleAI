"""
Redis cache utility module for usmleAI.

Provides helper functions for caching API responses in Redis.
All functions handle connection errors gracefully so the application
continues to work (falling back to database queries) when Redis is unavailable.
"""

import logging
from typing import Optional

import redis

from app.config import settings

# Logger for cache-related warnings (e.g., Redis connection failures)
logger = logging.getLogger(__name__)


def get_redis_client() -> Optional[redis.Redis]:
    """
    Create and return a Redis client connected to the configured REDIS_URL.

    Uses decode_responses=True so all values are returned as Python strings
    instead of bytes. Returns None if the connection cannot be established,
    allowing callers to fall back to database queries.
    """
    try:
        # Create client from URL with automatic string decoding
        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        # Verify the connection is actually working
        client.ping()
        return client
    except (redis.ConnectionError, redis.TimeoutError) as e:
        # Log warning but don't crash — Redis is optional for correctness
        logger.warning("Redis connection failed: %s", e)
        return None


def build_cache_key(prefix: str, **params) -> str:
    """
    Build a deterministic cache key from a prefix and sorted query parameters.

    Skips parameters with None values so that different filter combinations
    produce distinct cache keys. Examples:
      build_cache_key("topics", step="step1", discipline=None)
        -> "topics:step=step1"
      build_cache_key("questions", topic_id="abc", limit=10)
        -> "questions:limit=10&topic_id=abc"

    Args:
        prefix: Key namespace (e.g., "topics", "questions")
        **params: Query parameters to include in the key
    """
    # Sort params alphabetically for deterministic key ordering
    # Skip None values so missing filters don't affect the key
    parts = sorted(
        f"{k}={v}" for k, v in params.items() if v is not None
    )
    # Join with & separator, prefixed by namespace
    suffix = "&".join(parts)
    return f"{prefix}:{suffix}" if suffix else prefix


def cache_get(key: str) -> Optional[str]:
    """
    Retrieve a cached value from Redis by key.

    Returns the cached string value on a hit, or None on a miss
    or if Redis is unavailable. Callers should treat None as a cache miss
    and proceed to query the database.

    Args:
        key: The cache key to look up
    """
    try:
        client = get_redis_client()
        if client is None:
            return None
        # Returns None if key doesn't exist (cache miss)
        return client.get(key)
    except (redis.ConnectionError, redis.TimeoutError) as e:
        # Silently handle connection errors — fall back to DB
        logger.warning("Redis GET failed for key '%s': %s", key, e)
        return None


def cache_set(key: str, value: str, ttl: int = 300) -> None:
    """
    Store a value in Redis with a time-to-live (TTL) expiration.

    Silently handles connection errors so callers don't need to
    worry about Redis availability. The value will automatically
    expire after the TTL period (default 5 minutes).

    Args:
        key: The cache key to store under
        value: The string value to cache (typically JSON-serialized)
        ttl: Time-to-live in seconds (default 300 = 5 minutes)
    """
    try:
        client = get_redis_client()
        if client is None:
            return
        # SET with EX sets the key with an expiration in seconds
        client.set(key, value, ex=ttl)
    except (redis.ConnectionError, redis.TimeoutError) as e:
        # Silently handle — caching is best-effort
        logger.warning("Redis SET failed for key '%s': %s", key, e)


def cache_delete_pattern(pattern: str) -> None:
    """
    Delete all Redis keys matching a glob pattern.

    Used for cache invalidation when data changes. For example,
    cache_delete_pattern("topics:*") clears all cached topic responses.
    Uses SCAN to avoid blocking Redis with a large KEYS command.

    Args:
        pattern: Glob pattern to match keys (e.g., "topics:*")
    """
    try:
        client = get_redis_client()
        if client is None:
            return
        # Use SCAN iterator to find matching keys without blocking Redis
        for key in client.scan_iter(match=pattern):
            client.delete(key)
    except (redis.ConnectionError, redis.TimeoutError) as e:
        # Silently handle — invalidation failure means stale cache (acceptable)
        logger.warning("Redis DELETE pattern '%s' failed: %s", pattern, e)
