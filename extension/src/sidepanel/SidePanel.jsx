import React, { useState, useEffect } from 'react';
import { sendToBackground, sendToContentScript } from '../shared/messaging.js';
import { MSG, STORAGE_KEYS } from '../shared/constants.js';
import { onMessage } from '../shared/messaging.js';
import ChatTab from './tabs/ChatTab.jsx';
import MaterialsTab from './tabs/MaterialsTab.jsx';
import RecapTab from './tabs/RecapTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';
import ErrorBoundary from '../shared/ui/ErrorBoundary.jsx';

const TABS = [
  { id: 'chat', label: 'Chat', icon: '\uD83D\uDCAC' },
  { id: 'materials', label: 'Materials', icon: '\uD83D\uDCDA' },
  { id: 'recap', label: 'Recap', icon: '\uD83D\uDCCB' },
  { id: 'settings', label: 'Settings', icon: '\u2699\uFE0F' },
];

function normalizeSessionPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.session && typeof payload.session === 'object') return payload.session;
  return payload;
}

function formatTime(totalSeconds) {
  const secs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SidePanel() {
  const [activeTab, setActiveTab] = useState('chat');
  const [session, setSession] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    // Check auth
    const authRes = await sendToBackground(MSG.AUTH_STATUS);
    setAuthenticated(authRes.authenticated);
    if (authRes.authenticated) setUser(authRes.user);

    // Check for active session and onboarding state
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.ACTIVE_SESSION,
      STORAGE_KEYS.ONBOARDED,
    ]);
    const normalizedStoredSession = normalizeSessionPayload(stored[STORAGE_KEYS.ACTIVE_SESSION]);
    if (normalizedStoredSession) {
      setSession(normalizedStoredSession);
      // Migrate old stored shape { session: {...} } to raw session object.
      if (stored[STORAGE_KEYS.ACTIVE_SESSION] !== normalizedStoredSession) {
        await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SESSION]: normalizedStoredSession });
      }
    }
    setOnboarded(!!stored[STORAGE_KEYS.ONBOARDED]);

    setLoading(false);
  };

  // Listen for session creation
  useEffect(() => {
    return onMessage(MSG.SESSION_CREATED, (msg) => {
      setSession(normalizeSessionPayload(msg.session));
    });
  }, []);

  // Listen for storage changes (session updates)
  useEffect(() => {
    const listener = (changes) => {
      if (changes[STORAGE_KEYS.ACTIVE_SESSION]) {
        setSession(normalizeSessionPayload(changes[STORAGE_KEYS.ACTIVE_SESSION].newValue) || null);
      }
    };
    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    if (!session?.checkpoints?.length) {
      setCurrentTime(0);
      return;
    }

    let cancelled = false;
    const pollCurrentTime = async () => {
      try {
        const res = await sendToContentScript(MSG.GET_CURRENT_TIME);
        if (!cancelled) {
          setCurrentTime(Number(res?.currentTime) || 0);
        }
      } catch {
        // Side panel can be open while content script is unavailable.
      }
    };

    pollCurrentTime();
    const timer = setInterval(pollCurrentTime, 1500);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session?.id, session?.checkpoints?.length]);

  const jumpToCheckpoint = async (checkpoint) => {
    try {
      const seconds = checkpoint.timestamp_seconds;
      // If unanswered, ask the content script to display the overlay (which
      // also seeks and pauses). Otherwise just seek so the user can review.
      if (checkpoint.user_answer === null) {
        await sendToContentScript(MSG.SHOW_CHECKPOINT, { checkpointId: checkpoint.id });
      } else {
        await sendToContentScript(MSG.SEEK_VIDEO_TIME, { seconds });
      }
      setCurrentTime(Number(seconds) || 0);
    } catch {
      // Side panel can be open without an active YouTube content script.
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <h2 className="text-lg font-bold text-surface-800 mb-2">Hermex</h2>
        <p className="text-sm text-surface-500 mb-4">Sign in via the extension popup to get started.</p>
        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
          <span className="text-2xl">🔒</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-100 bg-surface-50">
        <h2 className="text-sm font-bold text-surface-800 truncate">
          {session?.video_title || session?.title || (session ? 'Learning Session' : 'Hermex')}
        </h2>
        <p className="text-xs text-surface-400 mt-0.5">
          {session ? 'Session active' : 'No active session'}
        </p>
      </div>

      {session?.checkpoints?.length > 0 && (
        <div className="px-4 py-2 border-b border-surface-100 bg-surface-50/60">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold tracking-wide text-surface-600 uppercase">
              Checkpoint Timestamps
            </h3>
            <span className="text-[11px] text-surface-500">Now {formatTime(currentTime)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
            {session.checkpoints.map((cp) => {
              const answered = cp.user_answer !== null;
              const active = Math.abs(currentTime - cp.timestamp_seconds) <= 5;
              const reached = currentTime >= cp.timestamp_seconds;

              let tone = 'bg-surface-100 text-surface-600 border-surface-200';
              if (answered && cp.user_answer === cp.correct_option) {
                tone = 'bg-green-100 text-green-700 border-green-200';
              } else if (answered) {
                tone = 'bg-red-100 text-red-700 border-red-200';
              } else if (active) {
                tone = 'bg-orange-100 text-orange-700 border-orange-200';
              } else if (reached) {
                tone = 'bg-amber-100 text-amber-700 border-amber-200';
              }

              return (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => jumpToCheckpoint(cp)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${tone}`}
                  title={cp.question}
                >
                  {formatTime(cp.timestamp_seconds)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-surface-100">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'text-primary-700 border-b-2 border-primary-700 bg-primary-50/50'
                : 'text-surface-400 hover:text-surface-600'
            }`}
          >
            <span className="block text-base mb-0.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {!session && activeTab !== 'settings' ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <StartSessionForm onSessionCreated={(sess) => setSession(sess)} />
          </div>
        ) : (
          <ErrorBoundary label={`the ${activeTab} tab`}>
            {activeTab === 'chat' && <ChatTab session={session} />}
            {activeTab === 'materials' && <MaterialsTab session={session} />}
            {activeTab === 'recap' && <RecapTab session={session} />}
            {activeTab === 'settings' && (
              <SettingsTab
                session={session}
                user={user}
                onAuthChange={() => {
                  setAuthenticated(false);
                  setUser(null);
                  setSession(null);
                }}
              />
            )}
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}

function StartSessionForm({ onSessionCreated }) {
  const [videoInfo, setVideoInfo] = useState(null);
  const [detecting, setDetecting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detectVideo = async () => {
    setDetecting(true);
    setError('');
    try {
      const res = await sendToContentScript(MSG.GET_VIDEO_INFO);
      if (res?.url && res?.isWatchPage) {
        setVideoInfo(res);
      } else {
        setVideoInfo(null);
      }
    } catch {
      setVideoInfo(null);
    }
    setDetecting(false);
  };

  useEffect(() => {
    detectVideo();
  }, []);

  const handleStart = async () => {
    if (!videoInfo?.url) return;
    setError('');
    setLoading(true);
    try {
      const res = await sendToBackground(MSG.CREATE_SESSION, { youtubeUrl: videoInfo.url });
      if (res?.error) throw new Error(res.error);
      onSessionCreated(normalizeSessionPayload(res));
    } catch (err) {
      setError(err.message || 'Failed to create session');
    }
    setLoading(false);
  };

  if (detecting) {
    return (
      <div className="w-full flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-700"></div>
        <p className="text-sm text-surface-500">Looking for a YouTube video...</p>
      </div>
    );
  }

  if (!videoInfo) {
    return (
      <div className="w-full space-y-3">
        <h2 className="text-lg font-bold text-surface-800">No YouTube Video Found</h2>
        <p className="text-sm text-surface-500">
          Open a YouTube video in this tab, then click below.
        </p>
        <button
          onClick={detectVideo}
          className="w-full bg-primary-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition"
        >
          Check Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <h2 className="text-lg font-bold text-surface-800">Start a Learning Session</h2>
      <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-left">
        <p className="text-[11px] uppercase tracking-wide text-surface-500 mb-1">Detected video</p>
        <p className="text-sm font-medium text-surface-800 line-clamp-2">
          {videoInfo.title || 'YouTube video'}
        </p>
      </div>
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full bg-primary-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition disabled:opacity-50"
      >
        {loading ? 'Starting...' : 'Start Session for This Video'}
      </button>
      <button
        onClick={detectVideo}
        disabled={loading}
        className="w-full text-xs text-surface-500 hover:text-surface-700 transition"
      >
        Refresh
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
