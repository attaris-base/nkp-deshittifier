# Requirements: NKP Deshittifier

**Defined:** 2026-05-18
**Core Value:** Users can find, message, and locate people near them — faster and more reliably than the native site.

## v1 Requirements

### Messages

- [ ] **MSGS-01**: User can tap "Load more" at the top of a thread to fetch older messages
- [ ] **MSGS-02**: User can filter the inbox list by typing a sender name or username
- [ ] **MSGS-03**: User can search message text within an open thread
- [ ] **MSGS-04**: User can send an OINK greeting to a user with no prior thread, from that user's Profile
- [ ] **MSGS-05**: Inbox auto-refreshes after OINK is sent so the new thread appears

### Map

- [ ] **MAP-01**: Map base tiles are visually de-emphasized (CSS desaturate/dim) so user pins stand out
- [ ] **MAP-02**: A "Search this location" button appears when the map center changes (pan or drag)
- [ ] **MAP-03**: Tapping "Search this location" re-fetches the nearby grid at the current map center
- [ ] **MAP-04**: Tapping a user's map pin shows a profile overlay with a "Get location" option
- [ ] **MAP-05**: "Get location" reverse-geocodes the pin's coordinates to a readable place name via Nominatim

## v2 Requirements

### Messages

- **MSGS-V2-01**: User can send a custom first message via new-thread API (requires confirming parent_id:"0" works with fetchCSRF token)
- **MSGS-V2-02**: Inbox supports cursor-based pagination (load more threads beyond the current 100-thread limit)
- **MSGS-V2-03**: New messages appear without manual refresh (polling or push)

### Map

- **MAP-V2-01**: User can draw a route on the map between two points (directions)
- **MAP-V2-02**: User can find nearby users along a drawn route (corridor search)

## Out of Scope

| Feature | Reason |
|---------|--------|
| `sendFirstMessage` via old `/compose.php` | Blocked by reCAPTCHA token requirement |
| Route drawing / directions | Deferred to next milestone |
| Corridor search (users along route) | Deferred to next milestone |
| Push / WebSocket new message notification | Future milestone |
| Test suite | Acknowledged debt; not blocking this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MSGS-01 | Phase 1 | Pending |
| MSGS-02 | Phase 1 | Pending |
| MSGS-03 | Phase 1 | Pending |
| MSGS-04 | Phase 1 | Pending |
| MSGS-05 | Phase 1 | Pending |
| MAP-01 | Phase 2 | Pending |
| MAP-02 | Phase 2 | Pending |
| MAP-03 | Phase 2 | Pending |
| MAP-04 | Phase 2 | Pending |
| MAP-05 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-18*
*Last updated: 2026-05-18 after initial definition*
