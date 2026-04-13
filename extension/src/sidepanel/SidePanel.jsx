import React, { useState, useEffect } from 'react';
import { sendToBackground, sendToContentScript } from '../shared/messaging.js';
import { MSG, STORAGE_KEYS } from '../shared/constants.js';
import { onMessage } from '../shared/messaging.js';
import ChatTab from './tabs/ChatTab.jsx';
import MaterialsTab from './tabs/MaterialsTab.jsx';
import RecapTab from './tabs/RecapTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';

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

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    // Check auth
    const authRes = await sendToBackground(MSG.AUTH_STATUS);
    setAuthenticated(authRes.authenticated);
    if (authRes.authenticated) setUser(authRes.user);

    // Check for active session
    const stored = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_SESSION);
    if (stored[STORAGE_KEYS.ACTIVE_SESSION]) {
      setSession(stored[STORAGE_KEYS.ACTIVE_SESSION]);
    }

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
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-lg font-bold text-surface-800 mb-2">No Active Session</h2>
            <p className="text-sm text-surface-500">
              Navigate to a YouTube video and click "Start Hermex Session" to begin learning.
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
