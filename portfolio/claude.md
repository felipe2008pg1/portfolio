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

## Current Support Chat feature state (IN PROGRESS — backend only, session paused mid-feature 2026-08-29)

Public support chat: visitor chats from `index.html`, admin sees/replies to all conversations from `dashboard.html`. **Backend delivered this session as copy-pasteable files, NOT confirmed applied to Felipe's real working tree, NOT deployed, NOT tested. Frontend (widget on index.html + admin dashboard section) NOT YET STARTED — pick up there next session.**

- Two new tables: `support_conversations` (`id`, `visitor_token` unique, `status`: open/blocked/closed, `created_at`, `last_message_at`, `last_visitor_message_at`, `last_read_by_admin_at`), `support_messages` (`id`, `conversation_id` FK cascade-delete, `sender`: visitor/admin, `content`, `created_at`). Models: `backend/app/models/support_conversation.py`, `support_message.py`, registered in `models/__init__.py`. No manual migration needed — new tables, `create_all()` on startup handles it (unlike the `logo_url` case).
- Schemas: `backend/app/schemas/support.py`.
- Service (business rules live here, not in routes): `backend/app/services/support_service.py` — get-or-create by `visitor_token`, 3-second visitor message cooldown enforced server-side (`VISITOR_MESSAGE_COOLDOWN`, raises `RateLimitedError` with `retry_after_seconds` for the frontend countdown), blocked-conversation rejection (`ConversationBlockedError`), unread detection, admin list/status/delete.
- Routes: `backend/app/api/routes/support.py`, prefix `/api/support`. Public: `POST /conversations` (Turnstile-gated, rate-limited `RATE_LIMIT_SUPPORT_START`, config in `config.py`), `GET /conversations/{visitor_token}`, `POST /conversations/{visitor_token}/messages`, `WS /ws/conversations/{visitor_token}`. Admin (all behind `get_current_admin`): `GET /admin/conversations`, `GET/POST /admin/conversations/{id}/messages`, `PATCH /admin/conversations/{id}` (status), `DELETE /admin/conversations/{id}`, `WS /ws/admin`.
- Realtime: WebSocket chosen over polling (Felipe's call, "melhor opção") — Railway runs a persistent process so this is viable. **Design decision**: sockets are push-only notification channels; all reads/writes still go through REST, which is the single place validating cooldown/blocking/Turnstile. Don't add write-handling to the WS endpoints later without a good reason — it would create a second, easy-to-forget validation path. In-memory `SupportWSManager` (`backend/app/core/ws_manager.py`) — single-process only, see Architecture.md if this ever needs to scale past one Railway instance.
- Admin WS auth: new `get_current_admin_ws()` in `backend/app/api/deps.py` reads the same `access_token` cookie as `get_current_admin`, adapted for the WebSocket handshake (no `Request` object there). Relies on the existing `SameSite=None` cross-origin cookie config already working for REST.
- Turnstile required only on conversation creation (first message), not every message — same one-shot-verification pattern as the contact form. Subsequent spam is bounded by the cooldown + blocking instead.
- `sanitize_text()` was extracted from `contact.py`'s schema into `backend/app/core/validators.py` and both schemas now import it from there — avoid re-duplicating this if touched again.
- **Known limitation, told to Felipe directly**: blocking only targets the `visitor_token` (stored in the visitor's `localStorage`). Anonymous, so a visitor who clears storage gets a new token and is unblocked. No stronger identity exists without adding real visitor accounts, which was explicitly out of scope for this feature.
- **Not yet built**: `frontend/assets/js/support-chat.js` (public widget), its `index.html` markup + CSS, `frontend/painel-fg-2026x` admin dashboard section (conversation list, message view, block/delete UI), `admin-api.js` additions, WS client code on both sides.



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

- `backend/app/db/init_db.py` is empty/unused.
- Alembic is installed but not actively used.
- Duplicate/placeholder README documentation remains.
- Production `ALLOWED_HOSTS` must be confirmed after TrustedHostMiddleware was enabled.
- Turnstile diagnostic logging still needs review.
- Major dependency updates and `python-jose` → `PyJWT` migration remain intentionally postponed.

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