# Developer Manual

## 1. Project Overview

AmoebaDB Browser is a Node.js + Express based data platform with:
- A React (Vite) frontend for modern organism browsing and analytics UI.
- A legacy static admin panel for secure data editing.
- JSON-based curated data under public/Data.
- Release download, parsing, and search-index pipelines.

The server acts as the unified backend for static content, admin APIs, search APIs, download APIs, and parsed raw-file APIs.

## 2. Technology Stack

### Languages
- JavaScript (Node.js backend + browser frontend)
- HTML/CSS (legacy UI + admin pages)

### Backend
- Node.js
- Express 5
- express-rate-limit
- dotenv

### Frontend
- React 19
- React Router
- Vite
- Tailwind CSS 4
- lucide-react

### Data and Storage
- Flat JSON files (no database)
- Raw downloaded datasets in folder trees
- Pre-converted JSON chunks for faster browsing

## 3. Repository Structure

- server.js: Main backend server and API router.
- config/data-paths.js: Single source of truth for curated organism/data-type mapping.
- public/: Legacy static UI assets + admin panel + curated data folder.
- public/Data/: Curated JSON dataset files used by admin APIs.
- frontend/: React app source, Vite config, and production dist build.
- AmoebaDB_Release68/: Downloaded raw data release files.
- AmoebaDB_JSON/: Preprocessed JSON/chunked outputs and search index.
- tests/test-fixes.js: Regression checks for backend fixes.
- tools/audit_json_fields.js: Utility script for JSON field auditing.
- tools/data/build_search_index.js: Builds _search_index.json for in-memory search.
- tools/data/convert_to_json.js: Converts raw release files into chunked JSON.
- tools/data/download_release68.js: Bulk downloader for AmoebaDB release files.
- tools/debug/: One-off debugging scripts for index/path verification.
- tests/artifacts/: Saved debug and test output artifacts.
- logs/: Server stdout/stderr log snapshots.
- start_amoebadb.bat: Windows one-click startup launcher.

## 4. Runtime Architecture

### Request flow
1. Server starts on PORT (default 3000).
2. If frontend/dist exists, Express serves React build first.
3. If React build is missing, server falls back to public/index.html.
4. /admin serves legacy admin.html.
5. /api/* provides public data/search/stats/raw parsing endpoints.
6. /admin/api/* provides authenticated admin and download management APIs.

### Authentication model
- Admin login endpoint issues session tokens.
- Token must be sent in Authorization header as Bearer <token>.
- In-memory sessions expire after 24 hours.
- Token validation middleware protects all /admin/api routes.

## 5. Security and Reliability Features

Implemented in server.js:
- Credentials loaded from environment variables.
- Input validation for organism/dataType/index.
- Request sanitization helpers.
- Rate limiting:
  - General limiter for all requests.
  - Login limiter for /admin/api/login.
  - Write limiter for mutating admin routes.
- Safe JSON read/write wrappers with error handling.
- Automatic backups on write operations.
- Backup retention via MAX_BACKUPS.
- Redirect-safe download manager with max redirect guard.

## 6. Environment Variables

Create a .env file in project root:

```env
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me
MAX_BACKUPS=10
```

Recommendations:
- Use strong admin password in production/real deployment.
- Keep .env out of public sharing.

## 7. Installation and Setup (Developer)

### Prerequisites
- Node.js LTS (recommended 20+)
- npm
- Windows/macOS/Linux shell

### Install dependencies
At repository root:

```bash
npm install
```

At frontend:

```bash
cd frontend
npm install
```

## 8. Development Workflow

### Option A: Backend only

```bash
npm run dev
```

### Option B: Frontend only

```bash
npm run dev:frontend
```

### Option C: Full-stack parallel

```bash
npm run dev:full
```

### Option D: Production-like run

```bash
cd frontend
npm run build
cd ..
npm start
```

## 9. Build and Release Workflow

### Build frontend

```bash
npm run build:frontend
```

### Start production server

```bash
npm start
```

### Windows one-click launcher
- start_amoebadb.bat starts server and opens browser.
- Script uses relative folder resolution (%~dp0), so it is portable across desktops.

## 10. Data Workflow

### Curated data editing
1. Admin logs in via /admin.
2. Admin calls authenticated /admin/api/data routes.
3. Server creates backup before write.
4. JSON file is updated in public/Data.

### Raw release download
1. Admin starts download via /admin/api/download/start.
2. Server crawls release URL recursively.
3. Files are downloaded into AmoebaDB_Release68.
4. Status is tracked in-memory and exposed at /admin/api/download/status.

### Conversion and indexing
1. Convert raw files to JSON chunks (tools/data/convert_to_json.js).
2. Build global search index (tools/data/build_search_index.js).
3. Server loads _search_index.json into memory on startup.
4. /api/search serves fast paginated in-memory results.

## 11. API Surface Summary

### Public APIs
- GET /api/search
- GET /search (legacy query parser)
- GET /api/raw-data
- GET /api/organisms
- GET /api/stats

### Admin Auth APIs
- POST /admin/api/login
- POST /admin/api/logout
- GET /admin/api/session

### Admin Data APIs
- GET /admin/api/data/:organism/:dataType
- PUT /admin/api/data/:organism/:dataType
- POST /admin/api/data/:organism/:dataType/entry
- PUT /admin/api/data/:organism/:dataType/entry/:index
- DELETE /admin/api/data/:organism/:dataType/entry/:index
- GET /admin/api/backups

### Admin Download APIs
- GET /admin/api/download/status
- POST /admin/api/download/start
- POST /admin/api/download/stop

## 12. Testing and Validation

Primary regression check:

```bash
node tests/test-fixes.js
```

Recommended manual validation after code changes:
1. Login and logout cycle in /admin.
2. One CRUD action on curated data (add/edit/delete).
3. Verify backup file creation.
4. Run /api/search with a known ID term.
5. Open /api/stats and /api/organisms for health check.

## 13. Common Development Tasks

### Add a new curated data type
1. Add file mapping in config/data-paths.js under the organism.
2. Ensure JSON file exists in corresponding public/Data folder.
3. Validate via GET /admin/api/data/:organism/:dataType.
4. Update frontend dropdowns/selectors if needed.

### Change admin credentials
1. Update ADMIN_USERNAME and ADMIN_PASSWORD in .env.
2. Restart server.
3. Re-login to get a fresh token.

### Increase backup retention
1. Set MAX_BACKUPS in .env.
2. Restart server.

## 14. Known Operational Limits

- Sessions are in-memory, so server restart invalidates all active admin tokens.
- Large on-the-fly raw parsing can be slower than pre-converted JSON browsing.
- Download state is in-memory and resets when server restarts.
- No database-level transactions because storage is flat-file JSON.

## 15. Troubleshooting (Developer)

### Server starts but frontend appears old
- Rebuild frontend:

```bash
npm run build:frontend
npm start
```

### Admin returns Unauthorized
- Verify Bearer token is present.
- Token may be expired after 24h.
- Re-login to obtain a new token.

### Port already in use
- Change PORT in .env, restart server.

### Search returns index loading note
- Wait for startup load of _search_index.json.
- If file missing, run index builder script and restart server.

## 16. Suggested Future Enhancements

- Persistent session store (Redis/file/DB) instead of in-memory map.
- Automated test suite for all API routes.
- CI pipeline for lint + tests + frontend build.
- Structured logging and centralized error telemetry.
- Role-based access controls for admin operations.
