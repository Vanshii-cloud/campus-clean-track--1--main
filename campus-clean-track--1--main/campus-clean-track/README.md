# Campus Clean Track

Swachh Bharat Mission campus chapter app: report issues, track them live, earn green points, join drives.

## Run
    npm install
    npm start        # http://localhost:3000

Env vars: `PORT`, `APP_SECRET` (token signing key; set in production), `OFFICER_EMAILS` (comma list, default `officer@campus.edu`).

## Login
Development mode: enter any email to sign in (new emails create an account). `officer@campus.edu` is an officer
and can change report status. "Continue with Google" is a dev stand-in; replace `/api/auth/google`
with real Google ID-token verification before production.

## Points
+25 per report, +15 when an officer resolves it, +50 for first drive joined.
Badges: Eco Champion 400, Tree Guardian 250, Campus Cleaner 100, Sprout.

## API
GET /api/stats, /api/reports?status=, /api/leaderboard, /api/drives, /api/meta
POST /api/auth/login, /api/auth/google, /api/reports, /api/reports/:id/upvote, /api/drives/:id/join, /api/pledge
PATCH /api/reports/:id/status (officer) | POST /api/drives (officer) | DELETE /api/reports/:id

Data lives in data/db.json (auto-seeded on first run; delete it to reset).
