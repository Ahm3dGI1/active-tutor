// YouTube SPA Navigation Observer
// Detects page changes within YouTube's single-page app

export function observeNavigation(onNavigate) {
  document.addEventListener('yt-navigate-finish', () => {
    onNavigate(window.location.href);
  });
}

export function extractVideoId(url) {
  const match = url.match(/[?&]v=([^&#]+)/);
  return match ? match[1] : null;
}

export function isWatchPage() {
  return window.location.pathname === '/watch';
}
