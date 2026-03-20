"""
Import MedQA-USMLE-4-options dataset from HuggingFace into the usmleAI database.

Downloads 11,451 real USMLE questions from the GBaker/MedQA-USMLE-4-options dataset
and inserts them into the PostgreSQL knowledge bank. Maps meta_info fields to
USMLE steps and assigns topics based on metamap_phrases content analysis.

Usage:
    python -m app.seed.import_medqa
"""

import json
from collections import Counter
from datasets import load_dataset
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.knowledge import Topic, Subtopic, Question, AnswerOption


# Map keywords from question text to our topic names
# Each tuple is (keyword_to_search, topic_name)
TOPIC_KEYWORDS = [
    # Basic Sciences
    ("embryo", "Anatomy"), ("anatomic", "Anatomy"), ("nerve", "Anatomy"),
    ("artery", "Anatomy"), ("muscle", "Anatomy"), ("ligament", "Anatomy"),
    ("bone", "Anatomy"), ("cranial", "Anatomy"), ("brachial plexus", "Anatomy"),
    ("physiology", "Physiology"), ("cardiac output", "Physiology"),
    ("renal", "Physiology"), ("glomerular", "Physiology"),
    ("action potential", "Physiology"), ("membrane potential", "Physiology"),
    ("enzyme", "Biochemistry"), ("glycolysis", "Biochemistry"),
    ("mitochondri", "Biochemistry"), ("DNA", "Biochemistry"),
    ("RNA", "Biochemistry"), ("protein synthesis", "Biochemistry"),
    ("amino acid", "Biochemistry"), ("metabol", "Biochemistry"),
    ("chromosome", "Biochemistry"), ("genetic", "Biochemistry"),
    ("biopsy", "Pathology"), ("histolog", "Pathology"),
    ("neoplasm", "Pathology"), ("tumor", "Pathology"), ("cancer", "Pathology"),
    ("carcinoma", "Pathology"), ("lymphoma", "Pathology"),
    ("granuloma", "Pathology"), ("necrosis", "Pathology"),
    ("inflammation", "Pathology"), ("metastas", "Pathology"),
    ("mechanism of action", "Pharmacology"), ("receptor", "Pharmacology"),
    ("inhibitor", "Pharmacology"), ("antagonist", "Pharmacology"),
    ("agonist", "Pharmacology"), ("drug", "Pharmacology"),
    ("side effect", "Pharmacology"), ("toxicity", "Pharmacology"),
    ("antibiotic", "Pharmacology"),
    ("bacteria", "Microbiology"), ("virus", "Microbiology"),
    ("fungal", "Microbiology"), ("parasite", "Microbiology"),
    ("gram-positive", "Microbiology"), ("gram-negative", "Microbiology"),
    ("HIV", "Microbiology"), ("hepatitis", "Microbiology"),
    ("infection", "Microbiology"), ("immune", "Microbiology"),
    ("antibod", "Microbiology"), ("vaccine", "Microbiology"),

    # Clinical Sciences
    ("myocardial", "Internal Medicine"), ("heart failure", "Internal Medicine"),
    ("hypertension", "Internal Medicine"), ("diabetes", "Internal Medicine"),
    ("pneumonia", "Internal Medicine"), ("asthma", "Internal Medicine"),
    ("COPD", "Internal Medicine"), ("cirrhosis", "Internal Medicine"),
    ("thyroid", "Internal Medicine"), ("anemia", "Internal Medicine"),
    ("lupus", "Internal Medicine"), ("rheumatoid", "Internal Medicine"),
    ("surgical", "Surgery"), ("appendicitis", "Surgery"),
    ("cholecystitis", "Surgery"), ("hernia", "Surgery"),
    ("trauma", "Surgery"), ("fracture", "Surgery"),
    ("wound", "Surgery"), ("abscess", "Surgery"),
    ("newborn", "Pediatrics"), ("infant", "Pediatrics"),
    ("child", "Pediatrics"), ("pediatric", "Pediatrics"),
    ("neonatal", "Pediatrics"), ("adolescent", "Pediatrics"),
    ("pregnan", "Obstetrics and Gynecology"), ("gestation", "Obstetrics and Gynecology"),
    ("obstetric", "Obstetrics and Gynecology"), ("gynecolog", "Obstetrics and Gynecology"),
    ("menstrual", "Obstetrics and Gynecology"), ("uterine", "Obstetrics and Gynecology"),
    ("ovarian", "Obstetrics and Gynecology"), ("cervical", "Obstetrics and Gynecology"),
    ("contracepti", "Obstetrics and Gynecology"),
    ("depression", "Psychiatry"), ("anxiety", "Psychiatry"),
    ("schizophren", "Psychiatry"), ("bipolar", "Psychiatry"),
    ("suicide", "Psychiatry"), ("psychosis", "Psychiatry"),
    ("hallucination", "Psychiatry"), ("delusion", "Psychiatry"),
    ("substance", "Psychiatry"), ("alcohol", "Psychiatry"),
    ("emergency department", "Emergency Medicine"),
    ("acute", "Emergency Medicine"), ("resuscitat", "Emergency Medicine"),

    # Behavioral/Social
    ("sensitivity", "Biostatistics"), ("specificity", "Biostatistics"),
    ("odds ratio", "Biostatistics"), ("relative risk", "Biostatistics"),
    ("p-value", "Biostatistics"), ("confidence interval", "Biostatistics"),
    ("clinical trial", "Biostatistics"), ("randomized", "Biostatistics"),
    ("prevalence", "Epidemiology"), ("incidence", "Epidemiology"),
    ("screening", "Epidemiology"), ("outbreak", "Epidemiology"),
    ("informed consent", "Ethics"), ("autonomy", "Ethics"),
    ("confidential", "Ethics"), ("advance directive", "Ethics"),
    ("do not resuscitate", "Ethics"), ("surrogate", "Ethics"),
    ("medical error", "Patient Safety"), ("quality improvement", "Patient Safety"),
]


def classify_topic(question_text: str, metamap_phrases: list) -> str:
    """
    Classify a question into one of the 16 USMLE topics based on keyword matching.

    Searches both the question text and metamap phrases for topic-identifying keywords.
    Falls back to "Internal Medicine" if no match is found (most common topic).

    Args:
        question_text: The full question stem text
        metamap_phrases: List of medical entity annotations from the dataset

    Returns:
        Topic name string matching one of the 16 topics in our database
    """
    text_lower = question_text.lower()
    phrases_lower = " ".join(metamap_phrases).lower() if metamap_phrases else ""
    combined = text_lower + " " + phrases_lower

    for keyword, topic in TOPIC_KEYWORDS:
        if keyword.lower() in combined:
            return topic

    # Default fallback — Internal Medicine is the broadest clinical topic
    return "Internal Medicine"


def classify_difficulty(question_text: str) -> str:
    """
    Estimate question difficulty based on text length and complexity heuristics.

    Longer vignettes with more clinical data tend to be harder questions.

    Args:
        question_text: The full question stem text

    Returns:
        Difficulty string: "easy", "medium", or "hard"
    """
    length = len(question_text)
    if length < 300:
        return "easy"
    elif length < 600:
        return "medium"
    else:
        return "hard"


def import_medqa():
    """
    Main import function — downloads MedQA dataset and loads it into the database.

    Downloads the GBaker/MedQA-USMLE-4-options dataset from HuggingFace,
    classifies each question by topic and difficulty, and inserts them into
    the PostgreSQL database. Uses existing topics from the seed data.

    Clears existing questions first to avoid duplicates, but preserves
    the topic/subtopic structure.
    """
    print("Downloading MedQA-USMLE-4-options dataset from HuggingFace...")
    ds = load_dataset("GBaker/MedQA-USMLE-4-options")

    # Combine train and test splits for maximum coverage
    all_questions = list(ds["train"]) + list(ds["test"])
    print(f"Downloaded {len(all_questions)} questions")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Load existing topics into a map
        topics = db.query(Topic).all()
        if not topics:
            print("ERROR: No topics found. Run seed_database() first to create topics.")
            return

        topic_map = {t.name: t for t in topics}
        print(f"Found {len(topic_map)} topics in database")

        # Clear existing questions (we're replacing with real MedQA data)
        existing_count = db.query(Question).count()
        if existing_count > 0:
            print(f"Clearing {existing_count} existing questions...")
            db.query(AnswerOption).delete()
            db.query(Question).delete()
            db.flush()

        # Import questions
        imported = 0
        skipped = 0
        topic_counts = Counter()

        for row in all_questions:
            # Map meta_info to our usmle_step values
            if row["meta_info"] == "step1":
                usmle_step = "step1"
            else:
                # "step2&3" — alternate between step2ck and step3
                usmle_step = "step2ck" if imported % 2 == 0 else "step3"

            # Classify into one of our 16 topics
            topic_name = classify_topic(
                row["question"],
                row.get("metamap_phrases", [])
            )
            topic = topic_map.get(topic_name)
            if not topic:
                skipped += 1
                continue

            # Determine difficulty from question length
            difficulty = classify_difficulty(row["question"])

            # Create Question record
            question = Question(
                topic_id=topic.id,
                stem=row["question"],
                question_type="single_best_answer",
                usmle_step=usmle_step,
                difficulty=difficulty,
                source="curated",
                explanation=f"The correct answer is {row['answer_idx']} ({row['answer']}).",
            )
            db.add(question)
            db.flush()

            # Create 4 answer options (A, B, C, D)
            options = row["options"]
            for label in ["A", "B", "C", "D"]:
                if label in options:
                    answer_option = AnswerOption(
                        question_id=question.id,
                        label=label,
                        text=options[label],
                        is_correct=(label == row["answer_idx"]),
                    )
                    db.add(answer_option)

            imported += 1
            topic_counts[topic_name] += 1

            # Progress update every 1000 questions
            if imported % 1000 == 0:
                print(f"  Imported {imported} questions...")
                db.flush()

        db.commit()
        print(f"\nImport complete!")
        print(f"  Imported: {imported}")
        print(f"  Skipped: {skipped}")
        print(f"\nQuestions per topic:")
        for topic_name, count in sorted(topic_counts.items(), key=lambda x: -x[1]):
            print(f"  {topic_name}: {count}")

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    import_medqa()
