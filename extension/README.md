# Hermex Extension (Work In Progress)

This Chrome extension is an experimental companion to the main Active Tutor web app.

It turns YouTube into an active-learning session: the extension pauses the video at AI-generated checkpoint quizzes, and a side panel gives you tutor chat, generated study materials, and a session recap.

Current status: development is active, and there are still known bugs and unstable flows. Use this build for testing, not as a fully stable production experience.

## Prerequisites

- Node 18+ and npm
- The Flask backend in `../backend/` running at `http://localhost:5000` - the extension talks to it for auth, transcripts, checkpoints, and AI generation.

## Install (development)

```
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" and select `extension/dist/`
4. Pin the Hermex icon to the toolbar

To rebuild after changes: `npm run build` and hit the reload icon in `chrome://extensions`.

## Usage

1. Click the Hermex icon to open the popup and sign in (or create an account).
2. Navigate to a YouTube video.
3. Click **Start Hermex Session** under the video title.
4. Open the side panel to chat with the tutor, generate study materials, or view the recap.
5. The video will auto-pause at each checkpoint. Answer, read the explanation, then resume.

## Architecture

- **`src/popup/`** — the browser-action popup. Login / register, active session card, recent sessions, quick actions.
- **`src/content/`** — content script injected into `youtube.com/*`. Watches for SPA navigation, locates the video element, and mounts the content-UI React tree inside a Shadow DOM root to isolate styles.
- **`src/content-ui/`** — React components that overlay the YouTube player: the activate button, session banner, progress bar with checkpoint markers, and the checkpoint quiz modal.
- **`src/sidepanel/`** — Chrome side panel UI with four tabs: Chat, Materials, Recap, Settings.
- **`src/background/service-worker.js`** — MV3 background service worker; every extension context routes messages through it. It forwards to the Flask backend via `src/shared/api.js` and broadcasts updates back.
- **`src/shared/`** — shared utilities: `api.js` (fetch wrappers), `auth.js` (token storage), `messaging.js` (Chrome IPC helpers), `constants.js` (message types + storage keys), `theme.js` (dark-mode sync), `ui/` (ErrorBoundary, ToastHost).

## Configuration

If your backend runs somewhere other than `http://localhost:5000/api`, open the side panel, go to **Settings → Config**, and set the API URL. The override is stored in `chrome.storage.sync` and used for every API call.

## Troubleshooting

- **"Not authenticated" in the side panel** — sign in from the popup first.
- **No Activate Button on a YouTube video** — make sure the URL is a `watch?v=…` page (not Shorts or the homepage). Reload the tab after installing.
- **Checkpoint quiz styles look off** — the overlay uses a Shadow DOM root and inline styles; if YouTube recently changed their DOM selectors, the portal targets in `src/content-ui/components/` may need to be updated.
- **Dark theme didn't kick in** — the extension follows `prefers-color-scheme`. Toggle your OS theme.
