from datetime import datetime, timezone

from app.extensions import db


class PracticeSession(db.Model):
    """Created in Phase 1 as an empty table; used starting Phase 2."""

    __tablename__ = "practice_sessions"

    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey("children.id"), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    difficulty = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending")
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    score = db.Column(db.Float, nullable=True)
    total_questions = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    questions = db.relationship(
        "Question", backref="session", cascade="all, delete-orphan", order_by="Question.order_index"
    )

    def to_dict(self, include_questions: bool = True, include_answers_key: bool = False) -> dict:
        data = {
            "id": self.id,
            "child_id": self.child_id,
            "type": self.type,
            "title": self.title,
            "difficulty": self.difficulty,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "score": self.score,
            "total_questions": self.total_questions,
        }
        if include_questions:
            data["questions"] = [q.to_dict(include_answer=include_answers_key) for q in self.questions]
        return data


class Question(db.Model):
    """Created in Phase 1 as an empty table; used starting Phase 2."""

    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("practice_sessions.id"), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False)
    prompt = db.Column(db.String(255), nullable=False)
    target = db.Column(db.String(255), nullable=False)
    expected_answer = db.Column(db.String(255), nullable=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    metadata_json = db.Column(db.JSON, nullable=True)

    answers = db.relationship("Answer", backref="question", cascade="all, delete-orphan")

    def to_dict(self, include_answer: bool = False) -> dict:
        data = {
            "id": self.id,
            "session_id": self.session_id,
            "type": self.type,
            "prompt": self.prompt,
            "target": self.target,
            "order_index": self.order_index,
            "metadata": self.metadata_json or {},
        }
        if include_answer:
            data["expected_answer"] = self.expected_answer
        return data


class Answer(db.Model):
    """Created in Phase 1 as an empty table; used starting Phase 3."""

    __tablename__ = "answers"

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=False, index=True)
    child_id = db.Column(db.Integer, db.ForeignKey("children.id"), nullable=False, index=True)
    answer = db.Column(db.String(255), nullable=True)
    image_path = db.Column(db.String(255), nullable=True)
    is_correct = db.Column(db.Boolean, nullable=True)
    confidence = db.Column(db.Float, nullable=True)
    feedback = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "question_id": self.question_id,
            "child_id": self.child_id,
            "answer": self.answer,
            "is_correct": self.is_correct,
            "confidence": self.confidence,
            "feedback": self.feedback,
        }
