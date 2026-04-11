import React, { useState, useEffect } from 'react';
import { sendToBackground } from '../shared/messaging.js';
import { MSG, STORAGE_KEYS } from '../shared/constants.js';
import { onMessage } from '../shared/messaging.js';
import ActivateButton from './components/ActivateButton.jsx';

export default function ContentApp({ videoId, player }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Check auth status and look for existing session
  useEffect(() => {
    (async () => {
      const authRes = await sendToBackground(MSG.AUTH_STATUS);
      setAuthenticated(authRes.authenticated);

      // Check for active session in storage
      const stored = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_SESSION);
      const activeSession = stored[STORAGE_KEYS.ACTIVE_SESSION];
      if (activeSession?.video_id === videoId) {
        setSession(activeSession);
      }
    })();
  }, [videoId]);

  // Listen for session creation broadcasts
  useEffect(() => {
    return onMessage(MSG.SESSION_CREATED, (msg) => {
      if (msg.session?.video_id === videoId) {
        setSession(msg.session);
      }
    });
  }, [videoId]);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const data = await sendToBackground(MSG.CREATE_SESSION, { youtubeUrl });
      if (data.error) throw new Error(data.error);
      setSession(data);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
    setLoading(false);
  };

  if (!authenticated) return null;

  if (!session) {
    return <ActivateButton onClick={handleActivate} loading={loading} />;
  }

  return null; // Checkpoint overlay and progress bar will be added in commit 4
}
