# Repository Guidelines

## Project Structure & Module Organization
Source code lives in `server.js`, an Express entrypoint that wires SQLite models and API routes. Public assets are under `public/` (`index.html`, `style.css`, `app.js`, and `lib/fingerprintjs.min.js`) and served verbatim. Local fixtures such as `fingerprints.db`, `cookies.txt`, and `test_cookies.txt` help manual QA—refresh or remove them before committing sensitive data. Deployment metadata resides in `render.yaml`, and automated checks belong beside their target modules (`test-fingerprint.js`).

## Build, Test, and Development Commands
- `npm install` installs runtime (Express, sqlite3) and dev tooling (nodemon, puppeteer).
- `npm run dev` launches the hot-reloaded server on `http://localhost:3000`.
- `npm start` runs the production server; Render uses this entrypoint.
- `npm run build` is a placeholder; keep it as a no-op unless the frontend gains a build step.

## Coding Style & Naming Conventions
Use 4-space indentation, single quotes, and trailing semicolons across Node and browser scripts. Prefer `async/await` for promise flows and keep helper functions pure when possible (see `calculateMultiFingerprintSimilarity` in `server.js`). Name files and functions descriptively in English (`collectFingerprint`, `calculateCanvasSimilarity`), even when UI copy remains Traditional Chinese. When adding client modules, mirror existing naming inside `public/` and export browser globals cautiously.

## Testing Guidelines
Functional smoke tests live in `test-fingerprint.js` using Puppeteer. Start the dev server first, then run `node test-fingerprint.js`; the script opens a visible browser and logs fingerprint results. Add new scenarios by extracting helpers instead of duplicating launch code. Document any manual test matrices in PR descriptions.

## Commit & Pull Request Guidelines
Follow the repository’s descriptive Chinese commit style: a concise headline plus a full-width colon and numbered change list when multiple adjustments ship (e.g., `修正相似度計算問題：1) …`). Reference related issues in the body. Pull requests should explain motivation, outline validation (commands run, datasets used), and include screenshots or JSON snippets when UI or API payloads change. Flag database migrations or environment variable updates prominently so deployers can react.

## Security & Configuration Tips
Use environment variables for `SESSION_SECRET`, CAPTCHA keys, and any external endpoints; never hardcode secrets. SQLite files are fine for local testing but rotate them when schema updates ship, and avoid uploading personal data. When deploying to Render, confirm `PORT` and session cookie settings remain aligned with the latest server defaults.
