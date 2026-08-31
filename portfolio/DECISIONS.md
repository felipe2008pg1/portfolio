## Chat widget: polling instead of WebSocket

**Decision:** Real-time updates via polling (visitor every 4s, admin every 5s), not WebSocket.

**Reason:** No WebSocket infrastructure exists anywhere in the project. The backend does run as a persistent Uvicorn process on Railway (so WebSocket would be technically viable), but for a portfolio-scale chat the UX gain doesn't justify adding connection lifecycle, reconnection, and backpressure handling that don't exist in the codebase today.

**Consequences:** Up to ~4s perceived latency on new messages. Revisit if the site ever needs sub-second delivery (e.g. a live-support SLA) — see TODO.md.

---

## Chat visitor identity: opaque server-issued token, not real auth

**Decision:** Visitors are identified by a random token generated server-side (`secrets.token_urlsafe(32)`), returned once, stored client-side in `localStorage`, and sent back via the `X-Visitor-Token` header. Only its SHA-256 hash is persisted (`Conversation.token_hash`), mirroring `RefreshToken.token_hash`.

**Reason:** The public site has no visitor accounts. This is the minimum mechanism to correlate a visitor's messages across page reloads without inventing a login system for anonymous chat.

**Consequences:** Clearing `localStorage` (or using a different browser/device) makes the visitor "new" to the system — there is no way to recover history without real authentication. This was called out explicitly and accepted as a known limitation, not a bug.

---

## Chat abuse controls: Turnstile only on conversation start, cooldown enforced server-side

**Decision:** Turnstile is required once, when a conversation is created. Individual messages are protected by a 3-second server-side cooldown plus IP-based rate limits, not by Turnstile per message.

**Reason:** Turnstile tokens are single-use and short-lived; requiring one per message would break the chat UX for no real security gain once a conversation is already open and rate-limited. The cooldown is enforced in `chat_service.add_visitor_message` using the DB row's `last_visitor_message_at`, so a client that skips the JS-side timer and calls the API directly still gets rejected (429).

**Consequences:** A verified visitor could still spam within the 3s/rate-limit bounds; `CHAT_MAX_MESSAGES_PER_CONVERSATION` (500) caps worst-case storage abuse per token.

---

## Removed duplicate admin frontend files (frontend/assets/js/admin-api.js, dashboard.js, login.js, frontend/assets/css/admin.css)

**Decision:** Deleted.

**Reason:** Confirmed via `grep` across every `.html` file that nothing references these paths anymore; `painel-fg-2026x/dashboard.html` and `login.html` load their own local copies (`painel-fg-2026x/assets/js/*`), which are the current versions (they include MFA support the deleted ones lack). Leftover from the `/admin` → `/painel-fg-2026x` rename recorded in an earlier CHANGELOG_AI.md entry.

**Consequences:** None expected — verified zero references before deleting. If something breaks, `git revert` the deletion commit.

**Update 2026-08-31**: `frontend/assets/js/dashboard.js` was found still present in a fresh clone, unreferenced by any HTML file (re-confirmed via `grep`). The deletion described above was apparently never actually applied to Felipe's real working tree/repo, only delivered as an instruction — same "docs vs. real tree" gap called out in claude.md's "Repo/chat sync reality" section. The decision itself stands (delete it); it just hasn't landed yet.

---

## Admin dashboard.js: exactly one `DOMContentLoaded` listener

**Decision:** All admin dashboard startup code (initial data loads, interval registration, one-time event bindings tied to page load) must live in a single `document.addEventListener("DOMContentLoaded", ...)` block per file, not appended as a second block later in the file.

**Reason:** `painel-fg-2026x/assets/js/dashboard.js` had accumulated a second, verbatim-duplicate `DOMContentLoaded` block (plus a duplicate `logoutBtn` listener) at the end of the file — almost certainly from a copy/paste of an earlier version of the file's tail being appended instead of replacing it. Because the block called `setInterval(pollActiveChatConversation, 5000)`, this silently started two competing polling loops sharing the same `chatLastMessageId` cursor, which caused the admin's own outgoing chat messages to render three times (one immediate render from the submit handler, plus one duplicate render from each of the two poll timers racing to fetch the same new message). Found by inspection — two identical blocks are trivial to spot with `grep -n "DOMContentLoaded"` once suspected, but there's no automated check for it today.

**Consequences:** Fixed by deleting the duplicate block (file: 992 → 972 lines). No test currently guards against this regressing. Consider it whenever `dashboard.js` grows a new "add setup code at the end of the file" edit — check `grep -c "DOMContentLoaded" dashboard.js` returns `1` before shipping.