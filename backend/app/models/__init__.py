"""
Models package — re-exports all SQLAlchemy ORM models.

Import models from here for convenience:
    from app.models import Topic, Subtopic, Question, AnswerOption
"""

from app.models.knowledge import Topic, Subtopic, Question, AnswerOption

__all__ = ["Topic", "Subtopic", "Question", "AnswerOption"]
