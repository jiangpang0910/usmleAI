"""
Import MedQA-USMLE dataset from HuggingFace into the usmleAI database.

Downloads 11,500 USMLE-style questions (CC-BY-4.0 licensed) and seeds
them into PostgreSQL, mapped to existing topics by keyword matching.

Source: https://huggingface.co/datasets/GBaker/MedQA-USMLE-4-options
License: CC-BY-4.0 (Creative Commons Attribution 4.0)
"""

import sys
import os
import json

# Add parent directory so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datasets import load_dataset
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.knowledge import Topic, Question, AnswerOption

# Mapping from meta_info field to our usmle_step values
STEP_MAP = {
    "step1": "step1",
    "step2&3": "step2ck",
}

# Keywords to map questions to topics based on question content
TOPIC_KEYWORDS = {
    "Anatomy": ["anatomy", "nerve", "artery", "vein", "muscle", "bone", "ligament", "tendon", "fascia", "foramen"],
    "Physiology": ["physiology", "homeostasis", "membrane potential", "action potential", "cardiac output", "renal clearance"],
    "Biochemistry": ["enzyme", "glycolysis", "krebs", "dna replication", "transcription", "amino acid", "metabolism", "coenzyme"],
    "Pathology": ["biopsy", "histology", "necrosis", "inflammation", "tumor", "carcinoma", "lymphoma", "metastasis", "granuloma"],
    "Pharmacology": ["drug", "medication", "receptor", "antagonist", "agonist", "inhibitor", "side effect", "pharmacokinetics", "dose"],
    "Microbiology": ["bacteria", "virus", "fungal", "parasite", "gram-positive", "gram-negative", "antibiotic", "infection", "culture"],
    "Internal Medicine": ["hypertension", "diabetes", "heart failure", "copd", "cirrhosis", "thyroid", "anemia", "chest pain"],
    "Surgery": ["surgical", "incision", "appendectomy", "cholecystectomy", "hernia", "wound", "operative", "postoperative"],
    "Pediatrics": ["child", "infant", "neonate", "pediatric", "developmental", "vaccination", "growth", "newborn"],
    "OB/GYN": ["pregnancy", "obstetric", "gynecolog", "menstrual", "cervical", "uterine", "prenatal", "trimester", "labor"],
    "Psychiatry": ["depression", "anxiety", "schizophrenia", "bipolar", "psychosis", "psychiatric", "cognitive behavioral"],
    "Emergency Medicine": ["emergency", "trauma", "acute", "resuscitation", "triage", "shock", "cardiac arrest"],
    "Biostatistics": ["sensitivity", "specificity", "p-value", "confidence interval", "odds ratio", "relative risk", "study design"],
    "Epidemiology": ["prevalence", "incidence", "outbreak", "screening", "cohort", "case-control", "randomized"],
    "Ethics": ["autonomy", "beneficence", "informed consent", "confidentiality", "advance directive", "surrogate"],
    "Patient Safety": ["medical error", "adverse event", "quality improvement", "root cause", "sentinel event"],
}


def match_topic(question_text: str, topics_by_name: dict) -> str:
    """Match a question to a topic based on keyword presence in the question text."""
    question_lower = question_text.lower()
    best_match = None
    best_score = 0

    for topic_name, keywords in TOPIC_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in question_lower)
        if score > best_score:
            best_score = score
            best_match = topic_name

    # Default to Pathology if no good match (most USMLE questions are pathology-related)
    if best_match is None or best_score == 0:
        best_match = "Pathology"

    return best_match


def import_medqa():
    """Download MedQA dataset and import into the database."""
    print("Downloading MedQA-USMLE-4-options from HuggingFace...")
    dataset = load_dataset("GBaker/MedQA-USMLE-4-options", split="train")
    print(f"Downloaded {len(dataset)} questions")

    # Also grab test split
    test_dataset = load_dataset("GBaker/MedQA-USMLE-4-options", split="test")
    print(f"Downloaded {len(test_dataset)} test questions")

    db: Session = SessionLocal()

    try:
        # Load existing topics
        topics = db.query(Topic).all()
        topics_by_name = {t.name: t for t in topics}
        print(f"Found {len(topics_by_name)} topics in database")

        if not topics_by_name:
            print("ERROR: No topics in database. Run seed_database() first.")
            return

        # Track counts per topic and step
        imported = 0
        skipped = 0
        topic_counts = {}
        step_counts = {}

        # Process both splits
        all_questions = list(dataset) + list(test_dataset)
        print(f"Processing {len(all_questions)} total questions...")

        for item in all_questions:
            question_text = item["question"]
            options = item["options"]
            answer_idx = item["answer_idx"]
            meta_info = item.get("meta_info", "step1")

            # Map USMLE step
            usmle_step = STEP_MAP.get(meta_info, "step1")

            # Match to topic
            topic_name = match_topic(question_text, topics_by_name)
            topic = topics_by_name.get(topic_name)

            if not topic:
                skipped += 1
                continue

            # Create question
            q = Question(
                topic_id=topic.id,
                stem=question_text,
                question_type="single_best_answer",
                usmle_step=usmle_step,
                difficulty="medium",
                source="curated",
                explanation=f"The correct answer is {answer_idx}.",
                learning_objectives=json.dumps([]),
            )
            db.add(q)
            db.flush()  # Get the question ID

            # Create answer options (A, B, C, D)
            for label, text in options.items():
                opt = AnswerOption(
                    question_id=q.id,
                    label=label,
                    text=text,
                    is_correct=(label == answer_idx),
                    explanation=None,
                )
                db.add(opt)

            imported += 1
            topic_counts[topic_name] = topic_counts.get(topic_name, 0) + 1
            step_counts[usmle_step] = step_counts.get(usmle_step, 0) + 1

            # Commit in batches of 500 for performance
            if imported % 500 == 0:
                db.commit()
                print(f"  Imported {imported} questions...")

        # Final commit
        db.commit()

        print(f"\n=== Import Complete ===")
        print(f"Imported: {imported}")
        print(f"Skipped: {skipped}")
        print(f"\nBy USMLE Step:")
        for step, count in sorted(step_counts.items()):
            print(f"  {step}: {count}")
        print(f"\nBy Topic:")
        for topic, count in sorted(topic_counts.items(), key=lambda x: -x[1]):
            print(f"  {topic}: {count}")

    finally:
        db.close()


if __name__ == "__main__":
    import_medqa()
