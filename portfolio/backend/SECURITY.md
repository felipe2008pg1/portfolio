# Security notes

Auth model: httpOnly JWT cookies (access + refresh) for the admin panel,
double-submit CSRF token (non-httpOnly cookie echoed in `X-CSRF-Token`) for
mutating admin routes, TOTP MFA with encrypted-at-rest secrets and
single-use backup codes, httpOnly cookie for anonymous visitor chat
sessions.

## Fixed this round
- Duplicate `/api/auth/csrf-token` route (dead code).
- Missing rate limit on `/api/auth/refresh` and `/api/auth/logout`.
- TOTP replay race: code consumption is now an atomic compare-and-swap
  against the DB (`mfa_service.verify_mfa_code`), not a stale in-memory read.
- TOTP secret stored in plaintext (`admin_users.mfa_secret`) — now encrypted
  at rest with Fernet (`MFA_ENCRYPTION_KEY`). See `encrypt_existing_totp_secrets.py`.
- Visitor chat token lived in `localStorage` (JS/XSS-readable) — now an
  httpOnly cookie scoped to `/api/chat`.

## Already correct (verified, not re-touched)
- CORS: single `CORSMiddleware`, explicit origin allowlist.
- `TrustedHostMiddleware` added last (outermost, runs first).
- Refresh token rotation: atomic `UPDATE ... RETURNING` claim; reuse is
  logged and revokes the whole token family (`refresh_service.py`).
- Backup codes: atomic `UPDATE ... WHERE used_at IS NULL`.
- CSP: no `unsafe-inline`/`unsafe-eval` on `script-src` (`vercel.json`).
- JWT: PyJWT (not python-jose).

## Running locally

cd backend
pip install -r requirements-dev.txt
pytest -v
pip-audit -r requirements.txt


## Known gaps (not in scope this round)
- No rate limit on authenticated admin CRUD routes (`/api/*/admin`,
  `/api/chat/admin/*`) as defense-in-depth against a stolen session cookie.
- No versioned migration tool (Alembic is a dependency but unused) — schema
  changes are ad-hoc `ALTER TABLE` scripts (`add_*.py`, `widen_*.py`).