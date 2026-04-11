import React from 'react';
import { createRoot } from 'react-dom/client';
import { observeNavigation, isWatchPage, extractVideoId } from './navigation-observer.js';
import { YouTubePlayer } from './youtube-player.js';
import { onMessage } from '../shared/messaging.js';
import { MSG } from '../shared/constants.js';
import ContentApp from '../content-ui/ContentApp.jsx';

let root = null;
let mountPoint = null;
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

  // Create mount point if not exists
  if (!mountPoint) {
    mountPoint = document.createElement('div');
    mountPoint.id = 'hermex-root';
    mountPoint.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2000;';
    document.body.appendChild(mountPoint);
  }

  // Mount React app
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

// Start observing navigation
observeNavigation(initOnWatchPage);

// Also init on first load if already on a watch page
if (isWatchPage()) {
  initOnWatchPage(window.location.href);
}
