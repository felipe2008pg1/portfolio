# TODO.md

## Priority 0 — Delivery verification (still the top risk)

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
- [ ] **Backend blocker (unresolved, carried over)**: `logo_url` column does not exist in the production Neon `experiences` table yet. Must be added manually: `ALTER TABLE experiences ADD COLUMN logo_url VARCHAR(500);`. No migration system in active use.

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

## Next logical step for the next session

1. Do a fresh clone and diff against what's documented here before assuming anything is applied — this has been wrong before (see Priority 0).
2. Get Felipe's confirmation on the `logo_url` Neon column (MFA Security panel already confirmed working, Priority 1b — closed).
3. Once confirmed, test Experience CRUD with a real logo image end-to-end.