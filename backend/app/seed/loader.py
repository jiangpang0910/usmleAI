"""
Database seeding script for the USMLE knowledge bank.

Loads curated topics, subtopics, and questions from JSON data files
into the PostgreSQL database. Supports all three USMLE Steps
(Step 1, Step 2 CK, Step 3) across 16 medical disciplines.

Usage:
    python -m app.seed.loader
"""

import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.knowledge import Topic, Subtopic, Question, AnswerOption

# Directory containing seed data JSON files (topics.json, questions_*.json)
SEED_DIR = Path(__file__).parent / "data"


def seed_topics(db: Session) -> dict:
    """
    Load topics and subtopics from topics.json into the database.

    Reads the topics.json file, creates a Topic record for each entry,
    and creates Subtopic records for each subtopic listed under the topic.

    Args:
        db: Active SQLAlchemy session for database operations.

    Returns:
        dict: Mapping of topic name (str) to Topic ORM object,
              used by seed_questions to link questions to their topics.
    """
    # Read the topics JSON data file
    topics_file = SEED_DIR / "topics.json"
    with open(topics_file, "r") as f:
        topics_data = json.load(f)

    # Dictionary to map topic names to their ORM objects for later use
    topic_map = {}

    for topic_entry in topics_data:
        # Create the top-level Topic record
        topic = Topic(
            name=topic_entry["name"],
            discipline=topic_entry["discipline"],
            description=topic_entry.get("description"),
        )
        db.add(topic)
        # Flush to generate the topic's UUID so subtopics can reference it
        db.flush()

        # Create Subtopic records for each subtopic under this topic
        for subtopic_name in topic_entry.get("subtopics", []):
            subtopic = Subtopic(
                topic_id=topic.id,
                name=subtopic_name,
            )
            db.add(subtopic)

        # Store the topic in the map for question linking
        topic_map[topic_entry["name"]] = topic

    # Flush all subtopics so their UUIDs are available
    db.flush()
    return topic_map


def seed_questions(db: Session, topic_map: dict, filename: str) -> int:
    """
    Load questions from a JSON file and insert them into the database.

    Reads a question data file (e.g., questions_step1.json), matches each
    question to its topic and subtopic by name, and creates Question and
    AnswerOption records.

    Args:
        db: Active SQLAlchemy session for database operations.
        topic_map: Mapping of topic name -> Topic ORM object from seed_topics.
        filename: Name of the JSON file in the seed data directory.

    Returns:
        int: Number of questions successfully loaded from the file.
    """
    # Build the full path to the question data file
    questions_file = SEED_DIR / filename
    with open(questions_file, "r") as f:
        questions_data = json.load(f)

    count = 0
    for q_entry in questions_data:
        # Look up the parent topic by name
        topic = topic_map.get(q_entry["topic"])
        if not topic:
            print(f"WARNING: Topic '{q_entry['topic']}' not found, skipping question.")
            continue

        # Look up the subtopic by name within the matched topic
        subtopic_id = None
        if q_entry.get("subtopic"):
            # Search the topic's subtopics for a matching name
            for st in topic.subtopics:
                if st.name == q_entry["subtopic"]:
                    subtopic_id = st.id
                    break

        # Convert learning_objectives list to JSON string for storage
        learning_objectives = None
        if q_entry.get("learning_objectives"):
            learning_objectives = json.dumps(q_entry["learning_objectives"])

        # Create the Question record
        question = Question(
            topic_id=topic.id,
            subtopic_id=subtopic_id,
            stem=q_entry["stem"],
            question_type=q_entry.get("question_type", "single_best_answer"),
            usmle_step=q_entry["usmle_step"],
            difficulty=q_entry.get("difficulty", "medium"),
            source=q_entry.get("source", "curated"),
            explanation=q_entry.get("explanation"),
            learning_objectives=learning_objectives,
        )
        db.add(question)
        # Flush to generate the question's UUID for answer options
        db.flush()

        # Create AnswerOption records for each answer choice (A, B, C, D, E)
        for opt in q_entry.get("options", []):
            answer_option = AnswerOption(
                question_id=question.id,
                label=opt["label"],
                text=opt["text"],
                is_correct=opt.get("is_correct", False),
                explanation=opt.get("explanation"),
            )
            db.add(answer_option)

        count += 1

    return count


def seed_database():
    """
    Main seeding function -- creates tables and loads all seed data.

    This is the entry point for database seeding. It:
    1. Ensures all database tables exist (via Base.metadata.create_all)
    2. Checks if data has already been seeded (idempotency check)
    3. Loads topics and subtopics from topics.json
    4. Loads questions from all three Step-specific JSON files
    5. Commits all changes in a single transaction

    If seeding fails, all changes are rolled back to maintain consistency.
    """
    # Ensure all tables exist before attempting to insert data
    Base.metadata.create_all(bind=engine)

    # Open a new database session for the seeding transaction
    db = SessionLocal()
    try:
        # Idempotency check: skip seeding if topics already exist
        if db.query(Topic).count() > 0:
            print("Database already seeded, skipping.")
            return

        # Step 1: Load all topics and subtopics
        topic_map = seed_topics(db)

        # Step 2: Load questions from each USMLE Step file
        count = 0
        question_files = [
            "questions_step1.json",
            "questions_step2ck.json",
            "questions_step3.json",
            "questions_sequential.json",
        ]
        for filename in question_files:
            count += seed_questions(db, topic_map, filename)

        # Commit all data in a single transaction for consistency
        db.commit()
        print(f"Seeded {len(topic_map)} topics and {count} questions.")
    except Exception as e:
        # Roll back entire transaction if any error occurs
        db.rollback()
        raise e
    finally:
        # Always close the session to return the connection to the pool
        db.close()


# Allow running as a standalone script: python -m app.seed.loader
if __name__ == "__main__":
    seed_database()
