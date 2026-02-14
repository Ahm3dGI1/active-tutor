import re
import traceback
from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url):
    """Extract the YouTube video ID from various URL formats."""
    patterns = [
        r'(?:v=|\/v\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def fetch_transcript(video_id):
    """Fetch the transcript for a YouTube video. Returns list of dicts with 'text' and 'start' keys."""
    print(f"[transcript] Fetching transcript for video: {video_id}")

    # Try v1.x API first (instance-based .fetch())
    try:
        ytt = YouTubeTranscriptApi()
        result = ytt.fetch(video_id)
        segments = [{"text": snippet.text, "start": snippet.start, "duration": snippet.duration} for snippet in result]
        print(f"[transcript] Success (v1.x API): got {len(segments)} segments")
        return segments
    except AttributeError:
        print("[transcript] v1.x instance .fetch() not available, trying alternatives...")
    except Exception as e:
        print(f"[transcript] v1.x instance .fetch() failed: {e}")
        traceback.print_exc()

    # Try v1.x class method
    try:
        result = YouTubeTranscriptApi.fetch(video_id)
        segments = [{"text": snippet.text, "start": snippet.start, "duration": snippet.duration} for snippet in result]
        print(f"[transcript] Success (v1.x class method): got {len(segments)} segments")
        return segments
    except (AttributeError, TypeError):
        print("[transcript] v1.x class method not available, trying v0.x API...")
    except Exception as e:
        print(f"[transcript] v1.x class method failed: {e}")
        traceback.print_exc()

    # Try v0.x API (class method .get_transcript())
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        print(f"[transcript] Success (v0.x API): got {len(transcript_list)} segments")
        return transcript_list
    except Exception as e:
        print(f"[transcript] v0.x get_transcript() also failed: {e}")
        traceback.print_exc()

    print("[transcript] All methods failed. No transcript available.")
    return None


def format_transcript_for_ai(transcript_segments):
    """Format transcript segments into a single string with timestamps for the AI."""
    if not transcript_segments:
        return ""

    lines = []
    for seg in transcript_segments:
        minutes = int(seg["start"] // 60)
        seconds = int(seg["start"] % 60)
        timestamp = f"[{minutes:02d}:{seconds:02d}]"
        lines.append(f"{timestamp} {seg['text']}")

    return "\n".join(lines)


def get_plain_transcript(transcript_segments):
    """Get plain text transcript without timestamps."""
    if not transcript_segments:
        return ""
    return " ".join(seg["text"] for seg in transcript_segments)


def get_video_title(video_id):
    """Try to get the video title using yt-dlp."""
    try:
        import yt_dlp
        ydl_opts = {"quiet": True, "no_warnings": True, "skip_download": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return info.get("title", "Untitled Video")
    except Exception:
        return "Untitled Video"
