# AI Coding Agent Instructions

## Project overview
- This is a small stock tracking web app with a Node/Express backend proxy and static frontend pages.
- `server.js` serves static files from the project root and exposes `/api/stock-data` to proxy Groww stock chart data.
- `index.html` is the monthly tracker UI; `weekly.html` is the weekly tracker UI.

## Run and verify
- Install dependencies: `npm install`
- Start the server: `npm start`
- Open in browser: `http://localhost:3000/index.html`
- The app must be served over HTTP, not `file://`, because the frontend relies on the backend proxy and CORS handling.

## Key files
- `server.js` - Express server, static asset hosting, and `/api/stock-data` proxy endpoint.
- `package.json` - runtime dependency list and `start` script.
- `index.html`, `weekly.html` - frontend pages that use `assets/js/app.js` and `assets/js/menu.js`.
- `assets/js/app.js` - main client logic for stock selection, date range validation, proxy requests, data aggregation, table generation, and chart rendering.
- `assets/js/menu.js` - loads shared navigation from `common/menu.html`.
- `assets/css/styles.css` - shared styling for the trackers.
- `SETUP.md` - project setup guide and troubleshooting notes.

## Important conventions
- The backend proxy expects query parameters: `stock`, `startTimeInMillis`, and `endTimeInMillis`.
- `server.js` forwards requests to Groww with a browser-style `User-Agent` header.
- Keep static asset paths relative to the project root when updating HTML or JS.
- The frontend is not a compiled app; changes are reflected by reloading the served page.
- Existing pages load Chart.js plugins from CDN.

## When modifying this project
- Preserve the proxy route and static file serving behavior for frontend pages.
- Avoid requiring a separate build step; the current setup uses plain JS, CSS, and HTML.
- Use `SETUP.md` as the canonical reference for running and debugging the app.
- If adding new pages, ensure they are reachable from the served root and that navigation is updated in `common/menu.html`.
