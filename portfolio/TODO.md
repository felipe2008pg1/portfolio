# TODO.md

Actionable, current-state list. For narrative/session history, see `CHANGELOG_AI.md`. For why a decision was made, see `DECISIONS.md`. Historical dated entries below (older items) are kept only where the underlying issue is still open — resolved items were removed instead of marked `[x]` and left for clutter.

## Verify before next deploy

- [ ] **Confirm `experiences.logo_url` actually exists in the production Neon table.** The Alembic baseline was `stamp`ed (not `upgrade`d) onto an already-existing production DB, so it never ran a `CREATE`/`ALTER` — if the original manual `ALTER TABLE experiences ADD COLUMN logo_url VARCHAR(500);` was never actually applied, the column is still missing today despite Alembic believing the schema is current. Check with:

\d experiences -- psql, or:
SELECT column_name FROM information_schema.columns WHERE table_name='experiences';

  If missing, add it manually once (do **not** re-run the baseline migration against a table that already exists for everything else).
- [ ] Confirm Railway `ALLOWED_HOSTS` includes the real production backend hostname.
- [ ] Confirm the production Turnstile secret and hostname configuration in Railway/Cloudflare.
- [ ] Confirm the admin password was changed after the earlier accidental plaintext exposure.
- [ ] Bump `CONSENT_DURATION_MS` in `consent-gate.js` from 2 minutes (test value) to a real production duration (e.g. 30 days) before relying on the consent gate for real visitors.

## Open — frontend/UX (unconfirmed visually, not security-related)

- [ ] Admin table horizontal-overflow "zoom" fix (`.admin-table-wrap`) — not yet confirmed on a real mobile device.
- [ ] Public site + admin mobile spacing pass (`style.css`/`admin.css`) — not yet confirmed visually.
- [ ] Public contact form legal warning popup (`legal-popup.js`) — not yet confirmed showing correctly in both PT/EN on a live deploy.
- [ ] Login page flag/grid background and spinning BR/USA stat-card border — visual-only, not yet confirmed on a live deploy.
- [ ] Public Experience card visual design — went through 2 redesigns based on live feedback; don't assume the current CSS/DOM is final without re-confirming.
- [ ] i18n for the chat widget (public + admin) is hardcoded in PT, outside the `data-i18n`/`i18n.apply()` convention used everywhere else.

## Open — cleanup (low priority, cosmetic/safe)

- [ ] Dedupe `admin.stat.mfaOn`/`admin.stat.mfaOff` i18n keys — defined twice (identical values) in `i18n.js`. Harmless.
- [ ] Duplicate `.cursor-dot` CSS rule in `style.css` (different `z-index` values) — likely leftover from an edit; consolidate.
- [ ] Decide whether to rename `claude.md` → `CLAUDE.md` and `Architecture.md` → `ARCHITECTURE.md` for exact convention match. Cosmetic — confirm before touching (case-sensitive on Linux deploy targets).
- [ ] Confirm the nested `portfolio/portfolio/` repo structure is intentional (Railway/Vercel root-directory settings) before ever restructuring it.

## Security follow-up

Fixed and confirmed (kept as a record, not because they need re-checking):
- [x] CSRF (double-submit) on admin routes and on the visitor chat's `POST .../messages`.
- [x] Rate limit on `/api/auth/refresh`, `/api/auth/logout`, and every authenticated admin route (`RATE_LIMIT_ADMIN`).
- [x] Refresh-token reuse detection (logs + revokes the whole token family).
- [x] PII retention (`PII_RETENTION_DAYS` + `purge_pii.py`).
- [x] TOTP replay race (atomic compare-and-swap) and TOTP secret encrypted at rest (Fernet, `MFA_ENCRYPTION_KEY`).
- [x] Visitor chat token: `localStorage` → `httpOnly` cookie.
- [x] Chat cooldown + `CHAT_MAX_MESSAGES_PER_CONVERSATION` race condition — single atomic `UPDATE ... RETURNING`.
- [x] Client IP behind the Railway proxy — `core/ip.get_client_ip()` + `TRUSTED_PROXY_HOPS`, doesn't trust `X-Forwarded-For` blindly and doesn't silently collapse every visitor onto the proxy's own IP either.
- [x] Alembic adopted for schema changes (baseline + `visitor_message_count` migration).

Still open:
- [ ] If server-side URL fetching is ever introduced, harden public URL validation against RFC1918, link-local, IPv6 private ranges, and DNS rebinding.
- [ ] No rate limit on the polling-heavy `GET /api/chat/conversations/me/messages` / admin conversation-list endpoints beyond the shared per-route limiter (read-only, low risk — see `backend/SECURITY.md`).

## Future improvements

- [ ] Revisit WebSocket for chat if real-time latency ever matters (see `DECISIONS.md`).
- [ ] Populate/verify `description_en` for all existing projects.
- [ ] Refresh-token device/revocation UI — out of scope unless requirements change.