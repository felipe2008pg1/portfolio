# TODO.md

## Priority 0 — Delivery verification (still the top risk)

- [ ] **Confirm every file delivered in the 2026-08-26 session is actually applied in Felipe's real working tree and deployed.** This session was worked from a fresh sandbox clone; all fixes were handed to Felipe as copy-pasteable files in chat, one round at a time, as he found bugs through manual testing. Files touched this session (verify each is current):
  - `frontend/vercel.json` (CSP fix — **requires a Vercel redeploy**, CDN does not pick up header changes automatically)
  - `frontend/assets/js/i18n.js`
  - `frontend/assets/js/api.js`
  - `frontend/assets/js/render-experience.js`
  - `frontend/assets/css/style.css`
  - `frontend/painel-fg-2026x/dashboard.html`
  - `frontend/painel-fg-2026x/assets/js/dashboard.js`
  - `frontend/painel-fg-2026x/assets/js/admin-api.js`
  - `backend/app/models/experience.py`
  - `backend/app/schemas/experience.py`
- [ ] **Backend blocker**: `logo_url` column does not exist in the production Neon `experiences` table yet. Must be added manually before the updated backend is deployed: `ALTER TABLE experiences ADD COLUMN logo_url VARCHAR(500);`. There is no migration system in active use (Alembic installed but unused) — `Base.metadata.create_all()` will NOT add this column to an existing table.

## Priority 1 — Experience feature: functionally complete, visually still moving

- [x] Public Experience rendering (`render-experience.js`) — implemented and confirmed working by the user (index.html no longer stuck on "Carregando").
- [x] Admin Experience CRUD (list/create/edit/delete, `logo_url` field, published flag, display_order) — implemented in `dashboard.js`/`admin-api.js`.
- [x] Admin nav link, section title, table headers, buttons, empty/error/loading states — all converted from hardcoded PT to `data-i18n`/`i18n.t()`. Root cause was: the Experience section markup was added to `dashboard.html` in an earlier session without `data-i18n` attributes, unlike Projects/Skills.
- [x] Admin dynamic table re-render on language switch (PT/EN toggle without F5) — was missing for admin tables and the MFA stat card; fixed by adding `window.renderProjectsTable`/`renderExperiencesTable`/`renderMfaStat` hooks to `i18n.apply()`. **This class of bug (dynamic JS-rendered text not re-rendering on language toggle) has now been found and fixed 3 times this session — see the "Reactivity convention" note in CLAUDE.md before adding any new dynamic admin/public text.**
- [ ] **Public Experience card visual design is not final.** It went through 2 full redesigns this session based on live user feedback (current state documented in CLAUDE.md under "Current public Experience card layout"). Do not assume the current CSS/DOM structure is the last word — re-confirm with Felipe if touching this component again.
- [ ] `logo_url` backend field exists but cannot be exercised end-to-end until the Priority 0 DB column blocker above is resolved.

## Priority 2 — Mystery/unresolved from this session

- [ ] Felipe reported the admin `dashboard.js` (Experience CRUD version) "bugged" his local Live Server preview once, worked around it by not applying that file, then later reported it "desbugou" (un-bugged itself) with Experience now showing correctly — without ever sharing the console error. Root cause was never identified (static review of the file found no defect: all DOM IDs cross-checked against `dashboard.html`, no syntax errors, no naming collisions on that page). If a similar "page breaks only in Live Server, not in production" report recurs, get the actual browser console output before guessing — likely candidates to check first: local backend not running on `127.0.0.1:8000` (Live Server's `config.js` branch) causing cascading fetch failures, or a stale cached copy of an old script.

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

- [ ] Confirm Railway `ALLOWED_HOSTS` includes the real production backend hostname (TrustedHostMiddleware was enabled in an earlier session; not re-verified this session).
- [ ] Review/remove the Turnstile diagnostic log that records the Cloudflare response.
- [ ] Confirm the production Turnstile secret and hostname configuration in Railway/Cloudflare.
- [ ] Confirm the admin password was changed after the earlier accidental plaintext exposure.
- [ ] If server-side URL fetching is ever introduced, harden public URL validation against RFC1918, link-local, IPv6 private ranges, and DNS rebinding.
- [ ] `logo_url`/`company_url` validation only checks the URL starts with `http://`/`https://` — same as existing fields, no new risk introduced, but worth remembering these render as `<img src>`/`<a href>` on the public site with no server-side fetch, so SSRF is not a concern here (client-side only).

## Next logical step for the next session

1. Get Felipe's confirmation that all Priority 0 files are applied and deployed (both Vercel frontend redeploy and Railway backend redeploy), and that the `logo_url` column was added to Neon.
2. Once confirmed, do a full pass testing Experience CRUD with a real logo image end-to-end (upload a `logo_url`, verify it renders correctly in both admin table and public card, verify fallback initial shows when `logo_url` is empty or broken).
3. Ask Felipe if the current Experience card visual design is considered final, or if more iteration is expected, before doing any further unrelated work.