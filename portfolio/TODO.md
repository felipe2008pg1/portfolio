# TODO.md

## Priority 0 — Delivery verification (still the top risk)

- [ ] **New, 2026-08-31**: Apply the chat triplicate-message fix to the real working tree. `painel-fg-2026x/assets/js/dashboard.js` had a duplicated final `DOMContentLoaded`/`logoutBtn` block causing two concurrent `pollActiveChatConversation` intervals, which made the admin's own sent messages render 3× in the thread view (visitor side was unaffected — single poll timer there). Fix delivered as "delete the duplicate block" instruction, not yet confirmed applied/tested by Felipe. See claude.md and DECISIONS.md for full root-cause detail.
- [ ] **New, 2026-08-31**: Delete `frontend/assets/js/dashboard.js` (orphan, unreferenced). Re-confirmed dead this session (previously flagged in Priority-unlabeled "Pending maintenance" below, and DECISIONS.md records it as already deleted once — but it's still in the repo). Do not confuse with the real `frontend/painel-fg-2026x/assets/js/dashboard.js`.
- [ ] **New, 2026-08-31**: Repo history is now a single squashed commit (`0060043`, "Bugs fixed"). CHANGELOG_AI.md's phase-by-phase narrative can no longer be verified against `git log`/`git blame` — treat it as a log of intent only, re-verify current state against the actual files on every session start, same as the standing Priority 0 rule below.

- [ ] **Confirm every file delivered across the 2026-08-26 and 2026-08-27 sessions is actually applied in Felipe's real working tree and deployed.** A fresh clone on 2026-08-26 showed the repo `HEAD` had NONE of the previously "confirmed" Experience code committed — only docs had changed. Do not trust prior changelog "confirmed working" claims without Felipe re-pasting the file or reporting the symptom fixed in this exact conversation. Files touched across both sessions (verify each is current):
  - `frontend/vercel.json` (CSP fix — **requires a Vercel redeploy**)
  - `frontend/assets/js/i18n.js`
  - `frontend/assets/js/api.js`
  - `frontend/assets/js/render-experience.js`
  - `frontend/assets/css/style.css`
  - `frontend/index.html`, `frontend/404.html`
  - `frontend/painel-fg-2026x/dashboard.html`
  - `frontend/painel-fg-2026x/assets/js/dashboard.js`
  - `frontend/painel-fg-2026x/assets/js/admin-api.js`
  - `backend/app/models/experience.py`
  - `backend/app/schemas/experience.py`
  - `backend/app/core/turnstile.py` (diagnostic log fix)
  - `.github/dependabot.yml`
  - `frontend/painel-fg-2026x/assets/js/dashboard.js` (`resetDirty` fix — 2026-08-28)
  - `frontend/painel-fg-2026x/dashboard.html` (`.admin-table-wrap` — 2026-08-28)
  - `frontend/assets/css/admin.css` (mobile spacing — 2026-08-28)
  - `frontend/assets/css/style.css` (mobile spacing — 2026-08-28)
- [ ] **Backend blocker (unresolved, carried over)**: `logo_url` column does not exist in the production Neon `experiences` table yet. Must be added manually: `ALTER TABLE experiences ADD COLUMN logo_url VARCHAR(500);`. No migration system in active use.

- [ ] **New, 2026-08-31 (later)**: Apply chat IP-blocking feature (backend model/service/routes + admin UI) — delivered as instructions, not yet on Felipe's real tree.
- [ ] **New, 2026-08-31 (later)**: Apply chat `chatReopenBtn` visibility fix (`status === "closed"` → `status !== "open"`) — blocked conversations currently have no way back to "open" via the UI.
- [ ] **New, 2026-08-31 (later)**: Apply consent gate (`consent-gate.js`, `termos.html`, `index.html`/CSS/i18n changes) — delivered, not yet on Felipe's real tree.
- [ ] **Before going live**: bump `CONSENT_DURATION_MS` in `consent-gate.js` from 2 minutes (test value) to a real production duration (e.g. 30 days).

## Priority 1 — Experience feature: functionally complete, visually still moving

- [x] Public Experience rendering (`render-experience.js`) — implemented and confirmed working by the user (index.html no longer stuck on "Carregando").
- [x] Admin Experience CRUD (list/create/edit/delete, `logo_url` field, published flag, display_order) — implemented in `dashboard.js`/`admin-api.js`.
- [x] Admin nav link, section title, table headers, buttons, empty/error/loading states — all converted from hardcoded PT to `data-i18n`/`i18n.t()`. Root cause was: the Experience section markup was added to `dashboard.html` in an earlier session without `data-i18n` attributes, unlike Projects/Skills.
- [x] Admin dynamic table re-render on language switch (PT/EN toggle without F5) — was missing for admin tables and the MFA stat card; fixed by adding `window.renderProjectsTable`/`renderExperiencesTable`/`renderMfaStat` hooks to `i18n.apply()`. **This class of bug (dynamic JS-rendered text not re-rendering on language toggle) has now been found and fixed 3 times this session — see the "Reactivity convention" note in CLAUDE.md before adding any new dynamic admin/public text.**
- [ ] **Public Experience card visual design is not final.** It went through 2 full redesigns this session based on live user feedback (current state documented in CLAUDE.md under "Current public Experience card layout"). Do not assume the current CSS/DOM structure is the last word — re-confirm with Felipe if touching this component again.
- [ ] `logo_url` backend field exists but cannot be exercised end-to-end until the Priority 0 DB column blocker above is resolved.

## Priority 2 — Mystery/unresolved

- [ ] Felipe reported the admin `dashboard.js` (Experience CRUD version) "bugged" his local Live Server preview once, worked around it by not applying that file, then later reported it "desbugou" on its own — console error never shared, root cause never identified. If a similar "breaks only in Live Server" report recurs, get the actual console output first — check local backend running on `127.0.0.1:8000` or a stale cached script before guessing.

## Priority 1b — Security panel (MFA), delivered and confirmed 2026-08-27

- [x] `dashboard.js`/`admin-api.js`/`dashboard.html`/`i18n.js` changes wiring up MFA enable/disable/status in the Security card, including the QR `src` double-prefix fix, applied and tested end-to-end by Felipe (enable → scan QR → confirm code → backup codes shown → disable with code). Confirmed working.

## Priority 1c — resetDirty fix + mobile spacing pass (2026-08-28, unconfirmed)

- [x] `resetDirty` ReferenceError in admin dashboard.js — fixed, confirmed applied and tested by Felipe (full CRUD flow working again).
- [ ] Admin table horizontal-overflow "zoom" fix (`.admin-table-wrap`) — delivered, not yet confirmed on a real mobile device.
- [ ] Public site + admin mobile spacing pass (`style.css`/`admin.css`) — delivered, not yet confirmed visually by Felipe.


## Priority 1d — Decorative pass + admin UX pass (2026-08-28, unconfirmed)

- [ ] Public contact form legal warning popup (`legal-popup.js`) — delivered, not yet confirmed showing correctly in both PT/EN on a live deploy.
- [ ] Admin toast, table skeletons, MFA topbar badge, in-app delete-confirm modal, "unsaved changes" dirty-dot indicator — all delivered together with the `resetDirty` fix, not individually re-confirmed since (only the CRUD flow itself was retested).
- [ ] Login page flag/grid background and spinning BR/USA stat-card border — visual-only, not yet confirmed on a live deploy.
- [ ] Dedupe check: confirm `admin.stat.mfaOn`/`mfaOff` duplicate i18n keys (flagged earlier in Pending maintenance) weren't reintroduced while adding the new `admin.confirm.*`/`admin.dashboard.confirmDelete*` keys this phase.

## Pending verification — Session 2026-08-31 (3) deliveries

- [ ] Confirm `.admin-table-wrap { overflow-x: auto }` and the `@media (max-width: 640px)` block actually landed in `admin.css` — this exact fix was "delivered" once before (Phase 15) and never applied; verify with `grep -c "admin-table-wrap" admin.css` before trusting CHANGELOG_AI.md Phase 18.
- [ ] Confirm 404/termos visual changes (darker backgrounds, pulsing `.notfound-code`, `.chat-antifraud-badge`) are live after a Vercel redeploy.
- [ ] Confirm `chat-widget.js`'s `warningText.innerHTML` change didn't break on any browser/locale edge case (static string, low risk, but not yet visually confirmed).
- [ ] If more skill categories are added in the admin panel, remember to add the matching key to `CATEGORY_TRANSLATIONS_EN` in `i18n.js` — there is no fallback translation, only the raw PT string.

## Pending maintenance

- [ ] Major dependency updates (`fastapi`, `starlette`, `uvicorn`, `alembic`, `python-jose`) remain postponed due to breaking-change risk.
- [ ] Consider migrating from `python-jose` to `PyJWT`.
- [ ] Populate/verify `description_en` for all existing projects.
- [ ] Keep refresh-token device/revocation UI out of scope unless requirements change.
- [ ] Remove or properly use empty `backend/app/db/init_db.py`.
- [ ] Consolidate duplicate/placeholder README files.
- [ ] Consider proper versioned migrations instead of ad-hoc scripts + `create_all()` — the `logo_url` blocker above is a direct consequence of not having this.
- [ ] Dedupe `admin.stat.mfaOn`/`admin.stat.mfaOff` i18n keys — defined twice (identical values) in both the PT and EN blocks of `i18n.js`. Harmless, cosmetic cleanup only.
- [ ] The orphan file `frontend/assets/js/dashboard.js` (distinct from the correct `frontend/painel-fg-2026x/assets/js/dashboard.js`) is not referenced by any HTML page and appears to be leftover/dead code from an earlier session. Confirm it's unused and delete it.

## Security follow-up

- [x] GitGuard scan (2026-08-26, commit `ed4097538f50`) triaged: `python-jose` CVE was a stale/false finding (repo already on `PyJWT`); `sqlalchemy.text()` and DOM-XSS findings were false positives (no injectable/untrusted data reaches those sinks); `missing-integrity` fixed via `crossorigin` on Google Fonts/Turnstile tags (SRI itself is not applicable to either, per vendor docs); `dependabot-missing-cooldown` fixed in `.github/dependabot.yml`.
- [x] Turnstile diagnostic log reduced to `error-codes` only (was logging the full Cloudflare response).
- [ ] Confirm Railway `ALLOWED_HOSTS` includes the real production backend hostname.
- [ ] Confirm the production Turnstile secret and hostname configuration in Railway/Cloudflare.
- [ ] Confirm the admin password was changed after the earlier accidental plaintext exposure.
- [ ] If server-side URL fetching is ever introduced, harden public URL validation against RFC1918, link-local, IPv6 private ranges, and DNS rebinding.
- [ ] **CSRF real e não mitigado (CWE-352)**: cookies admin usam `SameSite=None` em produção, sem CSRF token. Todas as rotas mutáveis (`POST/PUT/PATCH/DELETE` em `/api/projects`, `/api/skills`, `/api/experiences`, `/api/chat/admin/*`) dependem só do cookie. Ver DECISIONS.md ("CSRF protection: double-submit cookie token").
- [ ] **Sem rate limit** em `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/mfa/setup/init` — todas as outras rotas de auth têm `@limiter.limit(...)`, essas três não.
- [ ] **Reuso de refresh token não é logado**: `validate_and_rotate_refresh_token` retorna `None` silenciosamente em token inválido/revogado/expirado. Reuso de token já rotacionado é sinal de roubo (replay) e deveria gerar `security_logger.warning(...)` + idealmente revogar toda a família de tokens do admin, não só rejeitar.
- [ ] **Sem rate limit em rotas admin autenticadas** (`/api/*/admin`, `/api/chat/admin/*`) como defesa extra contra cookie de sessão roubado/replay.
- [ ] **Retenção de PII indefinida**: `contact_messages.ip_address` e `conversations.ip_address` não têm política de expurgo documentada (LGPD/GDPR).

## Next logical step for the next session

1. Do a fresh clone and diff against what's documented here before assuming anything is applied — this has been wrong before (see Priority 0).
2. Get Felipe's confirmation on the `logo_url` Neon column (MFA Security panel already confirmed working, Priority 1b — closed).
3. Once confirmed, test Experience CRUD with a real logo image end-to-end.

## Done this session
- [x] Chat feature backend (models, schemas, service, routes) — validated end-to-end.
- [x] `frontend/index.html` custom-cursor.js broken path.
- [x] Removed 4 dead admin frontend files (see CHANGELOG_AI.md 2026-08-30).

## High priority
- [x] Chat frontend: widget público + painel admin de conversas.
- [ ] i18n do chat (público e admin) — hoje hardcoded em PT, fora da convenção `data-i18n`/`i18n.apply()` do resto do painel.
- [ ] Decide whether to rename `claude.md` → `CLAUDE.md` and `Architecture.md` → `ARCHITECTURE.md` for exact convention match (cosmetic, but confirm before touching — case-sensitive on Linux deploy targets).
- [ ] `backend/app/db/init_db.py` referenced as "empty/unused" in claude.md/Architecture.md no longer exists in the repo — stale doc reference, needs a pass to remove.

## Medium priority
- [ ] Confirm nested `portfolio/portfolio/` repo structure is intentional (Railway/Vercel root-directory settings) before ever restructuring it.
- [ ] Duplicate `.cursor-dot` CSS rule (two separate blocks in `style.css`, one with `z-index: 1001`, one with `z-index: 99999`) — likely leftover from an edit, second one wins; worth consolidating.
- [ ] Pre-existing CSRF exposure: admin cookies use `SameSite=None` in production (cross-domain Vercel/Railway), which is a real CSRF surface for all cookie-authenticated admin routes, chat admin endpoints included. Not introduced by chat, but chat adds more state-changing admin surface. Consider a double-submit CSRF token.

## Future improvements
- [ ] If real-time latency ever matters, revisit WebSocket for chat (see DECISIONS.md).