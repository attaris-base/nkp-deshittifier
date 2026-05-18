# NKP Deshittifier

## What This Is

A Preact bookmarklet SPA that replaces nastykinkpigs.com's broken native UI with a clean, fast,
mobile-first tabbed interface. The user fires it on any NKP page while logged in — it wipes the
page and mounts a full app that talks directly to the site's working JSON APIs using the browser's
existing session cookies. This milestone extends the messaging and map features significantly.

## Core Value

Users can find, message, and locate people near them — faster and more reliably than the native site.

## Requirements

### Validated

- ✓ Bookmarklet injector with domain guard — existing
- ✓ Full page replacement with dark/neon SPA (single IIFE bundle) — existing
- ✓ Messages tab: inbox list + thread view + reply compose — existing
- ✓ Nearby tab: geolocation + user grid with filters + load-more + profile navigation — existing
- ✓ Profile tab: profile detail, photo gallery, Message button — existing
- ✓ Map tab: Leaflet map with user pins, popups, profile navigation — existing
- ✓ CSRF retry on send failure — existing
- ✓ Session-cookie auth via `credentials: 'include'` — existing
- ✓ GitHub Pages CI/CD deploy — existing

### Active

- [ ] Load older messages in a thread via "Load more" button at the top of ThreadView
- [ ] Filter inbox list by sender name / username (client-side search)
- [ ] Search within an open thread for specific message text (client-side search)
- [ ] Send a first message to a user: quick OINK greeting path + investigate new-thread API (parent_id:"0" + fetchCSRF)
- [ ] De-emphasize map base tiles (CSS filter desaturation / opacity) so user pins pop
- [ ] "Search this location" button that appears when the map is panned, re-fetches the grid at the map center
- [ ] Reverse geocoding on user pins: in-profile-overlay button that resolves a readable place name via Nominatim

### Out of Scope

- Route drawing / turn-by-turn directions on map — deferred to next milestone
- Corridor search (users along a route) — deferred to next milestone
- Full inbox pagination (cursor-based load-more for thread list) — lower priority than thread pagination
- Polling / WebSocket push for new messages — future milestone
- `sendFirstMessage` via old `/compose.php` API with reCAPTCHA — blocked by captcha; `sendOink` path preferred

## Context

The codebase is in good shape. Key facts for this milestone:

**Messaging:**
- `fetchThread` response already contains `next_cursor`; thread pagination just needs the hook logic and UI.
- `sendOink` (`GET /greet_modal.php?sendto=ID`) is a working first-contact method — it sends a generic
  OINK greeting and is confirmed by checking the response HTML. This is the primary first-message path.
- `sendFirstMessage` uses the old `/compose.php` with FormData but requires a live reCAPTCHA token
  (currently hardcoded placeholder) — deprioritized.
- `fetchCSRF` (`GET /oc/api/oc-organize.php?action=csrf`) returns a fresh token; the open question is
  whether this token works with `sendMessage` + `parent_id:"0"` to start a new thread via the modern API.
- Both inbox and thread search will be client-side (data is already loaded into state).
- `ProfileTab` currently calls `useInbox()` to find an existing thread — this redundant fetch should be
  resolved as part of the first-message compose work.

**Map:**
- Leaflet is loaded from CDN at runtime (unpkg.com, v1.9.4) to stay under the 50 KB bundle limit.
- All map popup/marker HTML is built with a hand-rolled `esc()` function — safe for current use.
- Reverse geocoding: Nominatim (`https://nominatim.openstreetmap.org/reverse`) requires no API key;
  usage policy requires a `User-Agent` header and rate-limiting (1 req/sec). Suitable for single-user
  bookmarklet use.
- "Search this location" re-uses `fetchOinkGrid` with the map's current center coordinates.

## Constraints

- **Single file output**: IIFE bundle only. All styles in `src/styles/index.ts`. No `.css` files in `src/`.
- **No router**: Tab navigation is `useState` in `App.tsx`. Do not add a routing library.
- **No global store**: No Redux, Zustand, etc.
- **Bundle size**: < 50 KB gzipped. Leaflet stays on CDN.
- **No API keys**: Nominatim is key-free. Tile provider must be key-free or use a free tier with no key.
- **Browser target**: Chrome 108+, Firefox 110+, Safari 16+.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| `sendOink` as primary first-message path | Works today, no CSRF/reCAPTCHA issues | — Pending |
| Nominatim for reverse geocoding | Free, no API key, appropriate for single-user tool | — Pending |
| CSS filter approach for tile de-emphasis | No tile provider change needed; preserves existing OSM tiles | — Pending |
| Client-side search (inbox + thread) | Data is already in memory; no API cost or latency | — Pending |
| Investigate `sendMessage` + `parent_id:"0"` + `fetchCSRF` for new-thread API | Modern path preferred over old compose endpoint | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-18 after initialization*
