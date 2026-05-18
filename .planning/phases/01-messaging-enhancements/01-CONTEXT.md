# Phase 1: Messaging Enhancements - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Inbox search (server-side via `searchMessages`), inbox thread list pagination (via `next_cursor`), and OINK first-contact from the Profile tab.

**Scope corrections from initial roadmap:**
- MSGS-01 re-scoped: "Load more" is inbox thread list pagination, NOT per-thread message pagination. All messages within a thread still load at once.
- MSGS-02 + MSGS-03 unified: a single `searchMessages` server-side API replaces both the planned client-side inbox filter and the planned in-thread text search. There is one search feature total.

</domain>

<decisions>
## Implementation Decisions

### Search (covers MSGS-02 + MSGS-03 unified)
- **D-01:** Search is server-side via `searchMessages(query)` — already added to `src/api.ts` (working tree, not yet committed). Hits `GET /api/organized-chat.php?action=search&q={query}`. Do NOT implement client-side filtering.
- **D-02:** Search bar is a persistent field at the top of the inbox view — always visible, never collapsed behind an icon.
- **D-03:** Search covers sender name, subject, and message content simultaneously — the API handles all three fields. No UI toggle between search modes.
- **D-04:** In-thread text search is explicitly deferred — search operates at inbox level only.

### Inbox Thread List Pagination (MSGS-01 re-scoped)
- **D-05:** "Load more" loads additional threads in the inbox list — NOT older messages within a thread.
- **D-06:** `CurrentMail.next_cursor` is already typed — pass it back to `fetchMail` (or a new `fetchMoreMail` call) to append the next page of threads to the existing list.
- **D-07:** The "Load more" button appears inline at the bottom of the inbox thread list (scrolls with content).
- **D-08:** When `next_cursor` is exhausted (no more threads): button stays visible but is disabled. It does not disappear or show a label change.

### OINK First Contact (MSGS-04 + MSGS-05)
- **D-09:** After `sendOink()` succeeds: user stays on the Profile tab. Button text changes to "OINK sent ✓" and is disabled.
- **D-10:** After `sendOink()` fails (returns false): button text changes to "OINK failed — retry" (inline, in the button itself). Tapping retries.
- **D-11:** After a successful OINK, `useInbox.refresh()` is called in the background so the new thread appears when the user next visits Messages. No navigation away from Profile.

### Claude's Discretion
- Debounce timing and minimum character threshold for the search input — standard UX (300ms debounce, min 2 chars) is fine.
- Whether `searchMessages` replaces the inbox thread list while active, or runs alongside it — implementer decides based on what the API response shape enables.
- How to resolve the redundant `useInbox()` call currently inside `ProfileTab` — lift thread-lookup to App or remove entirely, whichever fits the OINK compose changes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning docs
- `.planning/ROADMAP.md` — Phase 1 goals, success criteria, technical notes (note: scope corrections in D-05 above override thread-pagination references)
- `.planning/REQUIREMENTS.md` — MSGS-01 through MSGS-05 requirement definitions
- `.planning/PROJECT.md` — Key Decisions table, constraints, existing API context

### Source files (read before planning — working tree state)
- `src/api.ts` — All API functions including `searchMessages` (uncommitted, working tree) and `sendOink`
- `src/types/api.types.ts` — `CurrentMail.next_cursor`, `ThreadDetails`, `Message` types
- `src/hooks/useInbox.ts` — `refresh()` available; needs `next_cursor` extension for pagination
- `src/hooks/useThread.ts` — No changes needed for this phase (all messages load at once)
- `src/tabs/MessagesTab.tsx` — Inbox view and thread view; search bar and Load more button land here
- `src/tabs/ProfileTab.tsx` — OINK button, success/failure states, redundant `useInbox()` to resolve

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sendOink(userID)` in `src/api.ts` — complete implementation, returns `true`/`false` based on HTML response string matching
- `searchMessages(query)` in `src/api.ts` (working tree) — server-side search endpoint, response type needs to be confirmed/typed
- `CurrentMail.next_cursor: string` in `src/types/api.types.ts` — already typed, ready to use for inbox pagination
- `useInbox.refresh()` — callable after OINK for inbox sync without full re-mount
- `ErrorBanner` component — `role="alert"`, reusable for any async error surface

### Established Patterns
- Hooks return `{ ...state, refresh, send }` — `useInbox` extension for pagination should follow this pattern (e.g., add `loadMore` action)
- API functions live in `src/api.ts` only — no inline fetches in components or hooks
- All styles in `src/styles/index.ts` as string constant — any new UI for search bar, disabled button states, etc. goes there

### Integration Points
- `MessagesTab.tsx` owns the inbox list — search bar and Load more button integrate here
- `ProfileTab.tsx` — OINK button and success/failure state integrate here; redundant `useInbox()` call needs cleanup during this work
- `App.tsx` `unreadCount` driven by `useInbox` — inbox refresh after OINK will update the badge automatically via the existing pattern

</code_context>

<specifics>
## Specific Ideas

- Button label for OINK states: "OINK sent ✓" (success, disabled) and "OINK failed — retry" (failure, re-tappable) — user specified these exact labels
- Search bar: persistent bar, not a collapsible icon — user specified this layout
- Load more: disabled-not-hidden when exhausted — user specified this behavior

</specifics>

<deferred>
## Deferred Ideas

- **In-thread message text search** — searching within a specific open conversation's messages. User confirmed this is out of scope; inbox-level search only for this phase.
- **Thread-level message pagination** — loading older messages within a single conversation (the original MSGS-01 interpretation). Deferred; all thread messages load at once for now.
- **`sendFirstMessage` custom text path** — blocked by reCAPTCHA token requirement. OINK-only for first contact.

</deferred>

---

*Phase: 1-Messaging Enhancements*
*Context gathered: 2026-05-18*
