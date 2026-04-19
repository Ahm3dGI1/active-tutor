import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { sendToBackground } from '../shared/messaging.js';
import { MSG, STORAGE_KEYS } from '../shared/constants.js';
import { onMessage } from '../shared/messaging.js';
import ActivateButton from './components/ActivateButton.jsx';
import CheckpointOverlay from './components/CheckpointOverlay.jsx';
import ProgressBarOverlay from './components/ProgressBarOverlay.jsx';
import SessionBanner from './components/SessionBanner.jsx';

function normalizeSessionPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.session && typeof payload.session === 'object') return payload.session;
  return payload;
}

export default function ContentApp({ videoId, player }) {
  const [session, setSession] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const triggeredRef = useRef(new Set());
  const lastTimeRef = useRef(0);
  const overlayContainerRef = useRef(null);
  const activeCheckpointRef = useRef(null);
  const checkpointsRef = useRef([]);

  useEffect(() => {
    activeCheckpointRef.current = activeCheckpoint;
  }, [activeCheckpoint]);

  useEffect(() => {
    checkpointsRef.current = checkpoints;
  }, [checkpoints]);

  // Check auth and look for existing session
  useEffect(() => {
    (async () => {
      const authRes = await sendToBackground(MSG.AUTH_STATUS);
      setAuthenticated(authRes.authenticated);

      const stored = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_SESSION);
      const activeSession = normalizeSessionPayload(stored[STORAGE_KEYS.ACTIVE_SESSION]);
      if (activeSession?.video_id === videoId) {
        setSession(activeSession);
        setCheckpoints(activeSession.checkpoints || []);
        // Mark already-answered checkpoints as triggered
        activeSession.checkpoints?.forEach((cp) => {
          if (cp.user_answer !== null) triggeredRef.current.add(cp.id);
        });
      }
    })();
  }, [videoId]);

  // Listen for session creation broadcasts
  useEffect(() => {
    return onMessage(MSG.SESSION_CREATED, (msg) => {
      const normalizedSession = normalizeSessionPayload(msg.session);
      if (normalizedSession?.video_id === videoId) {
        setSession(normalizedSession);
        setCheckpoints(normalizedSession.checkpoints || []);
      }
    });
  }, [videoId]);

  // Reset trigger tracking when switching sessions
  useEffect(() => {
    if (!session?.id) {
      triggeredRef.current = new Set();
      setActiveCheckpoint(null);
      return;
    }

    const answeredIds = new Set(
      (session.checkpoints || [])
        .filter((cp) => cp.user_answer !== null)
        .map((cp) => cp.id)
    );
    triggeredRef.current = answeredIds;
    setActiveCheckpoint(null);
  }, [session?.id]);

  // Set up video time tracking and checkpoint detection
  useEffect(() => {
    if (!session || !checkpoints.length) return;

    player.attach();

    setDuration(player.getDuration());
    lastTimeRef.current = player.getCurrentTime();

    player.onTimeUpdate((time) => {
      setCurrentTime(time);

      if (activeCheckpointRef.current) {
        lastTimeRef.current = time;
        return;
      }

      // Skip during ads
      if (player.isAdPlaying()) {
        lastTimeRef.current = time;
        return;
      }

      // Trigger any checkpoint whose timestamp is within a small window of
      // the current playhead. Using a window (not just a strict crossing)
      // means manual seeks that land exactly on a checkpoint still fire.
      const TRIGGER_WINDOW = 3;
      const nextCheckpoint = checkpointsRef.current.find(
        (cp) =>
          !triggeredRef.current.has(cp.id)
          && cp.user_answer === null
          && time >= cp.timestamp_seconds
          && time <= cp.timestamp_seconds + TRIGGER_WINDOW
      );

      if (nextCheckpoint) {
        triggeredRef.current.add(nextCheckpoint.id);
        player.pause();
        setActiveCheckpoint(nextCheckpoint);
      }

      lastTimeRef.current = time;
    });

    player.onStateChange((state) => {
      if (state === 'playing') {
        setDuration(player.getDuration());
      }
    });

    return () => player.clearListeners();
  }, [session?.id, checkpoints.length]);

  // Handle explicit "show this checkpoint" requests from the side panel
  useEffect(() => {
    return onMessage(MSG.SHOW_CHECKPOINT, (msg) => {
      const cp = checkpointsRef.current.find((c) => c.id === msg.checkpointId);
      if (!cp) return { success: false };
      triggeredRef.current.add(cp.id);
      player.attach();
      player.seekTo(Math.max(0, cp.timestamp_seconds - 0.15));
      player.pause();
      setActiveCheckpoint(cp);
      return { success: true };
    });
  }, [player]);

  // Create overlay container on the video player
  useEffect(() => {
    if (!session) return;

    const moviePlayer = document.querySelector('#movie_player') || document.querySelector('ytd-player');
    if (moviePlayer && !overlayContainerRef.current) {
      const container = document.createElement('div');
      container.id = 'hermex-overlay-container';
      container.style.cssText = 'position: absolute; inset: 0; pointer-events: none; z-index: 2000;';
      moviePlayer.style.position = 'relative';
      moviePlayer.appendChild(container);
      overlayContainerRef.current = container;
    }

    return () => {
      overlayContainerRef.current?.remove();
      overlayContainerRef.current = null;
    };
  }, [session]);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await sendToBackground(MSG.CREATE_SESSION, { youtubeUrl });
      if (response.error) throw new Error(response.error);
      const data = normalizeSessionPayload(response);
      setSession(data);
      setCheckpoints(data?.checkpoints || []);
      // Mark the user as onboarded after their first successful session.
      await chrome.storage.local.set({ [STORAGE_KEYS.ONBOARDED]: true });
    } catch (err) {
      console.error('Failed to create session:', err);
    }
    setLoading(false);
  };

  const handleCheckpointResult = (checkpointId, result) => {
    triggeredRef.current.add(checkpointId);
    setCheckpoints((prev) =>
      prev.map((cp) =>
        cp.id === checkpointId
          ? { ...cp, user_answer: result.user_answer || result.answer, correct_option: result.correct_option }
          : cp
      )
    );
  };

  const handleResume = () => {
    setActiveCheckpoint(null);
    player.play();
  };

  const handleCheckpointClick = (checkpoint) => {
    if (!checkpoint) return;
    player.attach();
    player.seekTo(Math.max(0, checkpoint.timestamp_seconds - 0.15));
    setCurrentTime(checkpoint.timestamp_seconds);

    if (checkpoint.user_answer === null) {
      triggeredRef.current.add(checkpoint.id);
      player.pause();
      setActiveCheckpoint(checkpoint);
    }
  };

  if (!authenticated) return null;

  if (!session) {
    return <ActivateButton onClick={handleActivate} loading={loading} />;
  }

  return (
    <>
      <SessionBanner session={session} checkpoints={checkpoints} />
      <ProgressBarOverlay
        currentTime={currentTime}
        duration={duration}
        checkpoints={checkpoints}
        onCheckpointClick={handleCheckpointClick}
      />
      {activeCheckpoint && overlayContainerRef.current && (
        <CheckpointOverlayPortal container={overlayContainerRef.current}>
          <CheckpointOverlay
            checkpoint={activeCheckpoint}
            sessionId={session.id}
            onResult={handleCheckpointResult}
            onResume={handleResume}
          />
        </CheckpointOverlayPortal>
      )}
    </>
  );
}

// Portal to render checkpoint overlay inside the video player container
function CheckpointOverlayPortal({ container, children }) {
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: absolute; inset: 0; z-index: 2001;';
    container.appendChild(wrapper);
    wrapperRef.current = wrapper;
    setMounted(true);

    return () => {
      wrapper.remove();
    };
  }, [container]);

  if (!mounted || !wrapperRef.current) return null;

  return createPortal(children, wrapperRef.current);
}
