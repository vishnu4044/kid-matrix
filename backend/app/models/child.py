from datetime import datetime, timezone

from app.extensions import db


class Child(db.Model):
    __tablename__ = "children"

    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    grade = db.Column(db.String(50), nullable=False)
    avatar = db.Column(db.String(255), nullable=True)
    learning_goals = db.Column(db.JSON, nullable=True, default=list)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    sessions = db.relationship("PracticeSession", backref="child", cascade="all, delete-orphan")
    progress_entries = db.relationship("Progress", backref="child", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "age": self.age,
            "grade": self.grade,
            "avatar": self.avatar,
            "learning_goals": self.learning_goals or [],
        }
