"""Builds the minimum child context needed for an AI request (spec section 5/35:
only real data from SQLite, never fabricated, and only what's needed for the task)."""
from app.models import Child, PracticeSession, Progress


def build_child_context(child: Child) -> dict:
    progress_entries = Progress.query.filter_by(child_id=child.id).all()

    by_subject: dict[str, dict] = {}
    for e in progress_entries:
        bucket = by_subject.setdefault(e.subject, {"attempts": 0, "correct": 0, "topics": {}})
        bucket["attempts"] += e.attempts
        bucket["correct"] += e.correct
        bucket["topics"][e.topic] = e.accuracy

    subject_accuracy = {
        subject: round((d["correct"] / d["attempts"]) * 100, 1) if d["attempts"] else 0
        for subject, d in by_subject.items()
    }
    weak_topics = [
        f"{subject}:{topic}"
        for subject, d in by_subject.items()
        for topic, accuracy in d["topics"].items()
        if accuracy < 60
    ]

    recent_sessions = (
        PracticeSession.query.filter_by(child_id=child.id, status="completed")
        .order_by(PracticeSession.completed_at.desc())
        .limit(5)
        .all()
    )

    return {
        "name": child.name,
        "age": child.age,
        "grade": child.grade,
        "learning_goals": child.learning_goals or [],
        "subject_accuracy": subject_accuracy,
        "weak_topics": weak_topics,
        "recent_sessions": [
            {"title": s.title, "type": s.type, "score": s.score, "completed_at": s.completed_at.isoformat()}
            for s in recent_sessions
        ],
    }
