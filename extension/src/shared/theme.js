// Dark-theme detection: toggles `dark` class on a target element to match
// the user's OS preference. Call once from each React entry (popup, sidepanel,
// content). Returns a cleanup function.

export function syncDarkTheme(target = document.documentElement) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (isDark) => {
    target.classList.toggle('dark', isDark);
  };
  apply(media.matches);
  const listener = (e) => apply(e.matches);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
