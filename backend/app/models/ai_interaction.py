from datetime import datetime, timezone

from app.extensions import db


class AIInteraction(db.Model):
    """Created in Phase 1 as an empty table; used starting Phase 5."""

    __tablename__ = "ai_interactions"

    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey("children.id"), nullable=True, index=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    question = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=False)
    interaction_type = db.Column(db.String(30), nullable=False, default="tutor")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "child_id": self.child_id,
            "question": self.question,
            "response": self.response,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
