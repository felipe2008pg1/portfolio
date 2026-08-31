# ARCHITECTURE.md

## Overview

The project is a decoupled personal portfolio composed of a static frontend, a FastAPI backend, and PostgreSQL on Neon.

```text
Frontend (Vercel)
  Static HTML/CSS/JS
        │ HTTPS/JSON
        ▼
Backend (Railway)
  FastAPI + SQLAlchemy
        │
        ▼
PostgreSQL (Neon)
```

There is no frontend framework, SSR, or build step.

## Backend

Routes validate input through Pydantic schemas and dependencies; service modules contain database/business operations; SQLAlchemy models define tables.

### Content APIs

- `GET /api/projects` — published projects
- `GET /api/projects/admin` — authenticated admin project list
- `POST/PUT/DELETE /api/projects[/{id}]` — authenticated project CRUD
- `GET /api/skills` — public skills
- `POST/PUT/DELETE /api/skills[/{id}]` — authenticated skill CRUD
- `GET /api/experiences` — published experiences
- `GET /api/experiences/admin` — authenticated admin experience list
- `POST /api/experiences` — authenticated experience creation
- `PUT /api/experiences/{id}` — authenticated experience update
- `DELETE /api/experiences/{id}` — authenticated experience deletion
- `POST /api/contact` — public, rate-limited contact form

Authentication also exposes login, MFA, refresh, logout, session, and MFA-management endpoints under `/api/auth`: `POST /api/auth/mfa/setup/init`, `POST /api/auth/mfa/setup/confirm`, `POST /api/auth/mfa/disable`, `GET /api/auth/mfa/status`. All confirmed present in `backend/app/api/routes/auth.py`.

### Experience feature

Experience is now implemented as a first-class content type. The model contains `id`, `company`, `role`, `period`, `description`, `description_en`, `company_url`, `logo_url`, `is_published`, `display_order`, and `created_at`. `logo_url` (String(500), nullable, http/https validated) was added 2026-08-26 and is **not yet present in the production Neon table** — requires a manual `ALTER TABLE experiences ADD COLUMN logo_url VARCHAR(500);` before the updated backend can be deployed safely.

`Experience` is imported by `app.models.__init__`, so `Base.metadata.create_all()` can create the `experiences` table on startup. The route is registered in `app/main.py`.

The service provides public published listing, authenticated full listing, create, update, get-by-id, and delete operations. Ordering is `display_order`, then `id`.

No dedicated migration for `experiences` was found. The current project convention is startup `Base.metadata.create_all()`, which creates missing tables but does not modify existing schemas.

## Database

Known tables include `admin_users`, `projects`, `skills`, `experiences`, `contact_messages`, `refresh_tokens`, and `mfa_backup_codes`.

Schema changes are not managed through active Alembic migrations. Existing one-off migrations and `Base.metadata.create_all()` remain the project convention.

## Security

The backend uses Argon2id password hashing, short-lived JWT access tokens, rotated refresh tokens, optional TOTP MFA, rate limiting, Turnstile, restrictive CORS, security headers, HSTS in production, HttpOnly/Secure/SameSite cookies, and TrustedHostMiddleware.

`TrustedHostMiddleware` is registered using `settings.allowed_hosts_list`, and only the restrictive CORS registration remains in `main.py`.

## Frontend

The public frontend uses vanilla HTML/CSS/JS. `i18n.js` maintains PT/EN translations and re-renders dynamic sections when the language changes. Database-driven content is rendered using DOM APIs and `textContent` rather than injecting API data through `innerHTML`.

The public Experience section is implemented in `frontend/assets/js/render-experience.js`, rendering into `#experienceList` with skeleton/empty/error states, matching the `render-skills.js`/`render-projects.js` pattern.

**i18n reactivity convention**: any function that renders translated dynamic content must split fetching (cache raw data) from rendering (pure re-render from cache via `i18n.t()`), and register the render function on `window` so `i18n.apply()` can call it on language switch. Public hooks: `renderSkillsTable`, `renderProjectsGrid`, `renderExperienceList`. Admin hooks: `renderProjectsTable`, `renderExperiencesTable`, `renderMfaStat`, `renderSecurityPanel` (admin `renderSkillsTable` reuses the public name by coincidence and works). This was a recurring bug source — see CLAUDE.md.

**CSP note**: `frontend/vercel.json` sets a `connect-src` CSP directive that hardcodes the backend hostname. It must be kept in sync with `frontend/assets/js/config.js`'s `API_BASE_URL` — a mismatch silently blocks every API call client-side (misleadingly looks like a CORS or backend-down error in devtools). CSP is an HTTP header; changes require a Vercel redeploy to take effect.

## Admin panel

The admin panel lives under `frontend/painel-fg-2026x/`.

It contains CRUD interfaces for Projects, Skills, and Experience (list/create/edit/delete, `is_published`, `display_order`, `logo_url`). `admin-api.js` exposes the Experience endpoints (`getAllExperiences`, `createExperience`, `updateExperience`, `deleteExperience`) plus MFA endpoints (`getMfaStatus`, `mfaSetupInit`, `mfaSetupConfirm`, `mfaDisable`). `dashboard.js` contains the corresponding table rendering, modal population, form handlers, and an `updateStats()`/`updateMfaStat()`/`renderMfaStat()` set that populates the dashboard's stat cards (`statTotalProjects`, `statPublished`, `statTotalSkills`, `statMfaStatus`, `statTotalExperiences`).

All Experience-related admin UI text (nav link, section title, table headers, buttons, empty/error/loading states) uses `data-i18n`/`i18n.t()`.

### Chat panel (admin side)

`dashboard.html`'s "Chat" section renders a conversation list (`#chatConversationList`) and a thread view (`#chatThreadMessages`) with a reply form and block/close/reopen/delete actions. State lives in module-level variables in `dashboard.js`: `chatConversationsCache`, `chatActiveConversationId`, `chatLastMessageId`, `chatPollTimer`. Two intervals are started once, from the single `DOMContentLoaded` handler: `loadChatConversations` every 6s (refreshes the list) and `pollActiveChatConversation` every 5s (appends new messages in the open thread, using `chatLastMessageId` as a cursor). **This file previously had its final `DOMContentLoaded`/`logoutBtn` block duplicated verbatim, which registered both intervals twice and caused the admin's own sent messages to render 3× (see claude.md, "Bug found and fixed 2026-08-31"). Fixed by deleting the duplicate block — if this file is ever edited again, verify there is exactly one `DOMContentLoaded` listener before adding new setup code to it, rather than appending a new block at the end.**

### Security panel (MFA enable/disable)

`dashboard.html`'s "Security" card (`mfaStatusText`, `mfaEnableBtn`, `mfaDisableBtn`, `#mfaModalOverlay`/`#mfaModalTitle`/`#mfaModalBody`/`#mfaModalAlert`) was previously dead markup with no JS wiring (always stuck on "Checking status…"). Now wired end-to-end in `dashboard.js`:

- `renderSecurityPanel()` — reads `mfaStatusCache` (populated by `updateMfaStat()`), toggles status text and which of `mfaEnableBtn`/`mfaDisableBtn` is visible. Registered as an i18n reactivity hook (see below).
- `startMfaSetup()` — calls `adminApi.mfaSetupInit()`, builds the modal body via DOM APIs (QR `<img>`, secret as `textContent`, 6-digit code form), opens `#mfaModalOverlay`. On confirm, calls `adminApi.mfaSetupConfirm(code)`, then `renderMfaBackupCodes()`, then `updateMfaStat()`.
- `startMfaDisable()` — builds a code-entry form, calls `adminApi.mfaDisable(code)` on submit, closes the modal and refreshes status.
- The QR image src is used as-is from the backend (`data:image/png;base64,...` — backend already includes the data-URI prefix; do not prepend it again client-side, this was a bug fixed 2026-08-27).
- Modal body content built via `document.createElement`/`textContent`, not `innerHTML`, for any server-supplied value (secret, backup codes) — consistent with the project's no-`innerHTML`-for-API-data convention.

## Deployment

- Frontend: Vercel
- Backend: Railway
- Database: Neon PostgreSQL

## Known cleanup

- `backend/app/db/init_db.py` remains empty/unused.
- Alembic is installed but not actively used.
- Duplicate/placeholder README files remain.
- Turnstile diagnostic logging and production `ALLOWED_HOSTS` configuration still require review.
- `frontend/assets/js/dashboard.js` (orphan, unreferenced by any HTML page — not to be confused with `frontend/painel-fg-2026x/assets/js/dashboard.js`, which is the real one) is still present as of 2026-08-31 despite being recorded as deleted in CHANGELOG_AI.md. See claude.md "Current known cleanup" for detail.