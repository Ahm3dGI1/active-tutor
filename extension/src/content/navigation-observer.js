// YouTube SPA Navigation Observer
// Detects page changes within YouTube's single-page app

/**
 * Observe YouTube's SPA navigation events.
 * YouTube fires 'yt-navigate-finish' on each page transition.
 */
export function observeNavigation(onNavigate) {
  // YouTube custom event for SPA navigation
  document.addEventListener('yt-navigate-finish', () => {
    onNavigate(window.location.href);
  });

  // Also handle popstate for back/forward
  window.addEventListener('popstate', () => {
    setTimeout(() => onNavigate(window.location.href), 100);
  });
}

/**
 * Extract video ID from a YouTube URL
 */
export function extractVideoId(url) {
  try {
    const u = new URL(url);
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    if (u.searchParams.has('v')) {
      return u.searchParams.get('v');
    }
    // Short URL: youtu.be/VIDEO_ID
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1);
    }
    // Embed URL: youtube.com/embed/VIDEO_ID
    const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1];
  } catch {
    // Fallback regex
    const match = url.match(/[?&]v=([^&#]+)/);
    return match ? match[1] : null;
  }
  return null;
}

/**
 * Check if the current page is a YouTube watch page
 */
export function isWatchPage(url = window.location.href) {
  try {
    const u = new URL(url);
    return u.pathname === '/watch' && u.searchParams.has('v');
  } catch {
    return false;
  }
}
