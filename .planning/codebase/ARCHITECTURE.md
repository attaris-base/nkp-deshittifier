<!-- refreshed: 2026-05-18 -->
# Architecture

**Analysis Date:** 2026-05-18

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│               Bookmarklet (javascript: URL)                  │
│  injects <script src="bundle.js?t=TIMESTAMP">               │
└────────────────────────┬────────────────────────────────────┘
                         │ script load
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  main.tsx — Boot sequence                    │
│  domain check → page wipe → style injection → render(<App>) │
│  `src/main.tsx`                                              │
└────────────────────────┬────────────────────────────────────┘
                         │ render
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   App.tsx — Root State                       │
│  activeTab | selectedProfile | pendingThreadId | unreadCount │
│  `src/App.tsx`                                               │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ MessagesTab  │  NearbyTab   │  ProfileTab  │    MapTab      │
│`src/tabs/`   │`src/tabs/`   │`src/tabs/`   │`src/tabs/`     │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬─────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Hooks (Data Access Layer)                  │
│  useInbox  useThread  useGrid  useGeo  useProfile           │
│  `src/hooks/`                                                │
└────────────────────────┬────────────────────────────────────┘
                         │ fetch()  credentials:'include'
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   api.ts — HTTP Facade                       │
│  fetchMail | fetchThread | sendMessage | fetchOinkGrid |     │
│  fetchProfileData                                            │
│  `src/api.ts`                                                │
└────────────────────────┬────────────────────────────────────┘
                         │ same-origin credentials (cookies)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            nastykinkpigs.com JSON API                        │
│  /api/organized-chat.php   /mobile/oink/index.php           │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `main.tsx` | Domain guard, page wipe, style injection, mount | `src/main.tsx` |
| `App` | Global tab state, cross-tab routing, unread count | `src/App.tsx` |
| `MessagesTab` | Inbox list + ThreadView sub-views, compose bar | `src/tabs/MessagesTab.tsx` |
| `NearbyTab` | Geo-gated user grid with filters and load-more | `src/tabs/NearbyTab.tsx` |
| `ProfileTab` | Profile detail, photo gallery, Message CTA | `src/tabs/ProfileTab.tsx` |
| `MapTab` | Leaflet map with user pin markers and popups | `src/tabs/MapTab.tsx` |
| `TabBar` | Bottom navigation bar with unread badge | `src/components/TabBar.tsx` |
| `Avatar` | User avatar with optional ring color and badge | `src/components/Avatar.tsx` |
| `DopplerBadge` | Proximity term + color badge | `src/components/DopplerBadge.tsx` |
| `Spinner` | Loading state indicator | `src/components/Spinner.tsx` |
| `ErrorBanner` | Error display with optional retry button | `src/components/ErrorBanner.tsx` |
| `useInbox` | Fetches inbox, re-fetches on visibilitychange, computes unreadCount | `src/hooks/useInbox.ts` |
| `useThread` | Fetches thread, sends messages, CSRF retry on 403 | `src/hooks/useThread.ts` |
| `useGrid` | Fetches nearby grid, manages filters and pagination | `src/hooks/useGrid.ts` |
| `useGeo` | `navigator.geolocation` with module-scope cache | `src/hooks/useGeo.ts` |
| `useProfile` | Fetches profile by selected profile id | `src/hooks/useProfile.ts` |
| `api.ts` | All raw `fetch()` calls to nastykinkpigs.com | `src/api.ts` |
| `api.types.ts` | All TypeScript request/response types | `src/types/api.types.ts` |
| `styles/index.ts` | All CSS as exported string constant `STYLES` | `src/styles/index.ts` |

## Pattern Overview

**Overall:** Single-file IIFE bookmarklet with a layered Preact SPA. No router — tab state is managed by `App.tsx` via `useState`. Data access is entirely through hooks that wrap `api.ts` functions.

**Key Characteristics:**
- One output file (`dist/bundle.js`). CSS is a JS string to avoid Vite extracting a separate `.css` file in IIFE mode.
- Session cookies carry all auth — no token management needed. All API calls use `credentials: 'include'`.
- Cross-tab navigation (e.g. Profile → Messages with a thread) is done by lifting `pendingThreadId` state to `App` and passing callbacks down.
- The entire existing page is destroyed on boot (`document.documentElement.innerHTML = ...`). The SPA runs in a `position:fixed` overlay element (`#nkp-root`).

## Layers

**Boot Layer:**
- Purpose: Validate domain, destroy host page, inject styles, mount Preact tree
- Location: `src/main.tsx`
- Contains: Domain check logic, `showWrongDomainToast`, `boot()` function
- Depends on: `src/App.tsx`, `src/styles/index.ts`
- Used by: Bookmarklet script injection

**App / Routing Layer:**
- Purpose: Own global state; route between tabs; coordinate cross-tab transitions
- Location: `src/App.tsx`
- Contains: `activeTab`, `selectedProfile`, `pendingThreadId`, `unreadCount` state; `handleViewProfile`, `handleOpenThread`, `handleThreadOpened` callbacks
- Depends on: All tab components, `TabBar`
- Used by: `main.tsx`

**Tab Layer:**
- Purpose: Render each major feature pane; orchestrate hooks for that feature
- Location: `src/tabs/`
- Contains: `MessagesTab`, `NearbyTab`, `ProfileTab`, `MapTab`
- Depends on: `src/hooks/`, `src/components/`, `src/types/api.types.ts`
- Used by: `src/App.tsx`

**Hook Layer (Data Access):**
- Purpose: Encapsulate async state management for each data domain; call `api.ts` functions
- Location: `src/hooks/`
- Contains: `useInbox`, `useThread`, `useGrid`, `useGeo`, `useProfile`
- Depends on: `src/api.ts`, `src/types/api.types.ts`
- Used by: Tab components

**API Layer:**
- Purpose: All HTTP calls to nastykinkpigs.com; single source of truth for endpoints and headers
- Location: `src/api.ts`
- Contains: `fetchMail`, `fetchThread`, `sendMessage`, `fetchOinkGrid`, `fetchProfileData`
- Depends on: `src/types/api.types.ts`
- Used by: `src/hooks/`

**Type Layer:**
- Purpose: TypeScript interfaces and enums for all API request/response shapes
- Location: `src/types/api.types.ts`
- Contains: `CurrentMail`, `Thread`, `ThreadDetails`, `Message`, `Grid`, `Pig`, `Profile`, `OinkGridParams`, `ProfileQueryParams`, enums
- Depends on: nothing
- Used by: `src/api.ts`, `src/hooks/`, `src/tabs/`

**Component Layer:**
- Purpose: Reusable presentational components with no business logic
- Location: `src/components/`
- Contains: `TabBar`, `Avatar`, `DopplerBadge`, `Spinner`, `ErrorBanner`
- Depends on: `src/types/api.types.ts` (DopplerBadge only), `src/App.tsx` (TabBar imports `TabId`)
- Used by: Tab components

**Style Layer:**
- Purpose: Deliver all application CSS via a JS string to avoid Vite CSS extraction
- Location: `src/styles/index.ts`
- Contains: Single exported constant `STYLES` — all CSS for every component and tab
- Depends on: nothing
- Used by: `src/main.tsx`

## Data Flow

### Messages: Inbox to Thread

1. `MessagesTab` mounts, calls `useInbox()` (`src/hooks/useInbox.ts:12`)
2. `useInbox` calls `fetchMail()` (`src/api.ts:4`) → `GET /api/organized-chat.php?action=inbox`
3. `InboxView` renders thread list; user taps a row → `setActiveThreadId(t.thread_id)`
4. `ThreadView` renders, calls `useThread(threadId)` (`src/hooks/useThread.ts:12`)
5. `useThread` calls `fetchThread(id)` (`src/api.ts:34`) → `GET /api/organized-chat.php?action=thread&thread_id=`
6. User sends → `send(text)` calls `sendMessage(csrf, recipientId, text, threadId)` (`src/api.ts:64`)
7. On send success, `useThread` re-fetches the thread to surface the new message

### Cross-Tab: Profile → Messages

1. User taps a sender avatar in `MessagesTab` or a user card in `NearbyTab`
2. `onViewProfile({ id, lat, lng })` callback fires → `App.handleViewProfile` sets `selectedProfile` and switches `activeTab` to `'profile'` (`src/App.tsx:26`)
3. `ProfileTab` renders, `useProfile(selected)` fetches profile data
4. User taps "Message {nick}" → `ProfileTab` calls `onOpenThread(threadId)` → `App.handleOpenThread` sets `pendingThreadId` and switches to `'messages'` (`src/App.tsx:31`)
5. `MessagesTab` `useEffect` detects `pendingThreadId !== null` and calls `setActiveThreadId` (`src/tabs/MessagesTab.tsx:239`)
6. `App.handleThreadOpened` clears `pendingThreadId` (`src/App.tsx:36`)

### Nearby / Map: Geolocation → Grid

1. `NearbyTab` or `MapTab` mounts, calls `useGeo()` (`src/hooks/useGeo.ts:14`)
2. Module-scope `cached` variable checked first — avoids re-prompting across tab switches
3. On coords resolved, tab calls `grid.refresh()` which calls `useGrid.load(filters)` (`src/hooks/useGrid.ts:50`)
4. `useGrid` calls `fetchOinkGrid(params)` (`src/api.ts:113`) → `GET /mobile/oink/index.php?action=grid`
5. User selects filter → `grid.applyFilters(partial)` merges filters and calls `load(next)` (`src/hooks/useGrid.ts:80`)
6. User taps "Load more" → `grid.loadMore()` appends next page to `pages[]` (`src/hooks/useGrid.ts:63`)

**State Management:**
- All state is local Preact `useState` within hooks and tab components. No global store.
- `App.tsx` holds the only shared state: `activeTab`, `selectedProfile`, `pendingThreadId`, `unreadCount`. Everything else is owned by individual hooks.
- `useGeo` is the single exception: module-scope `cached` variable persists geolocation across hook re-mounts (`src/hooks/useGeo.ts:13`).
- `MapTab` uses a module-scope `leafletLoading` promise to guard against duplicate CDN injections (`src/tabs/MapTab.tsx:23`).

## Key Abstractions

**Hook Pattern (`use*`):**
- Purpose: Encapsulate async loading state (data/loading/error) for a single data domain
- Examples: `src/hooks/useInbox.ts`, `src/hooks/useThread.ts`, `src/hooks/useGrid.ts`
- Pattern: Each hook returns `{ data, loading, error, refresh, ...extras }`. Callers never call `api.ts` directly.

**SelectedProfile:**
- Purpose: Minimal cross-tab transfer object carrying enough context to fetch a profile
- Defined: `src/App.tsx:12` — `{ id: number; lat: number; lng: number }`
- Used by: `ProfileTab` props, `NearbyTab.onViewProfile`, `MessagesTab.onViewProfile`, `MapTab.onViewProfile`

**STYLES constant:**
- Purpose: Deliver all CSS through a JS string so the IIFE build stays one file
- Defined: `src/styles/index.ts:2`
- Used by: `src/main.tsx:25` — injected as a `<style>` element on boot

## Entry Points

**Bookmarklet Script Tag:**
- Triggers: User fires the bookmark on nastykinkpigs.com
- Behavior: Injects `<script src="bundle.js?t=TIMESTAMP">` into `document.head`
- Generated by: `scripts/gen-bookmarklet.mjs`

**`boot()` function:**
- Location: `src/main.tsx:9`
- Triggers: Script load completes (invoked at `src/main.tsx:63`)
- Responsibilities: Domain check → page wipe → style injection → `render(<App />, #nkp-root)`

**`App` component:**
- Location: `src/App.tsx:18`
- Triggers: `render(<App />, root)` in `main.tsx`
- Responsibilities: Mount tab layout, hold global state, render active tab

## Architectural Constraints

- **Single-file output:** The build produces one IIFE (`dist/bundle.js`). CSS must stay as a JS string in `src/styles/index.ts`. Never add `.css` imports in `src/` — Vite will extract them to a separate file and break the bookmarklet.
- **No router:** Tab navigation is plain `useState` in `App.tsx`. Do not introduce a routing library.
- **No global store:** State lives in hooks and `App`. Do not add Redux, Zustand, or any external state manager.
- **Global state (module-scope):** `useGeo.ts` uses a module-level `cached` variable; `MapTab.tsx` uses a module-level `leafletLoading` promise. These survive re-mounts but reset on full page reload.
- **Circular imports:** `TabBar` imports `TabId` from `App.tsx`. Avoid creating further cross-imports between `tabs/` and `components/`.
- **Bundle size:** Target is < 50 KB gzipped. Leaflet is loaded from CDN (`unpkg.com`) at runtime to stay under this limit — do not bundle it.
- **Threading:** Single-threaded browser event loop. All async work uses `async/await` with `fetch`.
- **Auth:** Session cookies only. `credentials: 'include'` is set on every fetch. The site must be open in the same browser profile for auth to work.

## Anti-Patterns

### Defining API calls outside `src/api.ts`

**What happens:** A tab or hook calls `fetch()` directly with its own headers and URL.
**Why it's wrong:** Duplicates the auth headers and endpoint strings; breaks the single-source-of-truth for the external API surface.
**Do this instead:** Add a new function to `src/api.ts` and import it in the relevant hook.

### Defining types outside `src/types/api.types.ts`

**What happens:** A component or hook declares its own interface for an API response shape.
**Why it's wrong:** Creates divergence between the canonical type and usage; makes refactoring harder.
**Do this instead:** Add all API shapes to `src/types/api.types.ts`.

### Adding `.css` files to `src/`

**What happens:** A new component is styled with an imported `.css` file.
**Why it's wrong:** Vite extracts it to `bundle.css` in IIFE mode. The bookmarklet only loads one file — the CSS is silently dropped.
**Do this instead:** Add component styles to the `STYLES` string in `src/styles/index.ts`.

### Calling `useInbox()` inside `ProfileTab` for cross-tab state

**What happens:** `ProfileTab` calls `useInbox()` to check for an existing thread before showing the Message button (`src/tabs/ProfileTab.tsx:17`).
**Why it's wrong:** This is a side-effect of the missing "open new thread" feature — it creates a second independent inbox fetch lifecycle. This is a known limitation.
**Do this instead:** Once new-thread compose is implemented, remove the `useInbox` call from `ProfileTab`.

## Error Handling

**Strategy:** Each hook owns its own `error` state string. Components render `<ErrorBanner message={error} onRetry={refresh} />` when `error` is non-null. Network errors from `fetch` are caught in hook `try/catch` blocks and stored as strings.

**Patterns:**
- `useInbox` detects `not-logged-in` state by checking that the API response is an object with a `threads` array; sets `error: 'not-logged-in'` — `MessagesTab` shows a login prompt for this specific value.
- `useThread.send` implements a single CSRF-retry: on `ok: false` or `csrf` in error string, it re-fetches the thread to get a fresh token and retries the send once (`src/hooks/useThread.ts:59`).
- `useProfile` checks `json?.ok` and sets `error: 'Profile not found'` if falsy (`src/hooks/useProfile.ts:19`).

## Cross-Cutting Concerns

**Logging:** `console.info` only at boot to log the git SHA (`src/main.tsx:32`). No structured logging elsewhere.
**Validation:** None — API responses are cast directly to typed interfaces. No runtime validation (e.g. Zod).
**Authentication:** Implicit via browser session cookies. `credentials: 'include'` on every `fetch`. No tokens, no headers. Not-logged-in state detected heuristically from API response shape in `useInbox`.

---

*Architecture analysis: 2026-05-18*
