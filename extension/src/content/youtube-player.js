// YouTube Player Controller
// Controls the native <video> element on YouTube pages

export class YouTubePlayer {
  constructor() {
    this.video = null;
    this.listeners = [];
  }

  /**
   * Find and bind to the YouTube video element.
   * Returns true if found, false otherwise.
   */
  attach() {
    this.video = document.querySelector('video.html5-main-video') || document.querySelector('video');
    return !!this.video;
  }

  /**
   * Wait for the video element to appear (YouTube loads it async)
   */
  waitForVideo(timeout = 10000) {
    return new Promise((resolve) => {
      if (this.attach()) return resolve(true);

      const observer = new MutationObserver(() => {
        if (this.attach()) {
          observer.disconnect();
          resolve(true);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(this.attach());
      }, timeout);
    });
  }

  play() {
    this.video?.play();
  }

  pause() {
    this.video?.pause();
  }

  getCurrentTime() {
    return this.video?.currentTime || 0;
  }

  getDuration() {
    return this.video?.duration || 0;
  }

  seekTo(seconds) {
    if (this.video) {
      this.video.currentTime = seconds;
    }
  }

  isPaused() {
    return this.video?.paused ?? true;
  }

  /**
   * Check if a YouTube ad is currently playing
   */
  isAdPlaying() {
    const player = document.querySelector('#movie_player');
    return player?.classList.contains('ad-showing') || false;
  }

  /**
   * Listen for time updates on the video element
   */
  onTimeUpdate(callback) {
    if (!this.video) return;
    const handler = () => callback(this.video.currentTime);
    this.video.addEventListener('timeupdate', handler);
    this.listeners.push({ event: 'timeupdate', handler });
  }

  /**
   * Listen for play/pause state changes
   */
  onStateChange(callback) {
    if (!this.video) return;
    const playHandler = () => callback('playing');
    const pauseHandler = () => callback('paused');
    const endedHandler = () => callback('ended');
    this.video.addEventListener('play', playHandler);
    this.video.addEventListener('pause', pauseHandler);
    this.video.addEventListener('ended', endedHandler);
    this.listeners.push(
      { event: 'play', handler: playHandler },
      { event: 'pause', handler: pauseHandler },
      { event: 'ended', handler: endedHandler }
    );
  }

  /**
   * Clean up all event listeners
   */
  destroy() {
    for (const { event, handler } of this.listeners) {
      this.video?.removeEventListener(event, handler);
    }
    this.listeners = [];
    this.video = null;
  }
}
