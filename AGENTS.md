# Repository Guidelines

## Project Structure & Module Organization
Source logic resides in `server.js`, which registers Express routes, SQLite models, and helper utilities such as `calculateMultiFingerprintSimilarity`. Public-facing assets under `public/` (including `index.html`, `style.css`, `app.js`, and `lib/fingerprintjs.min.js`) are served as-is, so keep compiled bundles and third-party scripts inside this tree. Fixture artifacts like `fingerprints.db`, `cookies.txt`, and `test_cookies.txt` support manual QA; update or purge them before commits to avoid leaking sensitive data.

## Build, Test, and Development Commands
- `npm install`: Install Express, sqlite3, nodemon, Puppeteer, and other runtime tooling.
- `npm run dev`: Launch the hot-reload server at `http://localhost:3000` for day-to-day development.
- `npm start`: Boot the production server; Render relies on this command in deployment.
- `node test-fingerprint.js`: Execute the Puppeteer smoke test (start the dev server first).

## Coding Style & Naming Conventions
Adopt 4-space indentation, single quotes, and trailing semicolons across Node and browser code. Prefer `async/await` for asynchronous flows and keep helpers pure when feasible. Name modules and functions descriptively in English (e.g., `collectFingerprint`, `calculateCanvasSimilarity`), even when UI copy remains Traditional Chinese.

## Testing Guidelines
`test-fingerprint.js` houses Puppeteer smoke tests that read fingerprints and log similarity metrics. Extend coverage by extracting reusable launch helpers rather than duplicating `puppeteer.launch` calls. Document manual regression matrices in PR descriptions when scenarios exceed automated coverage.

## Commit & Pull Request Guidelines
Follow the repository’s Chinese commit format: a concise headline plus optional numbered list separated by a full-width colon (e.g., `修正相似度計算問題：1) 調整閾值 2) 更新測試`). Reference related issues and note any database or configuration updates. Pull requests should explain motivation, list validation steps (commands run, datasets), and include UI screenshots or JSON payloads when responses change.

## Security & Configuration Tips
Load secrets such as `SESSION_SECRET` and CAPTCHA keys from environment variables; never commit credentials. Rotate SQLite fixtures when schemas change and scrub personal data before sharing. For Render deployments, confirm `PORT`, session cookie settings, and other environment variables align with `server.js` defaults.
