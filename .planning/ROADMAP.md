# Roadmap: NKP Deshittifier

**Project:** NKP Deshittifier
**Generated:** 2026-05-18
**Phases:** 2
**Requirements mapped:** 10 / 10 ✓

---

## Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 1 | Messaging Enhancements | Thread pagination, search, and first-contact compose | MSGS-01–05 | 4 |
| 2 | Map Improvements | Tile de-emphasis, location search, reverse geocoding | MAP-01–05 | 4 |

---

### Phase 1: Messaging Enhancements
**Goal:** Users can paginate threads, search conversations, and initiate first contact with new users.
**Mode:** mvp
**Requirements:** MSGS-01, MSGS-02, MSGS-03, MSGS-04, MSGS-05

**Success Criteria:**
1. User scrolls to the top of any thread, taps "Load more", and older messages appear above the existing ones
2. User types in the inbox search bar and the thread list filters in real time by sender name
3. User opens a thread, activates in-thread search, types a word, and matching messages are highlighted or filtered
4. User views a profile with no prior thread, taps "OINK", the greeting sends, and the inbox refreshes showing the new thread

**Technical notes:**
- Thread pagination: `fetchThread` response likely has a cursor or offset param; hook extension in `useThread.ts`
- Inbox search: client-side filter over already-loaded `useInbox` data; no API call needed
- In-thread search: client-side filter over loaded `useThread` messages
- OINK first message: `sendOink(userID)` in `api.ts` already implemented; ProfileTab needs compose UI and post-send inbox refresh trigger
- ProfileTab currently calls `useInbox()` redundantly — resolve during compose work (lift thread lookup to App or pass down)

---

### Phase 2: Map Improvements
**Goal:** The map is visually focused on user positions, searchable by arbitrary location, and pins include reverse-geocoded place names.
**Mode:** mvp
**Requirements:** MAP-01, MAP-02, MAP-03, MAP-04, MAP-05

**Success Criteria:**
1. Opening the Map tab shows noticeably de-emphasized tiles (greyed/dimmed) with user pins dominating visually
2. Panning the map causes a "Search this location" button to appear; tapping it loads users centered on the new map position
3. Tapping a user's map pin opens a profile overlay with a "Get location" button visible
4. Tapping "Get location" shows a readable place name (e.g., "East Village, Manhattan, NY") in the overlay within ~2 seconds

**Technical notes:**
- Tile de-emphasis: CSS `filter: grayscale(60%) brightness(0.7)` on the tile layer pane (`div.leaflet-tile-pane`) is the simplest approach — no tile provider change needed
- "Search this location": listen to Leaflet `moveend` event, reveal button, on tap call `grid.refresh()` with `map.getCenter()` coordinates
- Reverse geocoding: `GET https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json` — requires `User-Agent` header; add `reverseGeocode(lat, lng)` to `api.ts`
- Profile overlay on pin tap already exists via `onViewProfile` callback; add "Get location" button that calls the new API function
- Nominatim rate limit: 1 req/sec — fine for a single-user bookmarklet

---

## Requirement Coverage

| Requirement | Phase | Description |
|-------------|-------|-------------|
| MSGS-01 | Phase 1 | Load more older messages in thread |
| MSGS-02 | Phase 1 | Filter inbox by sender name |
| MSGS-03 | Phase 1 | Search message text within thread |
| MSGS-04 | Phase 1 | Send OINK first contact from Profile |
| MSGS-05 | Phase 1 | Inbox auto-refresh after OINK sent |
| MAP-01  | Phase 2 | De-emphasize map base tiles |
| MAP-02  | Phase 2 | "Search this location" button on pan |
| MAP-03  | Phase 2 | Re-fetch grid at map center on tap |
| MAP-04  | Phase 2 | Profile overlay on pin tap with "Get location" |
| MAP-05  | Phase 2 | Reverse geocode via Nominatim |

**Coverage:** 10/10 ✓

---
*Roadmap created: 2026-05-18*
