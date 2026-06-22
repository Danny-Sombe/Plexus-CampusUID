// ─────────────────────────────────────────────────────────────────────────
//  Backend API configuration (shared by every page)
// ─────────────────────────────────────────────────────────────────────────
//
//  The frontend (this site) and the backend (Express + PostgreSQL) run in two
//  different places:
//
//    • Local dev          → backend on your machine at http://<host>:5000
//    • GitHub Pages, etc.  → backend deployed separately on Render (HTTPS)
//
//  GitHub Pages can ONLY serve these static files; it cannot run server.js.
//  So when the site is opened from a public host (danny-sombe.github.io) the
//  pages must call the deployed Render backend instead of ":5000" on the
//  current host (which doesn't exist there → "Failed to fetch").
//
//  👉 After you deploy on Render, paste your service URL below. It looks like
//     https://<your-service-name>.onrender.com  (copy it from the Render
//     dashboard → your web service). It MUST be https:// — the site is served
//     over https, and browsers block http calls from an https page.
//
//  You can also override the backend at runtime without editing code:
//     localStorage.setItem('serverHost', 'https://your-backend.onrender.com')
//
window.PRODUCTION_BACKEND_URL = "https://plexus-campusuid.onrender.com";

// Hosts that mean "running locally" — localhost, loopback, file://, *.local,
// and private LAN ranges (so phone/LAN testing keeps hitting your machine,
// not the Render backend).
function isLocalHost(host) {
    return (
        host === "" ||
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".local") ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
}

// Returns the base URL the frontend should use for all API calls.
function getApiBase() {
    const API_PORT = 5000;

    // 1. Explicit manual override always wins.
    const override = localStorage.getItem("serverHost");
    if (override) {
        return override.match(/^https?:\/\//) ? override : `http://${override}`;
    }

    const host = window.location.hostname;
    const isLocal = window.location.protocol === "file:" || isLocalHost(host);

    // 2. Public host (GitHub Pages, etc.) → the deployed backend on Render.
    if (!isLocal) {
        return window.PRODUCTION_BACKEND_URL;
    }

    // 3. Local development → backend on the same host, port 5000.
    if (window.location.protocol === "file:") {
        return `http://localhost:${API_PORT}`;
    }
    return `${window.location.protocol}//${host}:${API_PORT}`;
}
