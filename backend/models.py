from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sessions = db.relationship("Session", backref="user", lazy=True, cascade="all, delete-orphan")
    learning_profile = db.relationship("LearningProfile", backref="user", uselist=False,
                                       lazy=True, cascade="all, delete-orphan")
    context_prompt = db.relationship("UserContextPrompt", backref="user", uselist=False,
                                     lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
        }


class Session(db.Model):
    __tablename__ = "sessions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    youtube_url = db.Column(db.String(500), nullable=False)
    video_id = db.Column(db.String(50), nullable=False)
    video_title = db.Column(db.String(500), default="")
    transcript = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    checkpoints = db.relationship("Checkpoint", backref="session", lazy=True, cascade="all, delete-orphan",
                                  order_by="Checkpoint.timestamp_seconds")
    chat_messages = db.relationship("ChatMessage", backref="session", lazy=True, cascade="all, delete-orphan",
                                    order_by="ChatMessage.created_at")
    study_materials = db.relationship("StudyMaterial", backref="session", lazy=True, cascade="all, delete-orphan",
                                      order_by="StudyMaterial.created_at.desc()")
    recap = db.relationship("SessionRecap", backref="session", uselist=False,
                            lazy=True, cascade="all, delete-orphan")

    def to_dict(self, include_transcript=False, include_checkpoints=True, include_chat=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "youtube_url": self.youtube_url,
            "video_id": self.video_id,
            "video_title": self.video_title,
            "created_at": self.created_at.isoformat(),
        }
        if include_transcript:
            data["transcript"] = self.transcript
        if include_checkpoints:
            data["checkpoints"] = [c.to_dict() for c in self.checkpoints]
        if include_chat:
            data["chat_messages"] = [m.to_dict() for m in self.chat_messages]
        return data

    @property
    def score(self):
        answered = [c for c in self.checkpoints if c.user_answer is not None]
        correct = [c for c in answered if c.user_answer == c.correct_option]
        return {"answered": len(answered), "correct": len(correct), "total": len(self.checkpoints)}


class Checkpoint(db.Model):
    __tablename__ = "checkpoints"
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
    timestamp_seconds = db.Column(db.Integer, nullable=False)
    question = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(500), nullable=False)
    option_b = db.Column(db.String(500), nullable=False)
    option_c = db.Column(db.String(500), nullable=False)
    option_d = db.Column(db.String(500), nullable=False)
    correct_option = db.Column(db.String(1), nullable=False)  # A, B, C, or D
    explanation = db.Column(db.Text, nullable=False)
    user_answer = db.Column(db.String(1), nullable=True)
    answered_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "timestamp_seconds": self.timestamp_seconds,
            "question": self.question,
            "options": [self.option_a, self.option_b, self.option_c, self.option_d],
            "correct_option": self.correct_option,
            "explanation": self.explanation,
            "user_answer": self.user_answer,
            "answered_at": self.answered_at.isoformat() if self.answered_at else None,
        }


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat(),
        }


class StudyMaterial(db.Model):
    __tablename__ = "study_materials"
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
    material_type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "material_type": self.material_type,
            "title": self.title,
            "content": self.content,
            "created_at": self.created_at.isoformat(),
        }


class LearningProfile(db.Model):
    __tablename__ = "learning_profiles"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    goal = db.Column(db.String(255), default="")
    preferred_style = db.Column(db.String(100), default="")
    weak_topics = db.Column(db.Text, default="[]")
    strengths = db.Column(db.Text, default="[]")
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "goal": self.goal or "",
            "preferred_style": self.preferred_style or "",
            "weak_topics": self.weak_topics or "[]",
            "strengths": self.strengths or "[]",
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SessionRecap(db.Model):
    __tablename__ = "session_recaps"
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False, unique=True)
    title = db.Column(db.String(255), default="Session Recap")
    summary = db.Column(db.Text, nullable=False)
    weak_topics = db.Column(db.Text, default="[]")
    strengths = db.Column(db.Text, default="[]")
    next_actions = db.Column(db.Text, default="[]")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "title": self.title,
            "summary": self.summary,
            "weak_topics": self.weak_topics or "[]",
            "strengths": self.strengths or "[]",
            "next_actions": self.next_actions or "[]",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class UserContextPrompt(db.Model):
    __tablename__ = "user_context_prompts"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    prompt_text = db.Column(db.Text, default="")
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "prompt_text": self.prompt_text or "",
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
