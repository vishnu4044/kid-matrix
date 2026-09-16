"""Seed demo data: parent John Doe with children Emma and Noah, plus enough
sample practice history and progress that dashboards aren't empty.

Run with: python seed.py
"""
import random
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db
from app.models import User, Child, PracticeSession, Question, Progress

app = create_app()

LETTERS_AF = list("ABCDEF")


def seed_letter_progress(child: Child, target_accuracy_pct: dict[str, int]) -> None:
    for letter in LETTERS_AF:
        attempts = random.randint(2, 4)
        accuracy = target_accuracy_pct.get(letter, 80)
        correct = round(attempts * accuracy / 100)
        db.session.add(
            Progress(
                child_id=child.id,
                subject="letters",
                topic=letter,
                attempts=attempts,
                correct=correct,
                accuracy=round((correct / attempts) * 100, 1),
                last_practiced=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 5)),
            )
        )


def seed_subject_progress(child: Child, subject: str, topics: list[str], accuracy_pct: int) -> None:
    for topic in topics:
        attempts = random.randint(3, 6)
        correct = round(attempts * accuracy_pct / 100)
        db.session.add(
            Progress(
                child_id=child.id,
                subject=subject,
                topic=topic,
                attempts=attempts,
                correct=correct,
                accuracy=round((correct / attempts) * 100, 1),
                last_practiced=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 5)),
            )
        )


def seed_history_session(child: Child, session_type: str, title: str, days_ago: int, total: int, score: float) -> None:
    started = datetime.now(timezone.utc) - timedelta(days=days_ago, minutes=10)
    completed = started + timedelta(minutes=6)
    session = PracticeSession(
        child_id=child.id,
        type=session_type,
        title=title,
        difficulty="beginner",
        status="completed",
        started_at=started,
        completed_at=completed,
        score=score,
        total_questions=total,
    )
    db.session.add(session)
    db.session.flush()

    question_type = {"letters": "letter", "numbers": "number", "math": "math", "shapes": "shape"}[session_type]
    for i in range(total):
        db.session.add(
            Question(
                session_id=session.id,
                order_index=i,
                type=question_type,
                prompt=f"Sample question {i + 1}",
                target="A",
                expected_answer="A",
            )
        )


with app.app_context():
    user = User.query.filter_by(email="john@example.com").first()
    if not user:
        user = User(name="John Doe", email="john@example.com")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()
        print("Created parent: john@example.com / password123")
    else:
        print("Parent already exists: john@example.com")

    emma = Child.query.filter_by(parent_id=user.id, name="Emma").first()
    if not emma:
        emma = Child(
            parent_id=user.id,
            name="Emma",
            age=5,
            grade="Kindergarten",
            avatar="🦄",
            learning_goals=["Letters", "Numbers", "Shapes", "Basic Math"],
        )
        db.session.add(emma)
        db.session.flush()

    noah = Child.query.filter_by(parent_id=user.id, name="Noah").first()
    if not noah:
        noah = Child(
            parent_id=user.id,
            name="Noah",
            age=7,
            grade="Grade 1",
            avatar="🚀",
            learning_goals=["Numbers", "Math", "Shapes"],
        )
        db.session.add(noah)
        db.session.flush()

    db.session.commit()
    print("Seeded children: Emma (Kindergarten, 5), Noah (Grade 1, 7)")

    if Progress.query.filter_by(child_id=emma.id).count() == 0:
        seed_letter_progress(emma, {"A": 100, "B": 100, "C": 80, "D": 60, "E": 100, "F": 80})
        seed_subject_progress(emma, "numbers", ["numbers"], 72)
        seed_subject_progress(emma, "shapes", ["circle", "square", "triangle"], 90)
        seed_subject_progress(emma, "math", ["addition", "subtraction"], 68)

        seed_history_session(emma, "letters", "Letters A-F", days_ago=0, total=10, score=90)
        seed_history_session(emma, "math", "Addition Practice", days_ago=1, total=10, score=80)
        seed_history_session(emma, "numbers", "Numbers 1-20", days_ago=2, total=20, score=75)
        db.session.commit()
        print("Seeded sample progress + practice history for Emma")
    else:
        print("Emma already has progress data; skipping sample history")
