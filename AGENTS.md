# Repository Guidelines

## Project Structure & Module Organization
Source logic lives in `server.js`, which wires Express routes, SQLite models, and helpers such as `calculateMultiFingerprintSimilarity`. Public assets reside under `public/` (`index.html`, `style.css`, `app.js`, `lib/fingerprintjs.min.js`) and are served as-is. Puppeteer fixtures (`fingerprints.db`, `cookies.txt`, `test_cookies.txt`) support manual verification—refresh them before sharing to avoid stale or sensitive data.

## Build, Test, and Development Commands
- `npm install`: Installs Express, sqlite3, nodemon, Puppeteer, and other required packages.
- `npm run dev`: Starts the hot-reload server on `http://localhost:3000` for day-to-day changes.
- `npm start`: Boots the production server, mirroring Render’s deployment entrypoint.
- `node test-fingerprint.js`: Launches the Puppeteer smoke test; ensure the dev server is already running.

## Coding Style & Naming Conventions
Use 4-space indentation, single quotes, and trailing semicolons across Node and browser scripts. Favor `async/await` flows and keep helpers pure when feasible. Name modules and functions in clear English (e.g., `collectFingerprint`, `calculateCanvasSimilarity`). Document localized UI copy directly in the front-end assets.

## Testing Guidelines
`test-fingerprint.js` houses Puppeteer smoke coverage that logs extracted fingerprints and similarity metrics. Extract shared launch helpers instead of duplicating `puppeteer.launch`. Run the test locally before proposing changes and note manual regression matrices when automated coverage is insufficient.

## Commit & Pull Request Guidelines
Follow the repository’s Chinese commit format, e.g., `修正相似度計算問題：1) 調整閾值 2) 更新測試`. Reference related issues and mention database or configuration adjustments. Pull requests should explain motivation, list validation steps (commands run, datasets), and attach UI screenshots or JSON payloads whenever responses change.

## Security & Configuration Tips
Load secrets like `SESSION_SECRET` and CAPTCHA keys from environment variables; never commit credentials. Confirm `PORT`, session cookie settings, and other environment variables align with the defaults in `server.js`. Rotate SQLite fixtures whenever schemas evolve and scrub personal data before distribution.
