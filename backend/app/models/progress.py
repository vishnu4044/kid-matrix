from datetime import datetime, timezone

from app.extensions import db


class Progress(db.Model):
    """Created in Phase 1 as an empty table; used starting Phase 4."""

    __tablename__ = "progress"

    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey("children.id"), nullable=False, index=True)
    subject = db.Column(db.String(50), nullable=False)
    topic = db.Column(db.String(50), nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    correct = db.Column(db.Integer, nullable=False, default=0)
    accuracy = db.Column(db.Float, nullable=False, default=0.0)
    last_practiced = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
