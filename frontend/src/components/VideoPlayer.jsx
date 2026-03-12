import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';

const VideoPlayer = forwardRef(function VideoPlayer({ videoId, checkpoints, onCheckpointReached, onTimeUpdate }, ref) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const triggeredCheckpoints = useRef(new Set());
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Load IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [videoId]);

  const initPlayer = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        rel: 0,
        fs: 1,
      },
      events: {
        onReady: (e) => {
          setIsReady(true);
          setDuration(e.target.getDuration());
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.PLAYING) {
            startPolling();
          } else {
            stopPolling();
          }
        },
      },
    });
  }, [videoId]);

  const startPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!playerRef.current || !playerRef.current.getCurrentTime) return;
      const time = playerRef.current.getCurrentTime();
      setCurrentTime(time);
      if (onTimeUpdate) onTimeUpdate(time);

      // Check checkpoints
      if (checkpoints) {
        for (const cp of checkpoints) {
          if (
            !triggeredCheckpoints.current.has(cp.id) &&
            cp.user_answer === null &&
            time >= cp.timestamp_seconds &&
            time <= cp.timestamp_seconds + 3
          ) {
            triggeredCheckpoints.current.add(cp.id);
            playerRef.current.pauseVideo();
            if (onCheckpointReached) onCheckpointReached(cp);
            break;
          }
        }
      }
    }, 500);
  };

  const stopPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Handle seeking past checkpoints
  useEffect(() => {
    if (checkpoints) {
      checkpoints.forEach((cp) => {
        if (cp.user_answer !== null) {
          triggeredCheckpoints.current.add(cp.id);
        }
      });
    }
  }, [checkpoints]);

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
    seekTo: (seconds) => playerRef.current?.seekTo(seconds, true),
    getCurrentTime: () => playerRef.current?.getCurrentTime() || 0,
    getDuration: () => playerRef.current?.getDuration() || 0,
    markCheckpointTriggered: (id) => triggeredCheckpoints.current.add(id),
  }));

  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <div
        ref={containerRef}
        className="absolute inset-0 bg-black rounded-lg overflow-hidden"
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
