import React, { useState, useEffect } from 'react';
import { sendToBackground } from '../../shared/messaging.js';
import { MSG } from '../../shared/constants.js';
import { getApiUrl, setApiUrl } from '../../shared/auth.js';

export default function SettingsTab({ session, user, onAuthChange }) {
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Section tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-lg p-1">
        {[
          { id: 'profile', label: 'Profile' },
          { id: 'learning', label: 'Learning' },
          { id: 'config', label: 'Config' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
              activeSection === s.id
                ? 'bg-white text-surface-800 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'profile' && <ProfileSection user={user} onAuthChange={onAuthChange} />}
      {activeSection === 'learning' && <LearningSection />}
      {activeSection === 'config' && <ConfigSection />}
    </div>
  );
}

function ProfileSection({ user, onAuthChange }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await sendToBackground(MSG.AUTH_STATUS);
      if (!res.authenticated) throw new Error('Not authenticated');

      // Update profile via a direct API call through the service worker
      const updateRes = await sendToBackground(MSG.UPDATE_PROFILE, { data: { name, email } });
      if (updateRes?.error) throw new Error(updateRes.error);
      setMessage('Profile updated!');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await sendToBackground(MSG.AUTH_LOGOUT);
    if (onAuthChange) onAuthChange();
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-surface-800">Account</h3>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-surface-500 block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-surface-500 block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {message && (
          <p className={`text-xs ${message.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
            {message}
          </p>
        )}
      </div>

      <hr className="border-surface-200" />

      <button
        onClick={handleLogout}
        className="w-full text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition border border-red-200"
      >
        Sign Out
      </button>
    </div>
  );
}

function LearningSection() {
  const [profile, setProfile] = useState(null);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileRes, contextRes] = await Promise.all([
        sendToBackground(MSG.GET_LEARNING_PROFILE),
        sendToBackground(MSG.GET_LEARNING_CONTEXT),
      ]);
      if (profileRes && !profileRes.error) setProfile(profileRes.profile || profileRes);
      if (contextRes && !contextRes.error) setContext(contextRes.prompt_text || contextRes.context?.prompt_text || '');
    } catch {
      // Profile might not exist yet
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      await sendToBackground(MSG.UPDATE_LEARNING_PROFILE, {
        data: {
          goal: profile?.goal || '',
          preferred_style: profile?.preferred_style || '',
        },
      });
      await sendToBackground(MSG.UPDATE_LEARNING_CONTEXT, { promptText: context });
      setMessage('Learning profile saved!');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-700 mx-auto"></div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-surface-800">Learning Profile</h3>
      <div>
        <label className="text-xs text-surface-500 block mb-1">Learning Goal</label>
        <input
          type="text"
          value={profile?.goal || ''}
          onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
          placeholder="e.g., Master machine learning fundamentals"
          className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
        />
      </div>
      <div>
        <label className="text-xs text-surface-500 block mb-1">Preferred Learning Style</label>
        <select
          value={profile?.preferred_style || ''}
          onChange={(e) => setProfile({ ...profile, preferred_style: e.target.value })}
          className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none bg-white"
        >
          <option value="">Select a style...</option>
          <option value="visual">Visual</option>
          <option value="auditory">Auditory</option>
          <option value="reading">Reading/Writing</option>
          <option value="kinesthetic">Kinesthetic</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-surface-500 block mb-1">Custom Context (helps the AI tutor)</label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g., I'm a 2nd year CS student who prefers examples with Python..."
          rows={4}
          className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none resize-none"
        />
      </div>
      <button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full bg-primary-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
      {message && (
        <p className={`text-xs ${message.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}

function ConfigSection() {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getApiUrl().then(setUrl);
  }, []);

  const handleSave = async () => {
    await setApiUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-surface-800">Configuration</h3>
      <div>
        <label className="text-xs text-surface-500 block mb-1">Backend API URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none font-mono"
        />
        <p className="text-xs text-surface-400 mt-1">Default: http://localhost:5000/api</p>
      </div>
      <button
        onClick={handleSave}
        className="w-full bg-primary-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition"
      >
        {saved ? 'Saved!' : 'Save URL'}
      </button>
    </div>
  );
}
