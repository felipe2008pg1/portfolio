# CLAUDE.md — Project Continuity Guide

## What this project is

Personal full stack portfolio for Felipe Gonzalez: public portfolio website plus authenticated admin panel for managing Projects, Skills, Experience content, and (in progress) a live support chat, without editing code.

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL/Neon
- Frontend: vanilla HTML/CSS/JS, no framework and no build step
- Auth: short-lived JWT access token, rotated refresh token, optional TOTP MFA, Argon2id passwords
- Deployment: Railway backend, Vercel frontend, Neon database
- Security: Turnstile, rate limiting, restrictive CORS, security headers, TrustedHostMiddleware

## Important project rules

- Code, comments, technical documentation, and commit messages are written in English.
- Do not assume sandbox/tool edits reached Felipe's actual working tree. When code is delivered for manual copying, paste complete copy-pasteable files when requested.
- Do not commit or push changes to Felipe's repository without explicit permission.
- The actual repository is the source of truth. When documentation conflicts with code, inspect the repository and update the documentation.
- The admin path is intentionally `frontend/painel-fg-2026x/`.
- Skill categories are stored in Portuguese and translated to English by `CATEGORY_TRANSLATIONS_EN` in `frontend/assets/js/i18n.js`.

## Repository organization

```text
portfolio/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # auth, contact, projects, skills, experiences, support
│   │   ├── core/             # config, security, middleware, Turnstile, logging
│   │   ├── db/               # Base and session
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # database/business operations
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── assets/js/            # API, i18n, public renderers and site behavior
    └── painel-fg-2026x/
        ├── login.html
        ├── dashboard.html
        └── assets/js/        # admin API, login and dashboard behavior
```

## Current Experience feature state

Backend, admin CRUD, public rendering, and i18n for Experience are implemented in code. **Not re-verified this session** — see "Repo/chat sync reality" below; treat prior "confirmed working" claims for this feature with caution until re-checked against the real working tree.

- Backend: `backend/app/models/experience.py`, `schemas/experience.py`, `services/experience_service.py`, `api/routes/experiences.py` (public `GET /api/experiences`, admin `GET /api/experiences/admin`, `POST/PUT/DELETE /api/experiences[/{id}]`). Router registered in `main.py`.
- `logo_url` field (String(500), nullable, http/https validated) exists on the model/schemas.
- **Still blocked**: no migration system in use. `logo_url` column must be added manually to the production Neon `experiences` table: `ALTER TABLE experiences ADD COLUMN logo_url VARCHAR(500);` — unconfirmed whether this has been run.
- Admin dashboard now also has a 5th stat card, `statTotalExperiences` (see below) — delivered this session, not confirmed applied.

## Repo/chat sync reality (read before trusting any "confirmed" claim in these docs)

A fresh clone on 2026-08-26 showed `HEAD` (`ebf8eb5`) only differs from an earlier commit (`ed40975`) by documentation files — none of the Experience/CRUD/i18n code described as "delivered" in earlier changelog phases was actually committed. Felipe applies fixes manually to his real working tree, one chat-delivered file at a time, and confirmation only happens when he pastes back the resulting file or reports a symptom. **Do not assume anything in CHANGELOG_AI.md is live in the repo — only what Felipe has explicitly pasted back or confirmed working in this exact conversation is verified.**

### Current public Experience card layout (as implemented, subject to further design iteration)

Two-column card, `grid-template-columns: 22% 1fr`:
- Left (`.experience-item-visual`, `--color-blueprint` background): company logo image, `width/height: 100%`, `object-fit: cover`, no padding/border — fills the panel edge-to-edge. Falls back to the company's first initial (`.experience-item-logo-fallback`) if `logo_url` is absent or the image fails to load (`onerror` swap).
- Right (`.experience-item-body`, `--color-blueprint-soft` background): header row (`.experience-item-header`, `border-bottom` divider) with company name bold/large (`.experience-item-company`) and period as small muted text (`.experience-item-period`) — period placement was a judgment call since the user's latest spec didn't mention it; below the divider: role (`.experience-item-role`, semi-bold), description (`.experience-item-desc`, muted), then an outline "Ver empresa"/"Visit company" button (`.experience-item-link`, i18n key `experience.visitCompany`) linking to `company_url` when present.

This has changed several times this session per user feedback — re-verify against the user's latest description before assuming it's final if a future session touches this component.

## Chat feature state — SUPERSEDED SECTION, kept only as history

An earlier design pass (2026-08-29) planned a WebSocket-based `support_conversations`/`support_messages`/`support.py` implementation. **That design was abandoned before being built** — see DECISIONS.md ("Chat widget: polling instead of WebSocket"). The tables, routes, and `SupportWSManager` described in that pass never shipped. Do not resurrect `support_service.py`/`ws_manager.py` references from old context — the actual implementation is `chat_service.py` / `chat.py` / `conversations` / `chat_messages`, described below and in Architecture.md.

## Current Chat feature state — IMPLEMENTED (backend + both frontends), 2026-08-31

Public support chat is code-complete: visitor widget on `index.html`/`404.html` (`frontend/assets/js/chat-widget.js`), admin conversation panel on `dashboard.html` (`frontend/painel-fg-2026x/assets/js/dashboard.js`, "Chat" nav section). Backend previously validated end-to-end with a real SQLite boot + 16 functional assertions (see CHANGELOG_AI.md, Phase "2026-08-30"). **Frontend has not been confirmed live/deployed by Felipe** — same standing caveat as everything else, see "Repo/chat sync reality" above.

- Tables: `conversations` (`id`, `token_hash`, `status`: open/blocked/closed, `created_at`, `last_message_at`, `last_visitor_message_at`), `chat_messages` (`id`, `conversation_id` FK cascade-delete, `sender`: visitor/admin, `content`, `created_at`). No manual migration needed — new tables, `create_all()` on startup handles it.
- Realtime = **polling**, not WebSocket (visitor 4s / admin 5s) — see DECISIONS.md for why.
- Visitor identity: opaque `secrets.token_urlsafe(32)` token, hashed at rest (`token_hash`), sent via `X-Visitor-Token` header, persisted client-side in `localStorage`. See DECISIONS.md for the accepted trade-off (clearing storage = new anonymous visitor).
- Routes (`backend/app/api/routes/chat.py`, prefix `/api/chat`): public `POST /conversations` (Turnstile-gated), `GET /conversations/me/messages`, `POST /conversations/me/messages`; admin (behind `get_current_admin`, same cookie-JWT as every other admin route) `GET /admin/conversations`, `GET/POST /admin/conversations/{id}/messages`, `PATCH /admin/conversations/{id}/status`, `DELETE /admin/conversations/{id}`.
- Server-side 3s cooldown + 500-message-per-conversation cap enforced in `chat_service.py`, independent of any client-side timer.
- Frontend files: `frontend/assets/js/chat-widget.js` (public widget — single `DOMContentLoaded` init, guarded by an `opened` flag so `setInterval(poll, 4000)` is only ever registered once), `frontend/painel-fg-2026x/assets/js/dashboard.js` (admin "Chat" section — conversation list + thread view + reply form + block/close/reopen/delete), `frontend/painel-fg-2026x/assets/js/admin-api.js` (`getConversations`, `getConversationMessages`, `sendConversationMessage`, `updateConversationStatus`, `deleteConversation`).
- **Bug found and fixed 2026-08-31**: `painel-fg-2026x/assets/js/dashboard.js` had its final ~19 lines (a `logoutBtn` click handler + the `DOMContentLoaded` block that calls `loadChatConversations()` and starts both poll intervals) duplicated verbatim at the end of the file. Effect: two independent `setInterval(pollActiveChatConversation, 5000)` timers ran concurrently against the same shared `chatLastMessageId`, racing each other. When the admin sent a reply, the submit handler rendered it once immediately, and both duplicate poll timers then also fetched and rendered the same just-sent message on their next tick — 1 (own submit) + 2 (duplicate polls) = **the admin's own message appearing 3×**, while the backend and the visitor's view (single poll timer, no duplication) correctly showed it once. Root cause confirmed by inspection (two identical `DOMContentLoaded` blocks in the same file, lines ~756–774 and ~974–992 of the pre-fix version), not by guessing. **Fix**: delete the second, duplicate block — file goes from 992 to 972 lines. Delivered as an instruction (exact block to delete), not yet confirmed applied/tested by Felipe against his real working tree.



`frontend/assets/js/i18n.js` has PT/EN keys for: the public Experience section (`experience.*`, including `experience.visitCompany`), all admin nav/dashboard labels (`admin.nav.experience`, `admin.dashboard.experienceTitle`, `newExperience`, `colCompany`, `colRole`, `colPeriod`, `newExperienceModalTitle`, `editExperienceModalTitle`), and previously-missing dynamic admin table text (`admin.dashboard.yes`/`no`, `edit`/`delete`, `noProjects`/`noSkills`/`noExperiences`, `errorLoadingProjects`/`Skills`/`Experiences`).

**Reactivity convention**: `i18n.apply()` (in `i18n.js`) re-renders dynamic content on language switch by calling, if defined, `window.renderSkillsTable`, `window.renderProjectsGrid`, `window.renderExperienceList` (public), and `window.renderProjectsTable`, `window.renderExperiencesTable`, `window.renderMfaStat` (admin). **Any new admin/public render function whose output contains translated text must follow this same pattern**: split fetch (cache the raw data/state) from render (pure re-render from cache using `i18n.t()`), and register the render function on `window` so `apply()` can find and call it. This bug (text only updating after F5, not on PT/EN toggle) has recurred twice this session (admin tables, then the MFA stat) — check for it whenever adding new dynamic admin text.

## Known technical conventions/gotchas

- Run `git status`/`git diff` before building on previous AI work.
- `uvicorn --reload` must exclude database files because request-time database writes otherwise trigger reload loops.
- Cross-domain production auth cookies require `SameSite=None` and `Secure=True`; local development uses stricter same-site behavior.
- Turnstile requires exact registered hostnames and matching site/secret keys.
- Project images should use local `frontend/assets/img/projects/` paths when external hosts block hotlinking.
- Do not use `innerHTML` with API-controlled data; use DOM creation and `textContent`.
- `frontend/vercel.json`'s CSP `connect-src` directive hardcodes the backend hostname. If the Railway backend URL ever changes, both `frontend/assets/js/config.js` (`API_BASE_URL`) and this CSP directive must be updated together — a mismatch here silently blocks every fetch in the browser (looks like "backend is down"/CORS in devtools, but is neither; it's the CSP). This exact bug occurred and was fixed 2026-08-26 (stale hostname `portfolio-api-production` vs actual `portfolio-production-fef5`). CSP is an HTTP header set by Vercel, so a redeploy is required after editing `vercel.json` — CDN cache does not pick it up automatically.

## Current known cleanup

- **Security audit 2026-08-31**: CSRF (no token, `SameSite=None`), missing rate limits on refresh/logout/mfa-setup-init, and unlogged refresh-token reuse — see TODO.md "Security follow-up" and DECISIONS.md.
- ~~`backend/app/db/init_db.py` is empty/unused.~~ File no longer exists in the repo — this note was stale, removed 2026-08-30.
- Alembic is installed but not actively used.
- Duplicate/placeholder README documentation remains.
- Production `ALLOWED_HOSTS` must be confirmed after TrustedHostMiddleware was enabled.
- Turnstile diagnostic logging still needs review.
- Major dependency updates and `python-jose` → `PyJWT` migration remain intentionally postponed.
- **`frontend/assets/js/dashboard.js` (the orphan, distinct from `frontend/painel-fg-2026x/assets/js/dashboard.js`) is still present in the repo as of the 2026-08-31 clone**, despite CHANGELOG_AI.md (Phase "2026-08-30") recording it as deleted. Re-confirmed unreferenced by any `.html` file via `grep` this session — genuinely dead, safe to delete. Likely explanation: the deletion was delivered to Felipe as an instruction but never actually applied/committed to his working tree — consistent with the "Repo/chat sync reality" note above. Don't assume it's gone until Felipe confirms he removed it.
- **Repo history was squashed**: the 2026-08-31 clone has a single commit (`Bugs fixed`, `0060043`). None of the phase-by-phase commit history CHANGELOG_AI.md implicitly assumes is retrievable via `git log` — treat CHANGELOG_AI.md as the only remaining record of *intent*, not as something you can `git blame`/diff against for what actually shipped when.

## Verification commands

From the repository root:

```powershell
git status
git diff
git log --oneline -20
git ls-files | Select-String "\.env$|venv/|\.db$"
```

Before claiming Experience is complete, also verify the actual files and test:

```text
backend API → /api/experiences
admin CRUD → dashboard.html + dashboard.js + admin-api.js
public rendering → index.html + render-experience.js + i18n.js
```