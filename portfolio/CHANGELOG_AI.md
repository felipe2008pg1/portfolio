# CHANGELOG_AI.md

## 2026-08-30 — Chat widget frontend (public + admin)

**Added**
- `frontend/assets/js/chat-widget.js` — widget público flutuante (canto superior direito, borda BR/US giratória igual ao stat card do admin), Turnstile na abertura da conversa, polling 4s, cooldown 3s client-side (espelhando o cooldown real do backend).
- `frontend/assets/css/style.css` — estilos `.chat-widget`/`.chat-toggle`/`.chat-panel`.
- `frontend/painel-fg-2026x/dashboard.html` — nova seção `#chat` (lista de conversas + thread + ações bloquear/encerrar/reabrir).
- `frontend/painel-fg-2026x/assets/js/dashboard.js` — `loadChatConversations`, `selectChatConversation`, `pollActiveChatConversation`, `updateChatConversationStatus`. Polling: lista a cada 6s, conversa ativa a cada 5s.
- `frontend/painel-fg-2026x/assets/js/admin-api.js` — `getConversations`, `getConversationMessages`, `sendConversationMessage`, `updateConversationStatus`.
- `frontend/painel-fg-2026x/assets/css/admin.css` — `.admin-chat-*` (layout duas colunas, bolhas de mensagem).

**Known gap**
- Textos do chat (admin e público) ainda não seguem a convenção i18n do projeto (`data-i18n`/`i18n.apply()` hook) — estão hardcoded em PT. Ver TODO.md.

**Also fixed during backend integration (local dev, not part of the original delivery)**
- Vários arquivos (`app/main.py`, `app/schemas/chat.py`, `app/api/routes/chat.py`, models) tiveam conteúdo trocado/duplicado/vazio durante cópia manual local — corrigido iterativamente nesta sessão. Nomes finais: `app/models/conversation.py` (`Conversation`), `app/models/chat_message.py` (`ChatMessage`) — um sistema paralelo `support.py`/`ws_manager.py` (casca vazia, WebSocket) foi removido por decisão do usuário para não duplicar o sistema já funcional.

> Chronological log reconstructed from the history of a single long and continuous conversation between the user and a previous Claude. There are no actual commit timestamps associated with each item (there was no access to a detailed `git log` throughout the entire session) — the order reflects the order of decisions in the conversation, not necessarily the exact order of Git commits.

## Phase 1 — Planning and Initial Scaffold

* Project definition: personal full stack portfolio (not a simple static landing page)
* Chosen stack: Python/FastAPI on the backend (at the explicit request of the user, who is a Python backend developer), plain HTML/CSS/JS on the frontend (no framework)
* Initial database: SQLite (later migrated to Postgres/Neon — see Phase 5)
* Backend scaffold: `core/db/models/schemas/api/services` structure, separation of responsibilities
* Seed script (`seed.py`) to create initial admin + skills

## Phase 2 — Public Frontend

* Static HTML/CSS/JS: hero, about, skills (rendered via API), projects (via API), contact (form → WhatsApp via `wa.me`)
* Initial design: "system record" concept (graphite/teal/amber palette, terminal-style panel) — **later completely replaced** (see Phase 7)
* Dark/light theme with persistence in `localStorage`
* PT/EN internationalization via `data-i18n` + JS dictionary

## Phase 3 — Admin Panel

* Login with JWT in HttpOnly cookie
* Dashboard with CRUD for projects and skills, form modals
* Admin route renamed from `/admin` to `/painel-fg-2026x` (security through obscurity)

## Phase 4 — Security Checklist

User provided an extensive checklist; agent corrected incorrect markings (several items were already implemented without the user realizing it: parameterized SQLAlchemy, Pydantic, restricted CORS, HttpOnly cookies, SameSite, login lockout, basic logs) and implemented what was missing, in order:

1. HSTS (already existed, conditional on `ENVIRONMENT=production`)
2. Admin on a non-obvious route (folder rename)
3. Short-lived JWT (15 min) + Refresh Token with rotation (`refresh_tokens` table, SHA-256 hash, opaque)
4. Cloudflare Turnstile on login and contact form
5. Dependency updates (small patches applied; major versions postponed — see `TODO.md`)
6. SQLite → PostgreSQL migration (Neon) to enable real backups (SQLite on ephemeral PaaS storage is unreliable)
7. MFA (TOTP + backup codes) — `mfa_backup_codes` model, QR code generated via `qrcode`+`Pillow`, two-step login flow

Bugs found and fixed during this phase:

* `TypeError: can't compare offset-naive and offset-aware datetimes` — SQLite does not preserve timezone; fixed with `ensure_aware_utc()` helper
* Non-serializable exception in `RequestValidationError` (raw `ValueError` object inside Pydantic's `ctx`) breaking the 422 error handler — fixed by filtering only serializable fields
* Infinite uvicorn reload loop caused by writes to the `.db` being monitored by the watcher — fixed with `--reload-exclude`
* VS Code Live Server repeatedly reloading the admin page for the same reason — fixed with `.vscode/settings.json` restricting the watcher scope

## Phase 5 — Production Deployment

* Backend → Railway (root directory `backend`, `Procfile`, `runtime.txt`)
* Frontend → Vercel (root directory `frontend`, `vercel.json` with security headers)
* Database → Neon Postgres (definitively replacing SQLite)
* Critical post-deployment fix: `SameSite=Strict` cookies were blocking cross-site sessions (frontend and backend on different domains) — fixed to `SameSite=None` conditional on `ENVIRONMENT=production`
* Turnstile switched from test keys to real keys, with back-and-forth caused by a mismatch between site key/secret key in different places

## Phase 6 — Internationalization and Dynamic Content

* `description_en` field added to projects (one-off migration `add_description_en_column.py`) to allow translatable project descriptions (unlike the title, which is never translated)
* Fixed skill categories that had been entered in English by mistake in the admin panel (breaking the `CATEGORY_TRANSLATIONS_EN` translation map)

## Phase 7 — Complete Visual Redesign ("Blueprint")

User requested a complete change of visual identity (not just refinement). New concept proposed and accepted: deep blue-blueprint + security orange palette, Archivo/Inter/JetBrains Mono typography, technical background grid, status panel styled like a blueprint sheet, project cards with "SHEET XX/XX" numbering.

* Skeleton loading, empty states with SVG icons, contact icons replaced from emoji with SVG
* Admin panel redesigned: navigation sidebar + topbar + stat cards (project/published/skills/MFA status counts)
* Enhanced mobile responsiveness (tables become stacked cards, larger touch targets)
* Micro-interactions: card image zoom on hover, 3D tilt on project cards, staggered list entry animations, scroll progress bar, crosshair following the mouse in the hero, button spinners during loading

## Phase 8 — Brazil/USA Identity

At the user's request ("mixed Brazilian-American style"), color accents were added:

* Green and yellow (Brazil) + red (USA) as secondary colors by section (skills=green, projects=yellow, contact=red)
* Hero background progressively darkened (`#0F2942` → `#081C30` → `#050F1C`) at the user's request
* Animated flags in the hero: first version in SVG with CSS `@keyframes` sway animation; **replaced** with real animated GIFs hosted on Giphy (direct hotlink), at the user's explicit request, with increased size

## Phase 9 — Project Image Fixes

* Images hosted on Imgur/LinkedIn CDN returning 403 (hotlink protection / expired token)
* Solution: host images locally in `frontend/assets/img/projects/`, backend now accepts `image_path` as a relative path (`assets/...`) in addition to full URLs, with anti-path-traversal validation

## Phase 10 — Session 2026-08-25: Context Reconstruction, Admin Stats Fix, Visual Polish

### Part A — Context reconstruction (read-only analysis)

Full static inspection of the repository (no code changes), comparing actual code against `CLAUDE.md`/`ARCHITECTURE.md`/`TODO.md`/`CHANGELOG_AI.md`. Discrepancies found:

* Dead scaffolding: `backend/app/models/experience.py`, `schemas/experience.py`, `api/routes/experiences.py`, `frontend/assets/js/render-experience.js` — all empty, unregistered, never mounted. Not mentioned in any doc.
* `TrustedHostMiddleware` imported in `main.py` but never registered — `ARCHITECTURE.md` incorrectly listed it as active (now corrected).
* `CORSMiddleware` registered twice in `main.py` (restrictive, then `allow_methods=["*"]`) — undermines the restrictive intent, not yet fixed.
* `app/db/init_db.py` is empty/unused; `Base.metadata.create_all()` is called directly in `main.py` instead.
* Portuguese strings still present in user-facing `ValueError` messages in `backend/app/schemas/project.py`, and in comments/docstrings in `backend/app/core/security.py` — contradicts the "standardized to English" status.
* Turnstile diagnostic log in `app/core/turnstile.py` (flagged in `TODO.md` for removal) confirmed still present.
* Turnstile site key confirmed consistent across 3 of 4 locations (`index.html`, `login.html`, `config.js` all use `0x4AAAAAAD2-bMzcMMaQWBgk`); 4th location (Railway env var) not verifiable from the repo.
* `DECISIONS.md`, referenced by both `CLAUDE.md` and this file, did not exist — created this session.
* Duplicate, near-identical `README.md` at repo root and inside `portfolio/`.
* Admin dashboard stat cards (see Part B) found to be non-functional.

### Part B — Admin dashboard stats bug fix

`statTotalProjects`, `statPublished`, `statTotalSkills`, `statMfaStatus` existed in `dashboard.html` but were never populated by any JS (permanently showed `—`). Fixed:

* `adminApi.getMfaStatus()` added to `admin-api.js` (`GET /api/auth/mfa/status`)
* `updateStats()` added to `dashboard.js` — derives counts from the already-loaded `projectsCache`/`skillsCache`, called after `loadProjects()`/`loadSkills()` succeed
* `updateMfaStat()` added to `dashboard.js` — calls `getMfaStatus()`, called on `DOMContentLoaded`
* `admin.stat.mfaOn`/`admin.stat.mfaOff` i18n keys added (PT/EN) to `i18n.js`

**Delivery:** full `dashboard.js` and the `admin-api.js`/`i18n.js` snippets were pasted as complete, copy-pasteable code in the chat, at the user's explicit request. Reasonably confident this reached the real repo, but not confirmed — verify with `git diff`/`git status` before building on top of it.

### Part C — Visual polish (public site) — ⚠️ delivery NOT confirmed

The user asked for visual/animation improvements one at a time. Each was implemented in the AI's sandboxed working copy and only *described* in the chat response (prose summary), not pasted as full code. **This almost certainly means none of the following reached the actual repository** — see gotcha #9 in `CLAUDE.md`, discovered because of this exact issue. Treat all of the below as a spec to re-implement or re-deliver, not as done:

* `index.html`: fixed a pre-existing stray extra `</div>` right after `.hero-flags`. Added `#cursorDot` element. Added `class="fade-init"` to `<body>`. Added `<noscript>` fallback for the fade-in.
* `style.css`: `.hero-flags`/`.hero-flag` rewritten — each flag now fills 50% width/100% height (was two 480px rectangles), soft gradient blend at the center seam and top/bottom, slow drift animation (`heroFlagDrift`, desynced between the two flags). `.skill-tag` given a `tag-in` fade+scale-in animation, staggered per tag via inline `animationDelay` (set in `render-skills.js`). `.scroll-progress` given an animated flowing gradient (`scroll-progress-flow`) + glow. `.project-card-image` wrapped in a new `.project-card-image-wrap` (required a JS structural change, see below) with a hover depth gradient overlay. New `.cursor-dot` styles (dot + ring, hides on touch devices/`prefers-reduced-motion`). New `.system-panel-value.is-typing::after` blinking caret. New `body.fade-init`/`body.fade-init.is-loaded` fade-in rule — **intentionally scoped to `.fade-init`, not a bare `body` selector**, because an earlier version of this change (bare `body { opacity: 0 }`) would have permanently blanked `404.html`, `painel-fg-2026x/login.html`, and `dashboard.html`, none of which load `main.js` to remove that state. This was caught and fixed within the same session, before ever being described to the user — but it's a concrete example of why full-file review matters before pasting fixes.
* `render-skills.js`: tags now get `tag.style.animationDelay` based on index (45ms step).
* `render-projects.js`: image creation changed from `card.appendChild(img)` directly to wrapping in a new `imgWrap` (`.project-card-image-wrap`) div — **structural change, higher risk if applied partially**.
* `main.js`: added the custom cursor logic (mousemove/mouseover listeners), the system-panel typing effect (runs once on `DOMContentLoaded`, after `i18n.apply()` — relies on script load order: `i18n.js` before `main.js`), and `document.body.classList.add("is-loaded")` as the first line of the `DOMContentLoaded` handler.

### Problems encountered

* Discovered mid-session that AI sandbox tool edits don't sync to the user's real project — the user reported the Part B fix "still not working," which turned out to mean it had simply never been applied yet (see `CLAUDE.md` gotcha #9).
* Caught and fixed a self-introduced bug (global `body{opacity:0}` breaking pages without `main.js`) before it was ever shipped to the user.

### What remains unfinished

* Everything in Part C — needs re-delivery (full file dumps or clear diffs) or re-implementation, and confirmation that it's actually in the repository.
* All Part A discrepancies except the admin stats fix (Part B) — still open, see `TODO.md`.

### Recommended next step

Before writing any new code: run `git status` / `git diff` in the actual repository to determine exactly what from this session (Part B and/or Part C) is really there. Do not assume Part C exists. Then either re-request full code for the missing pieces, or continue from whatever is confirmed present.

## Phase 11 — Session 2026-08-25 (2): Middleware Hardening

Picked up TODO.md Priority 0 items (bugs confirmed by Phase 10 Part A inspection, not the unconfirmed Part C visual work).

* `backend/app/main.py`: removed the duplicate, permissive `CORSMiddleware` registration (`allow_methods=["*"]`, `allow_headers=["*"]`) that was undermining the restrictive one. Only the restrictive registration remains.
* `backend/app/main.py`: registered `TrustedHostMiddleware` (was imported but never added) using the existing `settings.allowed_hosts_list`. Added as the last middleware so it's outermost and validates the `Host` header before CORS/routing — mitigates Host Header Injection (cache poisoning, password-reset-link poisoning via forged `Host`).
* No functional/behavioral change to CORS policy itself (same origins, now enforced consistently); no schema/API changes; no frontend changes required.
* Verified: `main.py` parses (`ast.parse`), no other references to the removed middleware block.

**⚠️ Follow-up required (cannot be verified from the repo, needs Railway dashboard access):** confirm the `ALLOWED_HOSTS` env var in production includes the real Railway backend hostname. Default fallback is `localhost,127.0.0.1` only — if `ALLOWED_HOSTS` was never explicitly set on Railway, this change will cause **all production requests to start failing with 400 Invalid host header** immediately on deploy. Set it before/with this deploy, e.g.: `ALLOWED_HOSTS=portfolio-production-fef5.up.railway.app` (confirm exact domain in Railway dashboard first — see gotcha in `CLAUDE.md` about URLs possibly having changed).

## Phase 12 — Session 2026-08-25 (3): Cursor Fix + i18n Cleanup (schemas/security)

* `frontend/assets/css/style.css`: added `html { cursor: none }` scoped to `@media (hover: hover) and (prefers-reduced-motion: no-preference)`, matching the exact condition under which `main.js` activates `.cursor-dot` and the condition under which `.cursor-dot` itself is hidden. Prevents the native OS cursor and the custom cursor-dot from showing at the same time, without leaving touch/reduced-motion users with no cursor at all. No other `cursor:` declarations exist in `style.css`, so nothing conflicts.
* `backend/app/schemas/project.py`: translated all PT `ValueError` messages to English ("URL inválida" → "Invalid URL", etc.) — these are user-facing (returned in 422 API responses), so this was a real inconsistency, not just an internal comment. Also stripped a leading UTF-8 BOM (harmless to CPython, but inconsistent with the rest of the repo).
* `backend/app/core/security.py`: translated remaining PT docstrings/comments (`ensure_aware_utc`, `hash_opaque_token`, `create_mfa_pending_token`) to English. No logic changes.
* Verified: both files still parse (`ast.parse`), no PT characters remain in either file.

### Noted but out of scope for this task (flagged for a future security pass)

* `_validate_public_url()` in `project.py` blocks `localhost`/`127.0.0.1`/`0.0.0.0`/`::1`/`*.local` but not RFC1918 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16` — includes the cloud metadata IP `169.254.169.254`), or IPv6 unique-local/link-local ranges. **Confirmed low risk today**: grepped the backend for any server-side fetch of `repo_url`/`demo_url`/`image_path` (`requests.`, `httpx.`, `urlopen`) — none exists; these fields are only stored and rendered as `<a href>`/`<img src>` on the client, so there's no SSRF vector currently. Would become a real SSRF risk if a future feature (e.g. link preview/thumbnail generation) ever fetches these URLs server-side — the validator would need a proper private-IP-range check (and DNS-rebinding-safe resolution) before that happens.

## State at the Time This Changelog Was Last Updated (2026-08-25)

Public site and admin panel functional in production, modulo the admin stat cards fix from Phase 10 (delivery unconfirmed) and the visual polish from Phase 10 Part C (delivery almost certainly did NOT happen). `README.md` exists at repo root but is a placeholder "in development" badge, not real documentation. `DECISIONS.md` created in Phase 10.
## Phase 13 — Session 2026-08-25 (4): Experience feature completion + Part B re-fix (fresh-clone verified)

Worked from a fresh `git clone` of the actual GitHub repository (not chat-pasted code), per the Priority 0 synchronization rule. This gave ground truth on what was actually missing.

### Confirmed missing (contradicting earlier optimistic documentation)

* `dashboard.js` had no `updateStats`/`updateMfaStat`/`getMfaStatus` — the Part B stats fix never reached the repo.
* `frontend/assets/js/render-experience.js` was empty (0 bytes).
* `admin-api.js` had **zero** Experience methods, and `dashboard.js` had **zero** Experience CRUD logic — despite `dashboard.html` already containing the full Experience table and modal markup (IDs: `experiencesTableBody`, `experienceForm`, `experienceCompany`, `experienceRole`, `experiencePeriod`, `experienceDescription`, `experienceDescriptionEn`, `experienceCompanyUrl`, `experienceOrder`, `experiencePublished`, `newExperienceBtn`).
* `frontend/assets/js/api.js` contained a stale, unused `renderExperiences`/`renderExperienceError`/`loadExperiences` block targeting `#experiencia .container .section-head` + `.experience-rendered-content`/`.about-facts` — a DOM structure `index.html` no longer has. It ran its own `DOMContentLoaded` listener, which would have fired a redundant `/api/experiences` fetch and silently done nothing once `render-experience.js` was filled in.

### Changes

* **`frontend/assets/js/render-experience.js`** (new content): fetches `api.getExperiences()`, renders into `#experienceList` using skeleton → data/empty/error states, following the `render-skills.js` module pattern (module-level cache var, `DOMContentLoaded` load, `window.renderExperienceList` export). Uses the existing but previously-unused `.experience-item`/`.experience-item-period`/`.experience-item-body`/`.experience-item-role`/`.experience-item-company`/`.experience-item-desc`/`.experience-empty` CSS. Company links validated with the same `isSafeHttpUrl` (http/https only) pattern used elsewhere. EN description falls back to PT when `description_en` is empty, matching the Skills/Projects i18n convention.
* **`frontend/assets/js/api.js`**: removed the stale `renderExperiences`/`renderExperienceError`/`isSafeHttpUrl`/`loadExperiences` block (185 lines). `api.js` is now purely the fetch wrapper + `api` object, as its role should be — rendering lives in `render-experience.js`.
* **`frontend/painel-fg-2026x/assets/js/admin-api.js`**: added `getAllExperiences`, `createExperience`, `updateExperience`, `deleteExperience` (mirrors the Projects methods exactly, hitting `/api/experiences/admin` and `/api/experiences/{id}`), and `getMfaStatus` (`GET /api/auth/mfa/status`).
* **`frontend/painel-fg-2026x/assets/js/dashboard.js`**: added full Experience CRUD — `loadExperiences`, `renderExperiencesTable`, `openExperienceModal`, `deleteExperience`, form submit handler, `newExperienceBtn` click handler — mirroring the existing Projects CRUD block field-for-field (same hardcoded-PT-string convention for alerts/empty-states as Projects/Skills, since that's the established — if imperfect — pattern; i18n is only used for modal titles, matching `openProjectModal`/`openSkillModal`). Also added `updateStats()` (derives `statTotalProjects`/`statPublished`/`statTotalSkills` from the already-loaded caches, called after `loadProjects()`/`loadSkills()` succeed) and `updateMfaStat()` (calls `adminApi.getMfaStatus()`, called on `DOMContentLoaded`). Both wired into the existing `DOMContentLoaded` handler alongside `loadExperiences()`.
* **`frontend/assets/js/i18n.js`**: added `admin.dashboard.newExperienceModalTitle`/`editExperienceModalTitle` (PT + EN), matching the existing Project/Skill modal-title key naming.

### Verified

* All five touched JS files pass `node --check` (syntax only — no live browser/DB test was possible in this sandbox).
* Script load order in `dashboard.html` (`i18n.js` → `admin-api.js` → `dashboard.js`) and `index.html` (loads `render-experience.js`) confirmed correct for the new code's dependencies.
* Backend `backend/app/api/routes/experiences.py` endpoint paths (`GET /api/experiences`, `GET /api/experiences/admin`, `POST/PUT/DELETE /api/experiences[/{id}]`) cross-checked against the new `admin-api.js`/`api.js` calls — match.
* Noted (not fixed, out of scope): `admin.stat.mfaOn`/`mfaOff` keys are duplicated (defined twice with identical values) in both the PT and EN blocks of `i18n.js` — harmless, candidate for a later cleanup pass.

### What remains unconfirmed

* **This session's work was done against a fresh clone in a sandbox, not Felipe's actual local working tree.** Per the project's own established gotcha (Phase 10), sandbox edits do not automatically reach the real repository. Full copy-pasteable file contents were provided in chat for `render-experience.js`, `api.js`, `admin-api.js`, `dashboard.js`, and `i18n.js`. Do not assume this reached the real repo until confirmed with `git status`/`git diff` there.
* No live functional test (browser + real backend + real Neon DB) was performed — only static syntax checks and manual cross-referencing against the schema/route/HTML files.
* Part C visual polish (from Phase 10) remains untouched by this session and its status is unchanged (assume not delivered, per prior changelog entries).

## Phase 14 — Session 2026-08-26: CSP outage fix, admin i18n gaps, Experience card redesign x2, reactivity fixes

Continuation of the same 2026-08-26 session, driven entirely by Felipe testing each delivered fix live and reporting back what broke. No code was invented speculatively — every change below was a direct response to a reported symptom or an explicit design spec from Felipe.

### 1. Total site outage — CSP hostname mismatch (not CORS, not backend down)

Felipe reported login and all public API calls failing with "Couldn't connect to the server" / a generic CORS-looking error, and suspected the backend was down. Console output (F12) showed the real cause: `frontend/vercel.json`'s CSP `connect-src` directive allowed `https://portfolio-api-production.up.railway.app`, but `frontend/assets/js/config.js` calls `https://portfolio-production-fef5.up.railway.app`. The browser was blocking every fetch client-side before it left the page — backend and CORS were never the problem. Fixed the hostname in `vercel.json`. **Requires a Vercel redeploy to take effect** (CSP is an HTTP header, not picked up by CDN cache automatically).

### 2. Admin Experience section never had i18n wiring

Felipe reported the Experience nav menu "doesn't work and never translates to English". Root cause: the entire Experience section in `dashboard.html` (nav link, section title, "+ Nova experiência" button, table headers, "Carregando…" state) was added in an earlier session with hardcoded PT text and zero `data-i18n` attributes — unlike Projects/Skills, which had `data-i18n` on everything. Added `data-i18n` throughout and the corresponding PT/EN keys (`admin.nav.experience`, `admin.dashboard.experienceTitle`, `newExperience`, `colCompany`, `colRole`, `colPeriod`) to `i18n.js`.

Separately, Felipe reported "Carregando…" stuck forever on the public site and the admin "Nova experiência" button not opening its modal — these were symptoms of the admin `dashboard.js`/`admin-api.js` files from Phase 13 not yet being applied to his working tree (confirmed once he applied them).

### 3. Admin dynamic table text never re-translated on PT/EN toggle (found and fixed 3 times)

First occurrence: Projects/Skills/Experience admin table empty-states, error-states, "Sim"/"Não", "Editar"/"Excluir" were all hardcoded PT strings, and even after converting them to `i18n.t()`, they didn't update on language toggle because `i18n.apply()` never called the admin render functions (`renderProjectsTable`, `renderSkillsTable`, `renderExperiencesTable` — distinct from the public `render-projects.js`/`render-skills.js` functions despite similar names). Fixed by adding `admin.dashboard.yes`/`no`/`edit`/`delete`/`noProjects`/`noSkills`/`noExperiences`/`errorLoading*` i18n keys, converting all three admin tables to use them, and adding `window.renderProjectsTable`/`renderExperiencesTable` checks to `i18n.apply()` (skills already worked by name coincidence).

Second occurrence: the MFA status stat card ("Inactive/Inativo") had the same bug — `updateMfaStat()` fetched and rendered once on load, never re-invoked on language switch. Fixed by splitting it into `updateMfaStat()` (fetch + cache `mfaStatusCache`) and `renderMfaStat()` (pure re-render from cache), registering `renderMfaStat` with `i18n.apply()`. **This split-fetch-from-render pattern is now the required convention for any new dynamic translated content** — documented in CLAUDE.md.

### 4. Public Experience card: two full visual redesigns

**v1**: Added a company logo, moved from a flat period/role/company/description layout to a two-column card (period-left mono column, logo+name+description+"Ver empresa" button on the right), added a `company_url` CTA button using i18n. Added `logo_url` to the backend model/schema (validated as http/https like `company_url`) since it didn't exist before. **This requires a manual `ALTER TABLE experiences ADD COLUMN logo_url VARCHAR(500);` on the production Neon DB — no migration system is in active use, so `create_all()` will not add it.**

**v2**: Felipe supplied a detailed structural + typographic spec (dark 22%/78% split, centered logo-only left panel, bold company name + small period in a header row over a divider line, role/description/button below). Rebuilt `.experience-item` CSS and `render-experience.js`'s `buildExperienceItem()` to match — reused existing `--color-blueprint`/`--color-blueprint-soft` tokens (already used elsewhere for the always-dark admin sidebar) instead of inventing new colors. Kept the existing i18n key `experience.visitCompany` for the CTA button rather than introducing a duplicate key Felipe's spec suggested (`company.url_button`), since it was already wired everywhere (admin modal label association, `i18n.apply()`, etc.).

**v2 refinement**: Felipe reported the logo rendering "tiny" inside its panel. Cause: `.experience-item-logo` was fixed at 48×48px with padding — not a compression/attribute issue (no `width`/`height` HTML attributes were ever set on the `<img>`, only CSS). Changed to `width: 100%; height: 100%; object-fit: cover;` with no padding/border on the panel, so the logo fills the left column edge-to-edge.

### Files touched this phase

`frontend/vercel.json`, `frontend/assets/js/i18n.js`, `frontend/assets/css/style.css`, `frontend/assets/js/render-experience.js`, `frontend/painel-fg-2026x/dashboard.html`, `frontend/painel-fg-2026x/assets/js/dashboard.js`, `backend/app/models/experience.py`, `backend/app/schemas/experience.py`.

### Unresolved

* Felipe reported the admin `dashboard.js` "bugged" his Live Server preview once; worked around it by not applying the file; later reported it "desbugou" on its own with Experience now showing correctly. Console output was never shared, so the cause was never identified. Static review found no defect (all DOM IDs cross-checked against `dashboard.html`, no syntax errors, no script naming collisions on `dashboard.html`). Flagged in TODO.md as a watch item.
* Public Experience card visual design went through 2 full redesigns in one session based on iterative feedback — treat the current CSS/DOM as provisional, not final, until Felipe confirms.
* `logo_url` end-to-end (admin create → public render) is implemented but untested against a real database, since the column doesn't exist in production yet (see Priority 0 blocker in TODO.md).
* As in Phase 13, no live browser/backend/DB test was possible from this sandbox — every fix here was verified by Felipe manually after being handed complete files, then reported back if something was still wrong.

### Recommended next step

See "Next logical step" section at the bottom of TODO.md: confirm deployment (Vercel + Railway + Neon column) before doing any further feature work, then test `logo_url` end-to-end, then check with Felipe whether the current card visual design is final.



## Phase 15 — Session 2026-08-27: GitGuard security triage, 404 page polish, dashboard Experience stat card, MFA Security panel wired end-to-end

Continuation session, sandbox re-cloned fresh at start (`HEAD` = `ebf8eb5`, confirmed to only differ from `ed40975` by doc files — no Phase 13/14 code was actually committed to the repo despite prior changelog claiming it was delivered/confirmed). All fixes below were handed to Felipe as copy-paste file/section diffs, one at a time, per his explicit workflow request this session.

### 1. GitGuard security scan triage (10 findings, scan `cmt9kzdzp02ld10d7xlx25zsa`, commit `ed4097538f50`)

Cross-checked every finding against actual current code rather than applying blind fixes:

- `python-jose` CRITICAL/MEDIUM CVEs: **false positive** — package not in `requirements.txt` (already on `PyJWT`). No action.
- `avoid-sqlalchemy-text` HIGH: **false positive** — only `text()` usage is in `backend/add_description_en_column.py`/`add_mfa_columns.py`, one-off migration scripts with fully literal SQL (no interpolated user input). No action.
- DOM XSS x2 HIGH (njsscan): **false positive** — every `innerHTML` assignment in the frontend is either `= ""` (clear) or a hardcoded literal (SVG icon, i18n dict entry via `data-i18n-html` in `index.html`, not API/DB data). No action.
- `missing-integrity` x3 MEDIUM: SRI (`integrity=`) is not applicable to Google Fonts CSS (payload varies by User-Agent) or Cloudflare Turnstile's script (rotated server-side) — both vendors advise against it. Added `crossorigin` (the real applicable mitigation) to the Google Fonts `<link>` in `index.html`, `frontend/404.html`, `painel-fg-2026x/dashboard.html`, `painel-fg-2026x/login.html`.
- `dependabot-missing-cooldown` x2 MEDIUM: real, fixed — added `cooldown: { default-days: 7, semver-major-days: 14 }` to both ecosystems (`pip`, `github-actions`) in `.github/dependabot.yml`.
- Follow-up ad-hoc audit (not part of the GitGuard report) of `main.py`, `config.py`, `security.py`, `auth.py`, `turnstile.py`, `project.py`, `.env.example`: no new critical issues. One real fix applied — `turnstile.py`'s failure log was dumping the full Cloudflare `siteverify` response (`hostname`/`action`/`cdata`, not the secret); reduced to `error-codes` only.

### 2. `frontend/404.html` — brought to parity with the rest of the site

Built incrementally per Felipe's live feedback in one thread:
- Added the PT/EN lang-toggle button (self-contained inline script, does **not** load `i18n.js` — avoids `i18n.js`'s `apply()` unconditionally overwriting `document.title`/meta description with the homepage's, which would have broken the "404" page title). Persists to the same `localStorage.getItem("lang")` key as the rest of the site.
- Fixed `custom-cursor.js` script `src`: was `../assets/js/custom-cursor.js`, which from `frontend/404.html` escapes the `frontend/` directory entirely (silent 404). Corrected to `assets/js/custom-cursor.js`. This bug was invisible on `index.html` because `main.js` has the same cursor logic duplicated inline there — 404.html has no `main.js`, so it was the only page where the cursor was actually broken.
- Styled the lang-toggle buttons with a spinning rainbow ring (`conic-gradient` + `mask` XOR technique, `@property --notfound-angle` for smooth animation), transparent background/no border on both the wrapper and buttons per Felipe's spec.
- Darkened `.notfound-shell` background (`color-mix(in srgb, var(--color-blueprint) 80%, black)`) and added a glow/blur (`text-shadow` + slight `filter: blur()`) to `.notfound-code` (the "// ERRO 404" line), scoped via inline `<style>` in `404.html` only — none of this touches shared `style.css`.

### 3. Admin dashboard: 5th stat card for Experience count

`statTotalExperiences` added alongside the existing 4 (`statTotalProjects`/`statPublished`/`statTotalSkills`/`statMfaStatus`) in `dashboard.html`, wired in `updateStats()` (`dashboard.js`), and `loadExperiences()` now also calls `updateStats()` directly (it previously only updated `experiencesCache` and re-rendered the table — since it runs in parallel with `loadProjects()`/`loadSkills()` on `DOMContentLoaded`, the Experience count could sit blank until one of the other two loads finished and called `updateStats()` for it by coincidence). Added `admin.stat.experiences` i18n key (PT: "Experiências", EN: "Experience").

### 4. Admin dashboard: MFA "Security" panel wired end-to-end (was fully dead markup)

Felipe reported `#mfaStatusText` stuck permanently on "Checking status…" and the stat card showing "inactive" regardless of real state. Root cause: `dashboard.html` had complete markup for the Security card and MFA modal (`mfaStatusText`, `mfaEnableBtn`, `mfaDisableBtn`, `#mfaModalOverlay`/`Title`/`Body`/`Alert`) with **zero JS wiring** — only the stat card (`statMfaStatus`) was ever connected, via `updateMfaStat()`/`renderMfaStat()`. The backend (`GET /api/auth/mfa/status`) was never the problem.

Added to `admin-api.js`: `mfaSetupInit`, `mfaSetupConfirm`, `mfaDisable` (mirroring the existing `getMfaStatus` pattern, hitting `POST /api/auth/mfa/setup/init`, `POST /api/auth/mfa/setup/confirm`, `POST /api/auth/mfa/disable`).

Added to `dashboard.js`: `renderSecurityPanel()` (pure re-render from `mfaStatusCache`, follows the established split-fetch/render i18n convention, registered in `i18n.apply()`), `startMfaSetup()` (fetches QR/secret, builds the modal body via `document.createElement`/`textContent` — not `innerHTML` — for all server-supplied values, consistent with the project's no-innerHTML-for-API-data rule), `renderMfaBackupCodes()`, `startMfaDisable()`. `updateMfaStat()` now also calls `renderSecurityPanel()`.

**Bug found and fixed during this same delivery, before Felipe applied anything further**: the QR `<img>` `src` was set to `` `data:image/png;base64,${data.qr_code_base64}` ``, but the backend's `qr_code_base64` field already includes the full `data:image/png;base64,` prefix (`backend/app/services/mfa_service.py`) — this doubled the prefix, producing an invalid `data:` URL (`ERR_INVALID_URL` in console, generic broken-image icon shown). Fixed to `qr.src = data.qr_code_base64` directly. **Confirmed by Felipe after the fix: full flow (enable → scan → confirm → backup codes → disable) tested and working.**

Added i18n keys (PT+EN): `admin.security.enabled`, `disabled`, `checkError`, `scanQr`, `secretLabel`, `codePlaceholder`, `confirmBtn`, `backupCodesTitle`, `backupCodesDesc`, `doneBtn`, `disableCodePlaceholder`.

### Files touched this phase

`.github/dependabot.yml`, `frontend/index.html`, `frontend/404.html`, `frontend/painel-fg-2026x/dashboard.html`, `frontend/painel-fg-2026x/login.html`, `frontend/assets/js/i18n.js`, `frontend/painel-fg-2026x/assets/js/dashboard.js`, `frontend/painel-fg-2026x/assets/js/admin-api.js`, `backend/app/core/turnstile.py`.

### Unresolved / unconfirmed

- MFA flow confirmed working end-to-end by Felipe.
- As with every prior session, nothing here is confirmed applied to Felipe's real working tree until he pastes back a file or reports the symptom resolved — this session's own fresh clone proved that assumption has failed before.
- `logo_url` Neon column blocker (Phase 14) remains open and unconfirmed.

### Recommended next step

Fresh clone + diff against these docs before trusting anything is live (see TODO.md Priority 0). MFA flow already confirmed — get Felipe's confirmation on the `logo_url` Neon column next.
### 5. `resetDirty` ReferenceError fix + mobile spacing pass (2026-08-28)

**Bug:** `frontend/painel-fg-2026x/assets/js/dashboard.js` called `resetDirty()` at lines 154/286/663 (project/skill/experience forms) but never defined it — copy-paste gap vs. the older `frontend/assets/js/dashboard.js`, which has the real dirty-tracking implementation. Threw `Uncaught ReferenceError: resetDirty is not defined` on every `openProjectModal` call. Fixed by adding `dirtyForms`, `setupDirtyTracking()`, `resetDirty()` and wiring `setupDirtyTracking("project"|"skill"|"experience", formId)` right after `openModal`/`closeModal`.

**Mobile spacing/"zoom" fix**, admin dashboard + public site:
- Root cause of the admin dashboard "zoomed/missing content" complaint: the 3 `.admin-table` elements (Projects/Skills/Experience) had no scroll wrapper, so on mobile the table forced page width past the viewport and the browser auto-zoomed-out to fit, making everything look shrunk/cut off. Fixed by wrapping each `<table class="admin-table">` in `<div class="admin-table-wrap">` (`overflow-x: auto`) in `dashboard.html`, plus a new `.admin-table-wrap` rule in `admin.css`.
- Added `@media (max-width: 640px)` block to `admin.css`: loosens `.admin-main` padding, `.admin-stats` grid, `.admin-topbar`, `.admin-modal`, and makes `.form-row` stack instead of squeeze side-by-side.
- Added `@media (max-width: 640px)` block to `frontend/assets/css/style.css` (public site): more `.container` side padding, bigger gaps in `.about-grid`/`.contact-grid`/`.about-facts`/`.projects-grid`/`.social-links`, more spacing between stacked `.experience-item`s. Purely additive — no existing desktop rule touched.

### Files touched this phase

`frontend/painel-fg-2026x/assets/js/dashboard.js`, `frontend/painel-fg-2026x/dashboard.html`, `frontend/assets/css/admin.css`, `frontend/assets/css/style.css`.

### Unresolved / unconfirmed

- None of this is confirmed applied to Felipe's real working tree yet — delivered as find/replace blocks in chat this session, not committed. Same caveat as always: verify via fresh clone/diff, not by trusting this changelog (see TODO.md Priority 0).


## Phase 16 — Session 2026-08-28: Site-wide decorative pass + admin UX pass (toast, skeleton, confirm modal, dirty tracking, legal popup)

Delivered as a long sequence of copy-paste find/replace blocks in chat, one item at a time per Felipe's request. Confirmed-working status varies per item — see below.

### Public site decorative pass
- Project cards: 3D mouse-follow tilt on hover (`main.js`, `pointer: hover` gated).
- Scroll progress bar: added a pulsing "sonar" blip + expanding ring at the bar's leading edge (`style.css`, `::before`/`::after` on `.scroll-progress`, respects `prefers-reduced-motion`).
- Footer: added the same blueprint grid background used by the hero, anchored `center bottom` instead of `center top`.
- Tab title changes to "👋 Volta aqui!"/"👋 Come back!" on `visibilitychange` when the tab is hidden, restored exactly on return (`main.js`). **Bug found and fixed same session:** first version read `window.i18n`, which is `undefined` (`i18n.js` declares `const i18n` at top level of a classic script — `const`/`let` never attach to `window`, unlike `var`). Fixed to reference the bare `i18n` identifier.
- Login page (`login.html`): background changed to the same blueprint-grid + split BR/USA flag GIFs as the public hero, reusing the existing `.hero-flags`/`.hero-flag` classes with `.login-flags` on top, `.login-card`/`.login-topbar` at `z-index: 1`.
- Admin dashboard stat cards: static colored top bar replaced with a spinning BR/USA `conic-gradient` ring (oversized rotating plate behind an inset `::after` matching the card background — same technique reused for the new legal popup border on the public site). Added `--color-usa-blue` token to `variables.css`.
- Public contact form: new legal warning popup (`legal-popup.js`, new file) shown after client-side validation passes and before the WhatsApp submit proceeds — black background, glowing white justified body text, red "AVISO"/"WARNING" title, spinning BR/USA border (same conic-gradient technique as the stat cards, keyframe duplicated into `style.css` since `admin.css` isn't loaded on the public site), orange pill "Ok!" button. Text is pulled from `i18n.t("legal.warning")` at popup-open time, so it always matches whichever language button (PT/EN) the person last clicked. Mentions both legal action and permanent IP ban, per Felipe's spec.

### Admin dashboard UX pass
- `showGlobalAlert()` converted from a static top-of-page banner to a fixed-position corner toast (`.admin-toast`, slide+fade, auto-dismiss unchanged at 4s, `clearTimeout` guards against overlapping toasts).
- Added `renderTableSkeleton()`, called at the start of `loadProjects`/`loadSkills`/`loadExperiences` — tables now show pulsing skeleton rows instead of a blank body while the API call is in flight.
- Added a permanent MFA badge in the topbar (`#topbarMfaBadge`), updated by the same `updateMfaStat()`/`renderMfaStat()` pair that already drove the stat card — no duplicate fetch logic.
- Replaced all three native `window.confirm()` delete dialogs with a shared in-app `confirmAction()` modal (`#confirmModalOverlay`), fully i18n'd (new `admin.confirm.*` keys) — resolves a bug Felipe found where the delete confirmation text stayed Portuguese-only in EN mode.
- Added "unsaved changes" tracking (`dirtyForms`, `setupDirtyTracking()`, `resetDirty()`) per form (project/skill/experience): an orange dot appears next to the modal title on first edit, and closing the modal (× button) while dirty routes through `confirmAction()` instead of closing immediately.

### Bug found and fixed during delivery: `resetDirty is not defined`
First draft of the dirty-tracking block was handed over in a partial/out-of-order state relative to Felipe's actual file (which uses different function names than an earlier, unrelated `frontend/assets/js/dashboard.js` file this AI mistakenly cross-referenced from — see "orphan dashboard.js" note in Pending maintenance below). Root cause and full corrected file were only found after Felipe pasted his actual `dashboard.js`/`dashboard.html` back verbatim. **Lesson applied going forward: when a Find/Replace anchor repeatedly fails to match, stop guessing and request the real file content instead of re-issuing revised guesses.**

### Files touched this phase

`frontend/assets/js/main.js`, `frontend/assets/css/style.css`, `frontend/assets/css/variables.css`, `frontend/index.html`, `frontend/assets/js/legal-popup.js` (new), `frontend/painel-fg-2026x/login.html`, `frontend/painel-fg-2026x/assets/css/admin.css`, `frontend/painel-fg-2026x/dashboard.html`, `frontend/painel-fg-2026x/assets/js/dashboard.js`, `frontend/assets/js/i18n.js`.

### Confirmed vs. unconfirmed

- **Confirmed by Felipe, tested end-to-end**: the `resetDirty` fix and the full admin CRUD flow (create/edit/delete for project/skill/experience) after the corrected `dashboard.js` was applied.
- **Not explicitly re-confirmed after this phase's full decorative pass**: the legal popup on the public contact form, the login page flag background, the spinning stat-card border, the toast/skeleton/MFA-badge/confirm-modal visuals. Functionally wired and internally consistent, but get a live confirmation before assuming they're deployed correctly — same standing caveat as every prior phase (see TODO.md Priority 0).

### Recommended next step

Get Felipe's confirmation that this phase's files are pushed and live (frontend is static, so a Vercel deploy is the only requirement — no backend/DB changes this phase). Then return to the still-open Priority 0 items (Neon `logo_url` column, Railway `ALLOWED_HOSTS`/Turnstile confirmation).## 2026-08-30 — Chat widget backend + cleanup

**Added**
- `backend/app/models/conversation.py`, `backend/app/models/chat_message.py` — new tables `conversations`/`chat_messages`, created automatically by `Base.metadata.create_all()` on startup (no manual migration needed, unlike `experiences.logo_url`).
- `backend/app/schemas/chat.py`, `backend/app/services/chat_service.py`, `backend/app/api/routes/chat.py` — public visitor endpoints (`/api/chat/conversations`, `/api/chat/conversations/me/messages`) and admin endpoints (`/api/chat/admin/conversations[...]`), registered in `main.py`.
- Visitor identity: opaque server-issued token (`secrets.token_urlsafe(32)`), stored only as a SHA-256 hash (`token_hash`, same pattern as `RefreshToken`), sent by the client via `X-Visitor-Token` header. `main.py` CORS `allow_headers` updated to permit it; `allow_methods` gained `PATCH` for the status-update endpoint.
- Server-side cooldown (`CHAT_MESSAGE_COOLDOWN_SECONDS=3`) and a hard per-conversation message cap (`CHAT_MAX_MESSAGES_PER_CONVERSATION=500`) enforced in `chat_service.add_visitor_message`, independent of any client-side timer.
- Turnstile required only on conversation creation (`POST /api/chat/conversations`), not per message — see DECISIONS.md.
- New rate limits: `RATE_LIMIT_CHAT_START`, `RATE_LIMIT_CHAT_MESSAGE`, `RATE_LIMIT_CHAT_POLL` in `config.py` (all with safe defaults, no `.env` change required).
- Backend validated with a real SQLite boot + 16 functional assertions (cooldown, IDOR-safe 404 on wrong token, honeypot, control-char stripping, blocking, full admin login→reply→close flow). No regressions in existing routes.

**Fixed**
- `frontend/index.html`: `custom-cursor.js` was loaded via `../assets/js/custom-cursor.js`, resolving outside the project root (silent 404). Corrected to `assets/js/custom-cursor.js`.

**Removed (dead code, confirmed via grep — zero references in any `.html`)**
- `frontend/assets/js/admin-api.js`, `dashboard.js`, `login.js`, `frontend/assets/css/admin.css` — pre-`/painel-fg-2026x` rename leftovers. Current admin pages load their own local copies under `painel-fg-2026x/assets/`, which are newer (have MFA support; the old `login.js` even contained a broken, half-commented dead block).

**Files affected**: `backend/app/models/{conversation,chat_message,__init__}.py`, `backend/app/schemas/chat.py`, `backend/app/services/chat_service.py`, `backend/app/api/routes/chat.py`, `backend/app/core/config.py`, `backend/app/main.py`, `frontend/index.html`, 4 deleted files.

## 2026-08-31 — Chat admin panel: fixed triplicate own-message rendering + deep doc audit

**Fixed**
- `frontend/painel-fg-2026x/assets/js/dashboard.js`: removed a verbatim-duplicate block at the end of the file (a second `logoutBtn` click listener + a second `DOMContentLoaded` handler). The duplicate `DOMContentLoaded` block re-registered `setInterval(pollActiveChatConversation, 5000)`, so two independent polling loops ran concurrently against the shared `chatLastMessageId` cursor. Symptom reported by Felipe: his own outgoing chat messages appeared 3× in the admin thread view (screenshot: "bom dia" sent once, rendered 3 orange bubbles), while the visitor's own view and the backend both correctly had exactly one message. Root cause: 1 immediate render from the submit handler + 2 duplicate renders from the two racing poll timers = 3. File went from 992 to 972 lines. See DECISIONS.md for the new "exactly one `DOMContentLoaded` listener" convention this established.
- Confirmed (by code inspection, not by guessing) that `frontend/assets/js/chat-widget.js` (visitor side) does **not** have this bug — single `DOMContentLoaded` init, single poll timer guarded by an `opened` flag.
- Confirmed `backend/app/api/routes/chat.py` / `chat_service.py` insert exactly one row per send — the bug was purely a frontend rendering issue, no backend or data-integrity impact.

**Documentation audit (claude.md, Architecture.md, DECISIONS.md, TODO.md updated; README intentionally left untouched per Felipe's request)**
- Removed the stale, contradictory "Current Support Chat feature state" section from claude.md (WebSocket-based `support_conversations`/`support_service.py`/`ws_manager.py` design from 2026-08-29) — that design was superseded by the actual polling-based `conversations`/`chat_service.py` implementation before ever being built, and having both descriptions in the same file was actively confusing. Kept a one-line pointer to DECISIONS.md for why WebSocket was dropped.
- Updated claude.md/Architecture.md to reflect that the chat feature is now code-complete on **both** frontends (visitor widget + admin panel), not "backend only" — `dashboard.html`'s Chat nav section, `dashboard.js` chat logic, and `admin-api.js` chat methods all exist and match the backend routes.
- Flagged a doc/reality mismatch: CHANGELOG_AI.md's 2026-08-30 entry records `frontend/assets/js/dashboard.js` (the pre-rename orphan file) as deleted, but it's still present and still unreferenced in the 2026-08-31 clone — the deletion was apparently delivered as an instruction but never actually applied to Felipe's working tree. Logged in DECISIONS.md, claude.md, and TODO.md; not deleted on Felipe's behalf without confirmation.
- Noted that the repo's git history is now a single squashed commit (`0060043`, "Bugs fixed") — CHANGELOG_AI.md's phase narrative can no longer be cross-checked against `git log`.

**Not done**
- Did not touch `README.md` or `backend/README.md` — explicitly out of scope per Felipe's request.
- Did not delete the orphan `frontend/assets/js/dashboard.js` — flagged for Felipe to confirm/delete himself, per the project rule of not assuming sandbox edits reach his real working tree.

**Files affected**: `frontend/painel-fg-2026x/assets/js/dashboard.js` (fix delivered as an instruction, not yet applied by Felipe), `claude.md`, `Architecture.md`, `DECISIONS.md`, `TODO.md`.