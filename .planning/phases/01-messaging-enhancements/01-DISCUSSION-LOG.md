# Phase 1: Messaging Enhancements - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 1-messaging-enhancements
**Areas discussed:** In-thread search UX, OINK post-send flow, Load more exhaustion state, Inbox search scope

---

## In-thread search UX

| Option | Description | Selected |
|--------|-------------|----------|
| Filter — hide non-matching | Only matching messages stay visible | |
| Highlight — keep all, mark matches | All messages visible, matches emphasized | |
| You decide | Leave to implementer | |
| N/A — no in-thread search | Freeform: user clarified scope | ✓ |

**User's choice:** Free text — "There will be no in-thread search functionality. The search functionality searches through all message threads."
**Notes:** Significant scope pivot. Search is inbox-level only (across thread list), not within individual thread views. This unified MSGS-02 and MSGS-03 into a single feature.

---

## Search: what fields does it cover?

| Option | Description | Selected |
|--------|-------------|----------|
| Sender name + message preview | Both fields from fetchMail response | |
| Sender name only | Simpler, predictable | |
| All text fields | Name + preview + subject | |
| Server-side API (all fields) | Freeform: user revealed searchMessages was added | ✓ |

**User's choice:** Free text — user disclosed that `searchMessages` was already added to `api.ts` and `api.types.ts`. Searches sender name, subject, and message content server-side. "We'll build the search functionality off this."
**Notes:** Search is server-side via `GET /api/organized-chat.php?action=search&q=query`, not client-side filtering. This overrides the client-side approach documented in PROJECT.md.

---

## Search bar placement

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent bar at top of inbox | Always visible, no tap required | ✓ |
| Tap to reveal (collapsed by default) | Search icon in header, expands on tap | |
| You decide | Leave to implementer | |

**User's choice:** Persistent bar at top of inbox
**Notes:** None.

---

## OINK post-send: where does user land?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay on Profile — show success state | Button changes, inbox refreshes in background | ✓ |
| Navigate to Messages tab | App switches tabs automatically | |

**User's choice:** Stay on Profile — show success state
**Notes:** None.

---

## OINK success state appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Button text changes to 'OINK sent ✓' | Label swap, button disabled | ✓ |
| Toast notification + button stays | Brief toast, button resets | |
| You decide | Leave to implementer | |

**User's choice:** Button text changes to "OINK sent ✓" (disabled)
**Notes:** User specified the exact label text.

---

## OINK failure state

| Option | Description | Selected |
|--------|-------------|----------|
| Button shows 'OINK failed — retry' | Inline error in button, re-tappable | ✓ |
| ErrorBanner below the button | Uses ErrorBanner component, button resets | |
| You decide | Leave to implementer | |

**User's choice:** Button shows "OINK failed — retry" inline
**Notes:** User specified the exact label text.

---

## Load more: exhaustion state

| Option | Description | Selected |
|--------|-------------|----------|
| Button disappears | Clean, no button when nothing to load | |
| Button replaced by 'Start of conversation' | Non-interactive label | |
| Button stays but is disabled | Same position, greyed out | ✓ |

**User's choice:** Button stays but is disabled
**Notes:** None.

---

## Load more: placement in view

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed at top, above messages | Always accessible | |
| Inline at top of message list | Scrolls with messages | |
| Inline at bottom of inbox thread list | Freeform: user corrected scope | ✓ |

**User's choice:** Free text — "Load more messages doesn't appear in the thread view — all messages should appear at once in the thread view — but rather should appear in the list of message threads (the 'inbox')."
**Notes:** Major scope correction. "Load more" is inbox thread list pagination (more threads), not per-thread message pagination. MSGS-01 was re-scoped in this answer.

---

## Claude's Discretion

- Debounce timing and minimum character threshold for search input
- Whether `searchMessages` results replace or filter the inbox thread list
- Resolution of the redundant `useInbox()` call in `ProfileTab`

## Deferred Ideas

- **In-thread message text search** — searching within an open conversation. Out of scope; deferred to a future phase.
- **Thread-level message pagination** — loading older messages within one conversation (original MSGS-01 intent). Deferred.
- **`sendFirstMessage` custom text** — blocked by reCAPTCHA. Deferred indefinitely.
