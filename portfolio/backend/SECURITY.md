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

## Fixed — chat hardening round
- Missing CSRF protection on `POST /api/chat/conversations/me/messages`:
  the `visitor_token` cookie is `SameSite=None` in production (required,
  cross-origin), so it was forgeable cross-site. Fixed with a double-submit
  `chat_csrf_token` cookie + `X-Chat-CSRF-Token` header (`verify_chat_csrf`
  in `deps.py`).
- Cooldown check-then-write race in `add_visitor_message`: two concurrent
  requests could both pass the cooldown check before either committed.
  Fixed with a single atomic `UPDATE ... WHERE ... RETURNING` that checks
  and claims the cooldown, the `CHAT_MAX_MESSAGES_PER_CONVERSATION` cap,
  and the increment in one statement.
- `request.client.host` behind the Railway proxy was either the edge's
  internal IP (rate limiting/IP-blocking effectively global) or trivially
  spoofable via `X-Forwarded-For`, depending on config. Fixed with
  `core/ip.get_client_ip()` + `TRUSTED_PROXY_HOPS`, which trusts exactly N
  proxy hops counted from the right, ignoring anything an attacker prepends.

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
- No rate limit on the polling-heavy `GET /api/chat/conversations/me/messages`
  and admin conversation-list endpoints beyond the shared per-route limiter —
  low risk (read-only) but not defense-in-depth against a stolen session.