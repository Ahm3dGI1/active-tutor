// YouTube Player Controller
// Controls the native <video> element on YouTube pages

export class YouTubePlayer {
  constructor() {
    this.video = null;
  }

  getVideoElement() {
    this.video = document.querySelector('video.html5-main-video') || document.querySelector('video');
    return this.video;
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

  isAdPlaying() {
    const player = document.querySelector('#movie_player');
    return player?.classList.contains('ad-showing') || false;
  }
}
