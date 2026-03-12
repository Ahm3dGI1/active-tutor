import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  getSession,
  answerCheckpoint,
  generateStudyMaterial,
  listStudyMaterials,
  getSessionRecap,
  generateSessionRecap,
} from '../api/api';
import VideoPlayer from '../components/VideoPlayer';
import CheckpointModal from '../components/CheckpointModal';
import ProgressBar from '../components/ProgressBar';
import TutorChat from '../components/TutorChat';
import SessionSummary from '../components/SessionSummary';
import StudyMaterialsPanel from '../components/StudyMaterialsPanel';
import SessionRecapPanel from '../components/SessionRecapPanel';
import { FiArrowLeft, FiMessageCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const playerRef = useRef(null);

  const [session, setSession] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [generatingStudyMaterial, setGeneratingStudyMaterial] = useState(false);
  const [generatedStudyMaterials, setGeneratedStudyMaterials] = useState([]);
  const [sessionRecap, setSessionRecap] = useState(null);
  const [generatingRecap, setGeneratingRecap] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [id]);

  useEffect(() => {
    if (checkpoints.length === 0) {
      setShowSummary(false);
      return;
    }

    const allAnswered = checkpoints.every((cp) => cp.user_answer !== null);
    if (allAnswered) {
      setShowSummary(true);
    }
  }, [checkpoints]);

  const fetchSession = async () => {
    try {
      const [sessionRes, materialsRes] = await Promise.all([
        getSession(id),
        listStudyMaterials(id),
      ]);
      setSession(sessionRes.data.session);
      setCheckpoints(sessionRes.data.session.checkpoints || []);
      setChatMessages(sessionRes.data.session.chat_messages || []);
      setGeneratedStudyMaterials(materialsRes.data.materials || []);

      try {
        const recapRes = await getSessionRecap(id);
        setSessionRecap(recapRes.data.recap || null);
      } catch {
        setSessionRecap(null);
      }
    } catch (err) {
      toast.error('Session not found');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleCheckpointReached = useCallback((checkpoint) => {
    setActiveCheckpoint(checkpoint);
  }, []);

  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
    // Update duration from player
    if (playerRef.current) {
      const d = playerRef.current.getDuration();
      if (d > 0) setDuration(d);
    }
  }, []);

  const handleAnswerSubmit = async (checkpointId, answer) => {
    try {
      const res = await answerCheckpoint(id, checkpointId, answer);
      // Update checkpoint in local state
      setCheckpoints((prev) =>
        prev.map((cp) =>
          cp.id === checkpointId
            ? { ...cp, user_answer: answer, answered_at: new Date().toISOString() }
            : cp
        )
      );
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit answer');
      throw err;
    }
  };

  const handleResumeFromCheckpoint = () => {
    setActiveCheckpoint(null);
    playerRef.current?.play();

    // Check if all checkpoints are answered
    const allAnswered = checkpoints.every((cp) => cp.user_answer !== null);
    if (allAnswered && checkpoints.length > 0) {
      // Show summary after a short delay
      setTimeout(() => setShowSummary(true), 2000);
    }
  };

  const handleChatOpen = () => {
    setShowChat(true);
    playerRef.current?.pause();
  };

  const handleGenerateStudyMaterial = async (materialTypes) => {
    setGeneratingStudyMaterial(true);
    try {
      await generateStudyMaterial(id, materialTypes);
      const materialsRes = await listStudyMaterials(id);
      setGeneratedStudyMaterials(materialsRes.data.materials || []);
      toast.success('Study materials generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate study material');
    } finally {
      setGeneratingStudyMaterial(false);
    }
  };

  const handleGenerateRecap = async () => {
    setGeneratingRecap(true);
    try {
      const res = await generateSessionRecap(id);
      setSessionRecap(res.data.recap || null);
      toast.success('Session recap generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate recap');
    } finally {
      setGeneratingRecap(false);
    }
  };

  const handleSeekToCheckpoint = (checkpoint) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(checkpoint.timestamp_seconds);
    setCurrentTime(checkpoint.timestamp_seconds);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-surface-500 text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-surface-50">
      {/* Top bar */}
      <div className="bg-white border-b border-surface-200 px-4 py-2.5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-surface-500 hover:text-primary-700 transition text-sm font-medium"
          >
            <FiArrowLeft /> Dashboard
          </button>
          <h1 className="text-sm font-medium text-surface-700 truncate max-w-[40%]">{session.video_title}</h1>
          <div className="flex items-center gap-3">
            <Link
              to={`/session/${session.id}/materials`}
              className="text-xs font-semibold text-primary-700 hover:text-primary-600"
            >
              Materials
            </Link>
            <button
              onClick={() => setShowChat(!showChat)}
              className="lg:hidden flex items-center gap-1.5 text-surface-500 hover:text-primary-700 transition text-sm"
            >
              <FiMessageCircle /> Chat
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-[1600px] mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-4" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Left: Video Column */}
          <div className="lg:w-[65%] flex flex-col">
            <div className="relative">
              <VideoPlayer
                ref={playerRef}
                videoId={session.video_id}
                checkpoints={checkpoints}
                onCheckpointReached={handleCheckpointReached}
                onTimeUpdate={handleTimeUpdate}
              />

              {/* Checkpoint Modal Overlay */}
              {activeCheckpoint && (
                <CheckpointModal
                  checkpoint={activeCheckpoint}
                  onSubmit={handleAnswerSubmit}
                  onResume={handleResumeFromCheckpoint}
                />
              )}
            </div>

            {/* Progress Bar */}
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              checkpoints={checkpoints}
              onSeekToCheckpoint={handleSeekToCheckpoint}
            />

            {/* Video Info */}
            <div className="mt-4 px-1">
              <h2 className="text-base font-semibold text-surface-800">{session.video_title}</h2>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-surface-400">
                <span>{checkpoints.length} checkpoints</span>
                <span className="w-1 h-1 bg-surface-300 rounded-full"></span>
                <span>
                  {checkpoints.filter((c) => c.user_answer !== null).length} / {checkpoints.length} answered
                </span>
              </div>
            </div>

            <StudyMaterialsPanel
              sessionId={session.id}
              generatedStudyMaterials={generatedStudyMaterials}
              generatingStudyMaterial={generatingStudyMaterial}
              onGenerateStudyMaterial={handleGenerateStudyMaterial}
            />

            <SessionRecapPanel
              recap={sessionRecap}
              generating={generatingRecap}
              onGenerate={handleGenerateRecap}
            />

            {/* Summary (shown after all checkpoints answered) */}
            {showSummary && (
              <div className="mt-6">
                <SessionSummary
                  checkpoints={checkpoints}
                  onAskTutor={() => {
                    setShowSummary(false);
                    setShowChat(true);
                  }}
                />
              </div>
            )}
          </div>

          {/* Right: Chat Column */}
          <div className={`lg:w-[35%] ${showChat ? 'block' : 'hidden lg:block'}`} style={{ height: '100%' }}>
            <TutorChat
              sessionId={session.id}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              currentTime={currentTime}
              onChatOpen={handleChatOpen}
            />
          </div>
        </div>
      </div>

      {/* Mobile Chat Toggle */}
      {!showChat && (
        <button
          onClick={handleChatOpen}
          className="lg:hidden fixed bottom-6 right-6 bg-primary-700 text-white p-4 rounded-full shadow-xl shadow-primary-700/30 hover:bg-primary-600 transition z-40"
        >
          <FiMessageCircle className="text-xl" />
        </button>
      )}
    </div>
  );
}
