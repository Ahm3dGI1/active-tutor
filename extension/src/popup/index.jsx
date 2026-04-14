import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { sendToBackground } from '../shared/messaging.js';
import { MSG, STORAGE_KEYS } from '../shared/constants.js';
import { syncDarkTheme } from '../shared/theme.js';
import '../content/styles.css';

syncDarkTheme();

function Popup() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginMode, setLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadSessions();
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await sendToBackground(MSG.AUTH_STATUS);
      if (res.authenticated) setUser(res.user);
    } catch (err) {
      console.error('Auth check failed:', err);
    }
    setLoading(false);
  };

  const loadSessions = async () => {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_SESSION);
      setActiveSession(stored[STORAGE_KEYS.ACTIVE_SESSION] || null);
      const list = await sendToBackground(MSG.LIST_SESSIONS);
      if (Array.isArray(list)) setRecentSessions(list.slice(0, 3));
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const type = loginMode ? MSG.AUTH_LOGIN : MSG.AUTH_REGISTER;
      const payload = loginMode
        ? { email, password }
        : { email, password, name };
      const res = await sendToBackground(type, payload);
      if (res.error) throw new Error(res.error);
      setUser(res.user);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    await sendToBackground(MSG.AUTH_LOGOUT);
    setUser(null);
    setActiveSession(null);
    setRecentSessions([]);
  };

  const openSidePanel = async () => {
    await sendToBackground(MSG.OPEN_SIDE_PANEL);
    window.close();
  };

  const handleEndSession = async () => {
    await sendToBackground(MSG.END_SESSION);
    setActiveSession(null);
  };

  const handleResume = async (s) => {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SESSION]: s });
    setActiveSession(s);
    await sendToBackground(MSG.OPEN_SIDE_PANEL);
    window.close();
  };

  if (loading) {
    return (
      <div className="w-72 p-6 bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="w-72 p-4 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-primary-700">
              {(user.name || user.email)[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-surface-800">{user.name || 'User'}</p>
            <p className="text-xs text-surface-400">{user.email}</p>
          </div>
        </div>

        {activeSession && (
          <div className="mb-3 p-2.5 bg-primary-50 rounded-lg border border-primary-100">
            <p className="text-xs text-primary-600 font-medium mb-0.5">Active session</p>
            <p className="text-xs text-surface-700 truncate mb-2">{activeSession.title || 'Learning Session'}</p>
            <div className="flex gap-1.5">
              <button
                onClick={openSidePanel}
                className="flex-1 bg-primary-700 text-white py-1 rounded text-xs font-medium hover:bg-primary-600 transition"
              >
                Open
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 text-surface-500 py-1 rounded text-xs hover:text-red-600 border border-surface-200 transition"
              >
                End
              </button>
            </div>
          </div>
        )}

        {!activeSession && (
          <button
            onClick={openSidePanel}
            className="w-full bg-primary-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition mb-2"
          >
            Open Hermex Panel
          </button>
        )}

        {recentSessions.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-surface-500 mb-1.5">Recent sessions</p>
            <div className="space-y-1">
              {recentSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleResume(s)}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-surface-50 transition"
                >
                  <p className="text-xs text-surface-700 truncate">{s.title || `Session ${s.id}`}</p>
                  {s.score && (
                    <p className="text-[10px] text-surface-400">
                      {s.score.correct}/{s.score.total} correct
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full text-surface-500 py-1.5 rounded-lg text-xs hover:text-surface-700 transition"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 p-4 bg-white">
      <h1 className="text-lg font-bold text-primary-700 mb-1">Hermex</h1>
      <p className="text-xs text-surface-400 mb-4">
        {loginMode ? 'Sign in to your account' : 'Create a new account'}
      </p>
      {error && (
        <div className="bg-red-50 text-red-700 text-xs p-2 rounded-lg mb-3">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {!loginMode && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition disabled:opacity-50"
        >
          {submitting ? 'Please wait...' : loginMode ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      <button
        onClick={() => { setLoginMode(!loginMode); setError(''); }}
        className="w-full text-primary-600 text-xs mt-3 hover:underline"
      >
        {loginMode ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Popup />);
