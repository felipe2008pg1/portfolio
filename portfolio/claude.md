# CLAUDE.md — Project Continuity Guide

## What this project is

Personal full stack portfolio for Felipe Gonzalez: public portfolio website plus authenticated admin panel for managing Projects, Skills, and Experience content without editing code.

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
│   │   ├── api/routes/       # auth, contact, projects, skills, experiences
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

Experience is now implemented end-to-end and confirmed working by the user through iterative testing (public list rendering, admin CRUD, i18n on both) during the 2026-08-26 session:

- Backend: `backend/app/models/experience.py`, `schemas/experience.py`, `services/experience_service.py`, `api/routes/experiences.py` (public `GET /api/experiences`, admin `GET /api/experiences/admin`, `POST/PUT/DELETE /api/experiences[/{id}]`). Router registered in `main.py`.
- `logo_url` field (String(500), nullable, validated as http/https like `company_url`) was added to the model and both `ExperienceCreate`/`ExperienceUpdate`/`ExperienceOut` schemas via `ExperienceBase`.
- **Blocker**: there is no migration system in use (see below). The `logo_url` column must be added manually to the production Neon `experiences` table with `ALTER TABLE experiences ADD COLUMN logo_url VARCHAR(500);` before deploying this backend change — `Base.metadata.create_all()` does not alter existing tables.
- `frontend/assets/js/admin-api.js` has full Experience CRUD methods (`getAllExperiences`, `createExperience`, `updateExperience`, `deleteExperience`) plus `getMfaStatus`.
- `frontend/painel-fg-2026x/assets/js/dashboard.js` has full Experience CRUD wiring (list/create/edit/delete, `logo_url` field), `updateStats()`, and `updateMfaStat()`/`renderMfaStat()`.
- `frontend/painel-fg-2026x/dashboard.html` has the Experience table/modal, including the `experienceLogoUrl` field, and `data-i18n` on all previously-hardcoded PT labels (nav link, section title, button, table headers, loading state).
- `frontend/assets/js/render-experience.js` renders the public Experience list into `#experienceList` with skeleton/error/empty states, following the current visual spec below.
- `frontend/assets/js/api.js` is now purely the fetch wrapper (`apiRequest` + `api` object) — a stale, unused `renderExperiences`/`loadExperiences` block that duplicated/conflicted with `render-experience.js` was removed.

### Current public Experience card layout (as implemented, subject to further design iteration)

Two-column card, `grid-template-columns: 22% 1fr`:
- Left (`.experience-item-visual`, `--color-blueprint` background): company logo image, `width/height: 100%`, `object-fit: cover`, no padding/border — fills the panel edge-to-edge. Falls back to the company's first initial (`.experience-item-logo-fallback`) if `logo_url` is absent or the image fails to load (`onerror` swap).
- Right (`.experience-item-body`, `--color-blueprint-soft` background): header row (`.experience-item-header`, `border-bottom` divider) with company name bold/large (`.experience-item-company`) and period as small muted text (`.experience-item-period`) — period placement was a judgment call since the user's latest spec didn't mention it; below the divider: role (`.experience-item-role`, semi-bold), description (`.experience-item-desc`, muted), then an outline "Ver empresa"/"Visit company" button (`.experience-item-link`, i18n key `experience.visitCompany`) linking to `company_url` when present.

This has changed several times this session per user feedback — re-verify against the user's latest description before assuming it's final if a future session touches this component.

## i18n state

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