# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Plexus CampusUID is a student-ID / campus portal: a Node.js + Express backend (`backend/server.js`) serving a set of static HTML/CSS/JS pages that live at the **repo root**. There is **no build step, no bundler, no test suite, and no framework** on the frontend — pages are plain HTML with inline or sibling `<page>.js` files, served via `express.static(path.join(__dirname, ".."))`. The pages sit at the root (rather than in a subfolder) so GitHub Pages can serve them directly from the repo root.

The project is split into folders: `backend/` (Express server, DB connection, schema), the frontend files (all HTML/CSS/JS and `images/`) at the repo root, plus `qr_scanner.py` (a standalone Python QR-scanner companion tool) and `package.json`/`node_modules` at the repo root.

## Commands

```bash
npm install          # install dependencies (run from repo root)
npm start            # run the server (node backend/server.js) on port 5000
node backend/server.js   # same thing
```

- `npm test` is a placeholder that exits 1 — there are no tests.
- Port is `5000` by default; override with `PORT`. The server binds `0.0.0.0` and logs LAN IPs on startup to ease mobile/QR testing.
- No linter is configured.

## Required environment / external services

- **PostgreSQL** must be running locally. Connection settings (host, user, password, database `campusuid`, port 5432) are **hardcoded in `backend/db.js`** as a `pg` connection pool — change them there, not via env vars. Create the schema with `backend/schema.sql` (tables `users`, `students`, `financial_records`).
- **Email (forgot-password)** uses nodemailer over SMTP, configured purely via env vars: `EMAIL_USER`, `EMAIL_PASS`, optional `EMAIL_HOST` (default `smtp.gmail.com`), `EMAIL_PORT` (default 587). If `EMAIL_USER`/`EMAIL_PASS` are unset the server still boots but `/forgot-password` returns a 500. Gmail requires an App Password.

## Architecture

**Backend** (`backend/server.js`) is a single flat file of Express routes using the **callback style** of the `pg` pool (`db.query(sql, params, cb)`) with nested callbacks — not promises/async for DB calls. The callback receives `(err, result)`; **rows are in `result.rows`** (not the bare array MySQL returned). All SQL is parameterized with **`$1, $2, …` placeholders** (Postgres style, not `?`). Routes: `/signup`, `/login`, `/forgot-password`, `/profile`, `/financial-records`, `/student-info`, `/students`, `/generateQR`, plus `/` and `/test` health checks.

**Data model is split across two tables that both carry a student ID.** Signup writes the same record three places in sequence (nested callbacks): `users` (auth: fullname, studentid, email, bcrypt password), `students` (first_name/last_name split from fullname, email), and a zero-amount row in `financial_records`. `users.studentid` and `students.student_id` are independent `VARCHAR` columns kept in sync only by application code — there is no FK. When touching signup or student lookups, keep all three writes consistent.

**Auth is client-side only.** Login verifies the bcrypt password and returns `{success:true}`; there are **no sessions, cookies, or tokens**. The frontend stores `userEmail` in `localStorage` and treats its presence as "logged in" (see `dashboard.js`). Consequently `/profile`, `/financial-records`, `/student-info`, and `/students` are **unauthenticated** — any caller with an email or student ID gets the data. Keep this in mind before assuming a request is trusted.

**QR flow** is the core feature. `code.html` (linked from the dashboard) takes a student ID, builds a URL like `http://<host>/student.html?studentid=<id>`, and POSTs it to `/generateQR` (the `qrcode` lib renders a PNG data URL). Scanning the QR opens `student.html`, which reads `studentid` from the query string and calls `/student-info`. Because phones can't reach `localhost`, `code.html` requires the user to enter a phone-reachable host (LAN IP or ngrok URL); a bare student ID with a localhost host is encoded as plain text instead of a URL.

**API base resolution** is a repeated idiom across every frontend JS file (`script.js`, `signup.js`, `pass.js`, `dashboard.js`, `student.html`, `code.html`). The pattern: use `localStorage.getItem('serverHost')` if set, else `http://localhost:5000` when the page is opened via `file://`, else the current page's protocol+hostname **with port `5000` (the backend port) — NOT the page's own port**. This last part matters: the backend always runs on `5000`, so a page served from a different port (e.g. VS Code Live Server on `5500`) still targets `:5000` for the API instead of POSTing to the static server (which would 405). Cross-origin is fine because `server.js` enables `cors()`. When adding a new page that calls the backend, copy this block so it works whether served by Express, by Live Server, or opened as a file.

## Page map

- `index.html` → `script.js` — login
- `signup.html` → `signup.js` — registration
- `pass.html` → `pass.js` — forgot password
- `dashboard.html` → `dashboard.js` — profile + financial records (gated on `localStorage.userEmail`)
- `code.html` — QR generator (self-contained inline script)
- `student.html` — QR scan landing page (self-contained inline script)
- `style.css` — shared styles for login/signup/dashboard

## Notes

- `jimp` and `jsqr` are listed as dependencies but are not referenced in the current server code.
- `my.ini` is a leftover MySQL server config file — no longer used now that the app runs on PostgreSQL.
