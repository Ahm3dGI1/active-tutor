import json
import time
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MODEL = "gpt-4o-mini"  # cheap and fast; swap to "gpt-4o" if you want higher quality

CHECKPOINT_SYSTEM_PROMPT = """You are an expert educational content designer. Given a video transcript with timestamps, generate multiple-choice questions that test comprehension of the key concepts."""

CHECKPOINT_USER_PROMPT = """Here is a video transcript with timestamps:

{transcript}

Generate {num_questions} multiple-choice checkpoint questions. For each question, choose a timestamp (in seconds) that is shortly AFTER the concept being tested was explained. Distribute questions throughout the video, not clustered at the start.

Return ONLY a valid JSON array with no markdown, no explanation, no code fences. Each object must have:
- "timestamp_seconds" (integer): when to pause the video
- "question" (string): the multiple-choice question  
- "options" (array of exactly 4 strings): answer choices
- "correct_option" (string): "A", "B", "C", or "D"
- "explanation" (string): 1-2 sentence explanation of the correct answer

Example format:
[{{"timestamp_seconds": 60, "question": "What is X?", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_option": "A", "explanation": "A is correct because..."}}]"""

TUTOR_SYSTEM_PROMPT = """You are a helpful, concise tutor for a student watching a YouTube video. You have full access to the video transcript below. Answer only questions related to the video content. Reference approximate timestamps when helpful (e.g., "around the 3:00 mark"). Be friendly and clear. If the student asks something unrelated to the video, politely redirect them.

Video Transcript:
{transcript}

Current video position: {current_time} seconds"""

SESSION_RECAP_SCHEMA = {
    "title": "string",
    "summary": "string",
    "weak_topics": ["string"],
    "strengths": ["string"],
    "next_actions": ["string"],
}

STUDY_MATERIAL_TYPES = {
    "summary": "concise study summary",
    "flashcards": "flashcards for active recall",
    "quiz": "practice quiz",
    "cheat_sheet": "one-page cheat sheet",
}

STUDY_MATERIAL_JSON_SCHEMAS = {
    "summary": {
        "type": "summary",
        "title": "string",
        "overview": "string",
        "key_points": ["string"],
        "timeline": [{"time": "mm:ss", "point": "string"}],
        "review_questions": ["string"],
    },
    "flashcards": {
        "type": "flashcards",
        "title": "string",
        "cards": [{"front": "string", "back": "string"}],
    },
    "quiz": {
        "type": "quiz",
        "title": "string",
        "questions": [{
            "question": "string",
            "options": ["string", "string", "string", "string"],
            "correct_index": 0,
            "explanation": "string",
        }],
    },
    "cheat_sheet": {
        "type": "cheat_sheet",
        "title": "string",
        "sections": [{"heading": "string", "bullets": ["string"]}],
        "formulas_or_rules": ["string"],
    },
}


def _clean_json_text(raw_text):
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    return raw_text.strip()


def _call_openai(messages, temperature=0.7, max_tokens=4096, retries=3):
    """Call OpenAI API with retry logic."""
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[openai] Attempt {attempt + 1}/{retries} failed: {e}")
            if attempt < retries - 1:
                wait = 2 ** attempt
                print(f"[openai] Retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise


def generate_checkpoints(transcript_text, num_questions=7):
    """Generate checkpoint questions from a video transcript using OpenAI."""
    try:
        prompt = CHECKPOINT_USER_PROMPT.format(
            transcript=transcript_text[:50000],
            num_questions=num_questions,
        )

        messages = [
            {"role": "system", "content": CHECKPOINT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        raw_text = _call_openai(messages, temperature=0.7, max_tokens=4096)

        # Clean up any markdown code fences
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        checkpoints = json.loads(raw_text)

        # Validate structure
        validated = []
        for cp in checkpoints:
            if all(k in cp for k in ["timestamp_seconds", "question", "options", "correct_option", "explanation"]):
                if len(cp["options"]) == 4 and cp["correct_option"] in ["A", "B", "C", "D"]:
                    validated.append(cp)

        # Sort by timestamp
        validated.sort(key=lambda x: x["timestamp_seconds"])
        return validated

    except Exception as e:
        print(f"Error generating checkpoints: {e}")
        return []


def chat_with_tutor(transcript_text, current_time, conversation_history, user_message, learning_context=""):
    """Chat with the AI tutor about the video content."""
    try:
        system = TUTOR_SYSTEM_PROMPT.format(
            transcript=transcript_text[:50000],
            current_time=current_time,
        )

        if learning_context:
            system = f"{system}\n\nLearner Context:\n{learning_context}\n\nAdapt your explanation to this learner profile."

        messages = [{"role": "system", "content": system}]

        # Add conversation history (last 20 messages)
        for msg in conversation_history[-20:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        return _call_openai(messages, temperature=0.7, max_tokens=1024)

    except Exception as e:
        print(f"Error in tutor chat: {e}")
        return "I'm sorry, I encountered an error. Please try again."


def build_learning_context(profile):
    if not profile:
        return ""

    goal = profile.get("goal", "")
    preferred_style = profile.get("preferred_style", "")
    weak_topics = profile.get("weak_topics", [])
    strengths = profile.get("strengths", [])

    lines = []
    if goal:
        lines.append(f"Goal: {goal}")
    if preferred_style:
        lines.append(f"Preferred style: {preferred_style}")
    if weak_topics:
        lines.append("Weak topics: " + ", ".join(weak_topics[:8]))
    if strengths:
        lines.append("Strong topics: " + ", ".join(strengths[:8]))

    return "\n".join(lines)


def generate_session_recap(transcript_text, checkpoints, video_title, learning_profile=None):
    learning_profile = learning_profile or {}
    prompt = f"""
Generate a personalized session recap for this learner.

Video title: {video_title}

Learner profile:
{json.dumps(learning_profile, ensure_ascii=False)}

Checkpoint performance:
{json.dumps(checkpoints[:40], ensure_ascii=False)}

Transcript:
{transcript_text[:50000]}

Return ONLY valid JSON (no markdown/code fences) matching this schema exactly:
{json.dumps(SESSION_RECAP_SCHEMA, ensure_ascii=False)}

Constraints:
- summary: max 120 words
- weak_topics/strengths: short concept phrases
- next_actions: 3 to 5 concrete actions
"""

    messages = [
        {
            "role": "system",
            "content": "You are an expert learning coach. Return only JSON.",
        },
        {
            "role": "user",
            "content": prompt,
        },
    ]

    raw = _call_openai(messages, temperature=0.5, max_tokens=1200)
    cleaned = _clean_json_text(raw)
    parsed = json.loads(cleaned)

    return {
        "title": parsed.get("title") or "AI Session Recap",
        "summary": parsed.get("summary") or "",
        "weak_topics": parsed.get("weak_topics") or [],
        "strengths": parsed.get("strengths") or [],
        "next_actions": parsed.get("next_actions") or [],
    }


def generate_study_material(transcript_text, material_type, checkpoints=None, score=None):
    """Generate a chosen study material from transcript and session performance."""
    if material_type not in STUDY_MATERIAL_TYPES:
        raise ValueError(f"Unsupported material type: {material_type}")

    checkpoints = checkpoints or []
    score = score or {}

    system_prompt = (
        "You are an expert learning designer. You must return ONLY valid JSON with no markdown, "
        "no prose before or after JSON, and no code fences."
    )

    user_prompt = f"""
Material requested: {material_type}
Material style: {STUDY_MATERIAL_TYPES[material_type]}

Student performance:
- Answered: {score.get('answered', 0)}
- Correct: {score.get('correct', 0)}
- Total: {score.get('total', 0)}

Checkpoint review data:
{json.dumps(checkpoints[:20], ensure_ascii=False)}

Video transcript:
{transcript_text[:50000]}

Requirements:
1) Adapt to likely weak spots from incorrect or skipped checkpoints.
2) Keep content concise but complete.
3) Return ONLY valid JSON and match this exact schema:
{json.dumps(STUDY_MATERIAL_JSON_SCHEMAS[material_type], ensure_ascii=False)}
4) The root "type" must be "{material_type}".
"""

    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        raw_content = _call_openai(messages, temperature=0.6, max_tokens=1600)
        cleaned_content = _clean_json_text(raw_content)
        parsed = json.loads(cleaned_content)

        if parsed.get("type") != material_type:
            parsed["type"] = material_type

        title = parsed.get("title") or STUDY_MATERIAL_TYPES[material_type].title()

        return {
            "material_type": material_type,
            "title": title,
            "content": json.dumps(parsed, ensure_ascii=False),
        }
    except Exception as e:
        print(f"Error generating study material: {e}")
        raise
