# DECISIONS.md

## Experience as a first-class content type

The portfolio now models professional Experience separately from Projects and Skills. Experience has its own SQLAlchemy model, Pydantic schemas, service layer, FastAPI router, admin API methods, and admin dashboard section.

The API exposes public published experiences at `GET /api/experiences` and authenticated CRUD under the same resource. Ordering is controlled by `display_order`, then `id`.

## Database schema creation

Experience follows the project's existing database convention: `Base.metadata.create_all()` runs at backend startup. No dedicated Experience migration was found. This is acceptable for creating the new table, but future schema evolution should move toward versioned migrations.

## Frontend localization

Experience uses the same PT/EN i18n system as Projects and Skills. Public keys use the `experience.*` namespace; admin CRUD messages and labels use `admin.dashboard.*`. Dynamic database content remains untranslated by the generic DOM pass and must be rendered using the current language explicitly.

## Synchronization rule

The repository default branch and code supplied during AI sessions are not automatically synchronized — sandbox edits never reach Felipe's real working tree. Every fix in the 2026-08-26 session was delivered as complete copy-pasteable files and confirmed (or corrected) by Felipe through live manual testing, one round at a time. By the end of the session, Experience CRUD (public + admin) and its i18n were confirmed working; deployment of the final round of fixes (CSP, logo sizing, MFA reactivity) was not yet confirmed. Always re-verify with `git status`/`git diff` in the real working tree before assuming a previous session's delivered code is live.

## CSP and config.js must be updated together

`frontend/vercel.json`'s CSP `connect-src` directive hardcodes the backend hostname, independently of `frontend/assets/js/config.js`'s `API_BASE_URL`. A 2026-08-26 incident (stale CSP hostname after a Railway backend URL change) caused a full site outage that looked like a CORS/backend-down error in devtools but was neither — the browser blocked the fetch before it left the page. Decision: whenever the backend URL changes, both files must be updated in the same change, and the person must be reminded a Vercel redeploy is required (CSP is a static HTTP header, not picked up by CDN cache automatically).

## i18n reactivity: split fetch from render, register on window

Decision, established after the same bug (dynamic JS-rendered text not updating on PT/EN toggle, only on F5) recurred 3 times in one session across admin Projects/Skills/Experience tables and the MFA stat card: any function rendering translated dynamic content must be split into a fetch step (caches raw data/state in a module-level variable) and a pure render step (re-renders from cache using `i18n.t()`, no network call). The render step must be a top-level `function` declaration (which auto-attaches to `window` in a classic script) so `i18n.apply()` in `i18n.js` can detect and call it via `typeof window.fnName === "function"` on every language switch. This is now the required pattern for all future dynamic translated UI — see the hook list in `i18n.apply()`.

## Reused existing dark-navy color tokens for the Experience card, no new palette

The Experience card redesign (2026-08-26, two iterations) uses the pre-existing `--color-blueprint`/`--color-blueprint-soft`/`--color-border-on-blueprint`/`--color-text-on-blueprint*` tokens (previously only used for the always-dark admin sidebar) instead of introducing a new color palette, keeping the design system's token count from growing for a single component.

## Kept `experience.visitCompany` as the single CTA i18n key

Felipe's design spec for the "Visit company" button suggested a key like `company.url_button`. Decision: kept the existing `experience.visitCompany` key (already wired into the public card, the admin modal association, and `i18n.apply()`) instead of introducing a duplicate key for the same text, to avoid two sources of truth for one translated string.

## logo_url added without a migration system in place

`logo_url` was added to the `Experience` SQLAlchemy model and Pydantic schemas on 2026-08-26. Because the project has no active migration tooling (Alembic is installed but unused; the convention is startup `Base.metadata.create_all()`, which only creates missing tables, never alters existing ones), this column will not automatically appear in the production Neon `experiences` table. Decision: document the required manual `ALTER TABLE` as a hard blocker in TODO.md rather than attempt to work around it in code (e.g. no defensive "column may not exist" handling was added to the service/route layer — the correct fix is running the migration, not degrading the feature).