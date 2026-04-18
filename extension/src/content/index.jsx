import React from 'react';
import { createRoot } from 'react-dom/client';
import { observeNavigation, isWatchPage, extractVideoId } from './navigation-observer.js';
import { YouTubePlayer } from './youtube-player.js';
import { onMessage } from '../shared/messaging.js';
import { MSG } from '../shared/constants.js';
import { syncDarkTheme } from '../shared/theme.js';
import ContentApp from '../content-ui/ContentApp.jsx';
import cssText from './styles.css?inline';

let root = null;
let mountPoint = null;
let shadowHost = null;
const player = new YouTubePlayer();

/**
 * Initialize or re-initialize the content UI on watch pages
 */
async function initOnWatchPage(url) {
  if (!isWatchPage(url)) {
    cleanup();
    return;
  }

  const videoId = extractVideoId(url);
  if (!videoId) return;

  // Wait for video element
  const found = await player.waitForVideo();
  if (!found) {
    console.warn('Hermex: Could not find YouTube video element');
    return;
  }

  // Create mount point with shadow DOM to isolate our styles from YouTube's.
  // Inline-styled portaled children (ActivateButton, SessionBanner,
  // ProgressBarOverlay, CheckpointOverlay) still render into YouTube's DOM, but
  // the React tree itself lives inside a shadow root so Tailwind-styled content
  // added later won't collide with YouTube's CSS.
  if (!shadowHost) {
    shadowHost = document.createElement('div');
    shadowHost.id = 'hermex-root';
    shadowHost.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2000;';
    document.body.appendChild(shadowHost);

    const shadow = shadowHost.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = cssText;
    shadow.appendChild(style);

    mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    syncDarkTheme(mountPoint);
  }

  if (!root) {
    root = createRoot(mountPoint);
  }

  root.render(<ContentApp videoId={videoId} player={player} />);
}

/**
 * Clean up when navigating away from watch page
 */
function cleanup() {
  if (root) {
    root.unmount();
    root = null;
  }
  if (shadowHost) {
    shadowHost.remove();
    shadowHost = null;
    mountPoint = null;
  }
  player.destroy();
}

// Listen for video info requests from side panel
onMessage(MSG.GET_VIDEO_INFO, () => {
  return {
    videoId: extractVideoId(window.location.href),
    url: window.location.href,
    isWatchPage: isWatchPage(),
  };
});

onMessage(MSG.GET_CURRENT_TIME, () => {
  return { currentTime: Math.floor(player.getCurrentTime()) };
});

onMessage(MSG.PAUSE_VIDEO, () => {
  player.pause();
  return { paused: true };
});

// Start observing navigation
observeNavigation(initOnWatchPage);

// Also init on first load if already on a watch page
if (isWatchPage()) {
  initOnWatchPage(window.location.href);
}
