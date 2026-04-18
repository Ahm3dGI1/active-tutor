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

export default function SidePanel() {
  const [activeTab, setActiveTab] = useState('chat');
  const [session, setSession] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(true);

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
    if (stored[STORAGE_KEYS.ACTIVE_SESSION]) {
      setSession(stored[STORAGE_KEYS.ACTIVE_SESSION]);
    }
    setOnboarded(!!stored[STORAGE_KEYS.ONBOARDED]);

    setLoading(false);
  };

  // Listen for session creation
  useEffect(() => {
    return onMessage(MSG.SESSION_CREATED, (msg) => {
      setSession(msg.session);
    });
  }, []);

  // Listen for storage changes (session updates)
  useEffect(() => {
    const listener = (changes) => {
      if (changes[STORAGE_KEYS.ACTIVE_SESSION]) {
        setSession(changes[STORAGE_KEYS.ACTIVE_SESSION].newValue || null);
      }
    };
    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, []);

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
          {session?.title || (session ? 'Learning Session' : 'Hermex')}
        </h2>
        <p className="text-xs text-surface-400 mt-0.5">
          {session ? 'Session active' : 'No active session'}
        </p>
      </div>

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
          !onboarded ? (
            <div className="h-full overflow-y-auto p-6">
              <h2 className="text-base font-bold text-surface-800 mb-1">Welcome to Hermex</h2>
              <p className="text-xs text-surface-500 mb-5">
                Three steps and you're learning actively.
              </p>
              <ol className="space-y-3">
                {[
                  { title: 'Pin the extension', body: 'Click the puzzle icon in your toolbar and pin Hermex so it\'s always one click away.' },
                  { title: 'Open a YouTube video', body: 'Any watch page works. Shorts and the homepage don\'t — yet.' },
                  { title: 'Start a session', body: 'A "Start Hermex Session" button appears below the video title. Click it and the session begins.' },
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-surface-800">{step.title}</p>
                      <p className="text-xs text-surface-500 leading-relaxed">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-surface-400 mt-6">
                The Chat, Materials, and Recap tabs unlock once a session is active.
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <h2 className="text-lg font-bold text-surface-800 mb-2">No Active Session</h2>
              <p className="text-sm text-surface-500 mb-6">
                Paste a YouTube video URL to start a learning session.
              </p>
              <StartSessionForm onSessionCreated={(sess) => setSession(sess)} />
            </div>
          )
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
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try to get the current video URL from the content script
    const fetchCurrentVideo = async () => {
      try {
        const res = await sendToBackground(MSG.GET_VIDEO_INFO);
        if (res?.url && res?.isWatchPage) {
          setUrl(res.url);
        }
      } catch {
        // Content script might not be ready yet, that's OK
      }
    };
    fetchCurrentVideo();
  }, []);

  const handleStart = async () => {
    setError('');
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }
    setLoading(true);
    try {
      const res = await sendToBackground(MSG.CREATE_SESSION, { youtubeUrl: url });
      if (res?.error) throw new Error(res.error);
      onSessionCreated(res);
    } catch (err) {
      setError(err.message || 'Failed to create session');
    }
    setLoading(false);
  };

  return (
    <div className="w-full space-y-3">
      <input
        type="url"
        placeholder="https://youtube.com/watch?v=..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
        className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
      />
      <button
        onClick={handleStart}
        disabled={loading || !url}
        className="w-full bg-primary-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition disabled:opacity-50"
      >
        {loading ? 'Starting...' : 'Start Session'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
