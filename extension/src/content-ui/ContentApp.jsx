import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { sendToBackground } from '../shared/messaging.js';
import { MSG, STORAGE_KEYS } from '../shared/constants.js';
import { onMessage } from '../shared/messaging.js';
import ActivateButton from './components/ActivateButton.jsx';
import CheckpointOverlay from './components/CheckpointOverlay.jsx';
import ProgressBarOverlay from './components/ProgressBarOverlay.jsx';
import SessionBanner from './components/SessionBanner.jsx';

export default function ContentApp({ videoId, player }) {
  const [session, setSession] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const triggeredRef = useRef(new Set());
  const overlayContainerRef = useRef(null);

  // Check auth and look for existing session
  useEffect(() => {
    (async () => {
      const authRes = await sendToBackground(MSG.AUTH_STATUS);
      setAuthenticated(authRes.authenticated);

      const stored = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_SESSION);
      const activeSession = stored[STORAGE_KEYS.ACTIVE_SESSION];
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
      if (msg.session?.video_id === videoId) {
        setSession(msg.session);
        setCheckpoints(msg.session.checkpoints || []);
      }
    });
  }, [videoId]);

  // Set up video time tracking and checkpoint detection
  useEffect(() => {
    if (!session || !checkpoints.length) return;

    setDuration(player.getDuration());

    player.onTimeUpdate((time) => {
      setCurrentTime(time);

      // Skip during ads
      if (player.isAdPlaying()) return;

      // Check checkpoints
      for (const cp of checkpoints) {
        if (
          !triggeredRef.current.has(cp.id) &&
          cp.user_answer === null &&
          time >= cp.timestamp_seconds &&
          time <= cp.timestamp_seconds + 3
        ) {
          triggeredRef.current.add(cp.id);
          player.pause();
          setActiveCheckpoint(cp);
          break;
        }
      }
    });

    player.onStateChange((state) => {
      if (state === 'playing') {
        setDuration(player.getDuration());
      }
    });

    return () => player.destroy();
  }, [session, checkpoints]);

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
      const data = await sendToBackground(MSG.CREATE_SESSION, { youtubeUrl });
      if (data.error) throw new Error(data.error);
      setSession(data);
      setCheckpoints(data.checkpoints || []);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
    setLoading(false);
  };

  const handleCheckpointResult = (checkpointId, result) => {
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
