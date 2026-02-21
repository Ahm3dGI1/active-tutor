import os
import json
from datetime import datetime, timedelta

import bcrypt
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)

from models import db, User, Session, Checkpoint, ChatMessage, StudyMaterial, LearningProfile, SessionRecap, UserContextPrompt
from transcript import extract_video_id, fetch_transcript, format_transcript_for_ai, get_video_title
from ai_service import (
    generate_checkpoints,
    chat_with_tutor,
    generate_study_material,
    generate_session_recap,
    build_learning_context,
)

load_dotenv()

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///learntube.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-me")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

CORS(app, supports_credentials=True)
jwt = JWTManager(app)
db.init_app(app)

with app.app_context():
    db.create_all()


def get_or_create_learning_profile(user_id):
    profile = LearningProfile.query.filter_by(user_id=user_id).first()
    if profile:
        return profile
    profile = LearningProfile(user_id=user_id)
    db.session.add(profile)
    db.session.commit()
    return profile


def get_or_create_context_prompt(user_id):
    context_prompt = UserContextPrompt.query.filter_by(user_id=user_id).first()
    if context_prompt:
        return context_prompt
    context_prompt = UserContextPrompt(user_id=user_id)
    db.session.add(context_prompt)
    db.session.commit()
    return context_prompt


def _safe_json_list(value):
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


# ──────────────────────────── AUTH ────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", "").strip()

    if not email or not password or not name:
        return jsonify({"error": "All fields are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(email=email, password_hash=hashed, name=name)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200


@app.route("/api/auth/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if "name" in data:
        user.name = data["name"].strip()
    if "email" in data:
        new_email = data["email"].strip().lower()
        existing = User.query.filter_by(email=new_email).first()
        if existing and existing.id != user.id:
            return jsonify({"error": "Email already in use"}), 409
        user.email = new_email
    if "password" in data and data["password"]:
        user.password_hash = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    db.session.commit()
    return jsonify({"user": user.to_dict()}), 200


@app.route("/api/auth/delete", methods=["DELETE"])
@jwt_required()
def delete_account():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Account deleted"}), 200


@app.route("/api/learning-profile", methods=["GET"])
@jwt_required()
def get_learning_profile():
    user_id = int(get_jwt_identity())
    profile = get_or_create_learning_profile(user_id)
    data = profile.to_dict()
    data["weak_topics"] = _safe_json_list(data.get("weak_topics"))
    data["strengths"] = _safe_json_list(data.get("strengths"))
    return jsonify({"profile": data}), 200


@app.route("/api/learning-profile", methods=["PUT"])
@jwt_required()
def update_learning_profile():
    user_id = int(get_jwt_identity())
    profile = get_or_create_learning_profile(user_id)
    data = request.get_json() or {}

    if "goal" in data:
        profile.goal = (data.get("goal") or "").strip()
    if "preferred_style" in data:
        profile.preferred_style = (data.get("preferred_style") or "").strip()
    if "weak_topics" in data and isinstance(data.get("weak_topics"), list):
        profile.weak_topics = json.dumps(data.get("weak_topics", []), ensure_ascii=False)
    if "strengths" in data and isinstance(data.get("strengths"), list):
        profile.strengths = json.dumps(data.get("strengths", []), ensure_ascii=False)

    db.session.commit()
    result = profile.to_dict()
    result["weak_topics"] = _safe_json_list(result.get("weak_topics"))
    result["strengths"] = _safe_json_list(result.get("strengths"))
    return jsonify({"profile": result}), 200


@app.route("/api/learning-context", methods=["GET"])
@jwt_required()
def get_learning_context():
    user_id = int(get_jwt_identity())
    context_prompt = get_or_create_context_prompt(user_id)
    return jsonify({"context": context_prompt.to_dict()}), 200


@app.route("/api/learning-context", methods=["PUT"])
@jwt_required()
def update_learning_context():
    user_id = int(get_jwt_identity())
    context_prompt = get_or_create_context_prompt(user_id)
    data = request.get_json() or {}
    prompt_text = data.get("prompt_text")

    if prompt_text is None:
        return jsonify({"error": "prompt_text is required"}), 400

    context_prompt.prompt_text = str(prompt_text).strip()
    db.session.commit()
    return jsonify({"context": context_prompt.to_dict()}), 200


# ──────────────────────────── SESSIONS ────────────────────────────

@app.route("/api/sessions", methods=["POST"])
@jwt_required()
def create_session():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    youtube_url = data.get("youtube_url", "").strip()

    if not youtube_url:
        return jsonify({"error": "YouTube URL is required"}), 400

    video_id = extract_video_id(youtube_url)
    if not video_id:
        return jsonify({"error": "Invalid YouTube URL"}), 400

    print(f"[session] Creating session for video_id={video_id}, url={youtube_url}")

    # Fetch transcript
    transcript_segments = fetch_transcript(video_id)
    if not transcript_segments:
        print(f"[session] Transcript fetch failed for video_id={video_id}")
        return jsonify({"error": "Could not fetch transcript. This video may not have captions available."}), 422

    print(f"[session] Got {len(transcript_segments)} transcript segments")
    formatted_transcript = format_transcript_for_ai(transcript_segments)
    video_title = get_video_title(video_id)
    print(f"[session] Video title: {video_title}")

    # Create session
    session = Session(
        user_id=user_id,
        youtube_url=youtube_url,
        video_id=video_id,
        video_title=video_title,
        transcript=formatted_transcript,
    )
    db.session.add(session)
    db.session.commit()

    # Generate checkpoints
    print(f"[session] Generating checkpoints via AI...")
    checkpoints_data = generate_checkpoints(formatted_transcript)
    print(f"[session] Generated {len(checkpoints_data)} checkpoints")

    for cp in checkpoints_data:
        checkpoint = Checkpoint(
            session_id=session.id,
            timestamp_seconds=cp["timestamp_seconds"],
            question=cp["question"],
            option_a=cp["options"][0],
            option_b=cp["options"][1],
            option_c=cp["options"][2],
            option_d=cp["options"][3],
            correct_option=cp["correct_option"],
            explanation=cp["explanation"],
        )
        db.session.add(checkpoint)

    db.session.commit()

    return jsonify({"session": session.to_dict(include_transcript=True, include_checkpoints=True)}), 201


@app.route("/api/sessions", methods=["GET"])
@jwt_required()
def list_sessions():
    user_id = int(get_jwt_identity())
    sessions = Session.query.filter_by(user_id=user_id).order_by(Session.created_at.desc()).all()
    result = []
    for s in sessions:
        d = s.to_dict(include_checkpoints=False)
        d["score"] = s.score
        result.append(d)
    return jsonify({"sessions": result}), 200


@app.route("/api/sessions/<int:session_id>", methods=["GET"])
@jwt_required()
def get_session(session_id):
    user_id = int(get_jwt_identity())
    session = Session.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    data = session.to_dict(include_transcript=True, include_checkpoints=True, include_chat=True)
    data["score"] = session.score
    return jsonify({"session": data}), 200


@app.route("/api/sessions/<int:session_id>", methods=["DELETE"])
@jwt_required()
def delete_session(session_id):
    user_id = int(get_jwt_identity())
    session = Session.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404
    db.session.delete(session)
    db.session.commit()
    return jsonify({"message": "Session deleted"}), 200


# ──────────────────────────── CHECKPOINT ANSWERS ────────────────────────────

@app.route("/api/sessions/<int:session_id>/answer", methods=["POST"])
@jwt_required()
def answer_checkpoint(session_id):
    user_id = int(get_jwt_identity())
    session = Session.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    data = request.get_json()
    checkpoint_id = data.get("checkpoint_id")
    answer = data.get("answer", "").upper()

    if answer not in ["A", "B", "C", "D"]:
        return jsonify({"error": "Invalid answer. Must be A, B, C, or D"}), 400

    checkpoint = Checkpoint.query.filter_by(id=checkpoint_id, session_id=session_id).first()
    if not checkpoint:
        return jsonify({"error": "Checkpoint not found"}), 404

    if checkpoint.user_answer is not None:
        return jsonify({"error": "Already answered"}), 409

    checkpoint.user_answer = answer
    checkpoint.answered_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "correct": answer == checkpoint.correct_option,
        "correct_option": checkpoint.correct_option,
        "explanation": checkpoint.explanation,
        "checkpoint": checkpoint.to_dict(),
    }), 200


# ──────────────────────────── CHAT ────────────────────────────

@app.route("/api/sessions/<int:session_id>/chat", methods=["POST"])
@jwt_required()
def chat(session_id):
    user_id = int(get_jwt_identity())
    session = Session.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    data = request.get_json()
    user_message = data.get("message", "").strip()
    current_time = data.get("current_time", 0)

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    # Save user message
    user_msg = ChatMessage(session_id=session_id, role="user", content=user_message)
    db.session.add(user_msg)
    db.session.commit()

    # Get conversation history
    history = [{"role": m.role, "content": m.content} for m in session.chat_messages]

    profile = get_or_create_learning_profile(user_id)
    context_prompt = get_or_create_context_prompt(user_id)
    learning_context = (context_prompt.prompt_text or "").strip()
    if not learning_context:
        learning_context = build_learning_context({
            "goal": profile.goal,
            "preferred_style": profile.preferred_style,
            "weak_topics": _safe_json_list(profile.weak_topics),
            "strengths": _safe_json_list(profile.strengths),
        })

    # Get AI response
    ai_response = chat_with_tutor(session.transcript, current_time, history[:-1], user_message, learning_context)

    # Save assistant message
    assistant_msg = ChatMessage(session_id=session_id, role="assistant", content=ai_response)
    db.session.add(assistant_msg)
    db.session.commit()

    return jsonify({
        "message": assistant_msg.to_dict(),
        "user_message": user_msg.to_dict(),
    }), 200


@app.route("/api/sessions/<int:session_id>/recap", methods=["GET"])
@jwt_required()
def get_session_recap(session_id):
    user_id = int(get_jwt_identity())
    session = Session.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    if not session.recap:
        return jsonify({"recap": None}), 200

    recap_data = session.recap.to_dict()
    recap_data["weak_topics"] = _safe_json_list(recap_data.get("weak_topics"))
    recap_data["strengths"] = _safe_json_list(recap_data.get("strengths"))
    recap_data["next_actions"] = _safe_json_list(recap_data.get("next_actions"))
    return jsonify({"recap": recap_data}), 200


@app.route("/api/sessions/<int:session_id>/recap", methods=["POST"])
@jwt_required()
def generate_recap(session_id):
    user_id = int(get_jwt_identity())
    session = Session.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    profile = get_or_create_learning_profile(user_id)
    profile_payload = {
        "goal": profile.goal,
        "preferred_style": profile.preferred_style,
        "weak_topics": _safe_json_list(profile.weak_topics),
        "strengths": _safe_json_list(profile.strengths),
        "user_context_prompt": (get_or_create_context_prompt(user_id).prompt_text or "").strip(),
    }

    checkpoints_payload = [
        {
            "question": cp.question,
            "timestamp_seconds": cp.timestamp_seconds,
            "correct_option": cp.correct_option,
            "user_answer": cp.user_answer,
        }
        for cp in session.checkpoints
    ]

    try:
        recap = generate_session_recap(
            transcript_text=session.transcript,
            checkpoints=checkpoints_payload,
            video_title=session.video_title,
            learning_profile=profile_payload,
        )

        if session.recap:
            recap_record = session.recap
            recap_record.title = recap.get("title") or "AI Session Recap"
            recap_record.summary = recap.get("summary") or ""
            recap_record.weak_topics = json.dumps(recap.get("weak_topics") or [], ensure_ascii=False)
            recap_record.strengths = json.dumps(recap.get("strengths") or [], ensure_ascii=False)
            recap_record.next_actions = json.dumps(recap.get("next_actions") or [], ensure_ascii=False)
        else:
            recap_record = SessionRecap(
                session_id=session.id,
                title=recap.get("title") or "AI Session Recap",
                summary=recap.get("summary") or "",
                weak_topics=json.dumps(recap.get("weak_topics") or [], ensure_ascii=False),
                strengths=json.dumps(recap.get("strengths") or [], ensure_ascii=False),
                next_actions=json.dumps(recap.get("next_actions") or [], ensure_ascii=False),
            )
            db.session.add(recap_record)

        # Update long-term learning profile with latest signals
        profile.weak_topics = json.dumps(recap.get("weak_topics") or [], ensure_ascii=False)
        profile.strengths = json.dumps(recap.get("strengths") or [], ensure_ascii=False)

        db.session.commit()

        recap_data = recap_record.to_dict()
        recap_data["weak_topics"] = _safe_json_list(recap_data.get("weak_topics"))
        recap_data["strengths"] = _safe_json_list(recap_data.get("strengths"))
        recap_data["next_actions"] = _safe_json_list(recap_data.get("next_actions"))
        return jsonify({"recap": recap_data}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to generate session recap"}), 500


@app.route("/api/sessions/<int:session_id>/study-materials", methods=["POST"])
@jwt_required()
def create_study_material(session_id):
    user_id = int(get_jwt_identity())
    session = Session.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    data = request.get_json() or {}
    material_types = data.get("material_types")

    # Backward compatible support for single material_type
    if material_types is None:
        single_type = (data.get("material_type") or "").strip()
        material_types = [single_type] if single_type else []

    if not isinstance(material_types, list) or not material_types:
        return jsonify({"error": "material_types must be a non-empty array"}), 400

    cleaned_material_types = []
    seen = set()
    for material_type in material_types:
        if not isinstance(material_type, str):
            continue
        item = material_type.strip()
        if item and item not in seen:
            cleaned_material_types.append(item)
            seen.add(item)

    if not cleaned_material_types:
        return jsonify({"error": "No valid material types provided"}), 400

    checkpoints = [
        {
            "question": cp.question,
            "timestamp_seconds": cp.timestamp_seconds,
            "correct_option": cp.correct_option,
            "user_answer": cp.user_answer,
        }
        for cp in session.checkpoints
    ]

    try:
        materials = []
        for material_type in cleaned_material_types:
            material = generate_study_material(
                transcript_text=session.transcript,
                material_type=material_type,
                checkpoints=checkpoints,
                score=session.score,
            )
            material_record = StudyMaterial(
                session_id=session.id,
                material_type=material["material_type"],
                title=material["title"],
                content=material["content"],
            )
            db.session.add(material_record)
            db.session.flush()
            materials.append(material_record.to_dict())

        db.session.commit()

        return jsonify({"materials": materials}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to generate study material"}), 500


@app.route("/api/sessions/<int:session_id>/study-materials", methods=["GET"])
@jwt_required()
def list_study_materials(session_id):
    user_id = int(get_jwt_identity())
    session = Session.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    return jsonify({"materials": [material.to_dict() for material in session.study_materials]}), 200


@app.route("/api/sessions/<int:session_id>/study-materials/<int:material_id>", methods=["GET"])
@jwt_required()
def get_study_material(session_id, material_id):
    user_id = int(get_jwt_identity())
    session = Session.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    material = StudyMaterial.query.filter_by(id=material_id, session_id=session.id).first()
    if not material:
        return jsonify({"error": "Study material not found"}), 404

    return jsonify({"material": material.to_dict()}), 200


# ──────────────────────────── MAIN ────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
