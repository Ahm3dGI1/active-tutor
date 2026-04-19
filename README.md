# Active Tutor (Hermex)

Active Tutor is an AI-assisted learning platform for video-based study sessions.

## Project Status

- The **Web App** is the main product and the most stable experience today.
- The **Google Chrome extension** is a work in progress.
- The extension currently has known bugs and should be treated as experimental during development.

## What the Product Does

Active Tutor helps learners stay engaged while watching educational videos by adding:

- AI-powered tutor chat during a session
- Checkpoint questions to test understanding
- Session recap and study materials generation
- Progress tracking across study sessions

## Repository Structure

- `frontend/` - Main web application (React + Vite + Tailwind)
- `backend/` - API service (Flask + Python)
- `extension/` - Google Chrome extension (React + Vite, MV3)

## Recommended Development Flow

Use this order for local development:

1. Start the backend API.
2. Start or build the frontend web app.
3. Build and load the extension only when testing extension-specific behavior.

## Local Setup

### 1) Backend

From `backend/`:

```bash
pip install -r requirements.txt
python app.py
```

Default backend URL is usually `http://localhost:5000`.

### 2) Frontend (Main Product)

From `frontend/`:

```bash
npm install
npm run dev
```

For production build:

```bash
npm run build
```

### 3) Extension (WIP)

From `extension/`:

```bash
npm install
npm run build
```

Then load `extension/dist/` in `chrome://extensions` using **Load unpacked**.

## Deployment Notes

- The current deploy target should be the web app in `frontend/`.
- Root `vercel.json` is configured to build from `frontend/` and output `frontend/dist`.

## Known Limitations

- Extension behavior on YouTube can break when YouTube updates its DOM.
- Session synchronization between popup, content UI, and side panel can still be inconsistent in some flows.
- Error handling and recovery in extension contexts are still being improved.

## Documentation

- Extension details and architecture: `extension/README.md`
