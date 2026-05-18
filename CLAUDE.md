# NKP Deshittifier — Project Guide

## What this is

A bookmarklet that replaces nastykinkpigs.com's broken UI with a clean, self-contained tabbed SPA. The user fires it on any page of the site while logged in. It replaces the entire page and mounts a Preact app that talks directly to the site's working JSON API endpoints using the browser's existing session cookies.

Hosted on GitHub Pages. Built with Preact + Vite + TypeScript → single IIFE bundle.

---

## Dev commands

```bash
npm install          # first time setup
npm run dev          # build in watch mode (rebuilds on every save)
npm run preview      # serve dist/ at http://localhost:5173
npm run build        # production build → dist/bundle.js
npm run check        # lint + format (writes fixes) — run before committing
npm run lint         # lint only (no writes)
npm run format       # format only (writes)
node scripts/gen-bookmarklet.mjs          # print production bookmarklet URL
node scripts/gen-bookmarklet.mjs --dev    # print localhost:5173 bookmarklet URL
```

**Dev workflow:** run `npm run dev` in one terminal, `npm run preview` in another, grab the dev bookmarklet URL and install it as a bookmark, then fire it on nastykinkpigs.com.

**Before committing:** run `npm run check` — it formats and lints in one pass, writing all safe fixes automatically.

**Deploy:** push to `main` → GitHub Actions builds and deploys `dist/` to the `gh-pages` branch automatically. Bundle size target: < 50 KB gzipped.

---

## Linting & formatting (Biome)

Biome 2.x (`@biomejs/biome`) is the single tool for both formatting and linting. Config lives in `biome.json` at the repo root.

**Style enforced:**
- 2-space indent, LF line endings, 100-char line width
- Single quotes in JS/TS, double quotes in JSX attributes
- No semicolons (`"asNeeded"`)
- Trailing commas in JS/TS

**Key rules enabled on top of `recommended`:**
- `noUnusedVariables` / `noUnusedImports` → error
- `noDebugger` → error
- `useConst` → error
- `useButtonType` (a11y) → error — all `<button>` elements must have an explicit `type=`
- `useSemanticElements` (a11y) → error — use `<button>` instead of `<div role="button">`

**Ignored paths:** `node_modules/`, `dist/`, `install/` (plain HTML, no framework).

---

## Architecture

```
Bookmarklet (javascript: URL)
  └── injects <script src="bundle.js?t=TIMESTAMP">
        └── main.tsx runs:
              if hostname ∉ {nastykinkpigs.com, localhost, 127.0.0.1}
                → toast "only works on nastykinkpigs.com" → stop
              else
                → document.documentElement.innerHTML = '<head>...</head><body></body>'
                → inject <style> with all CSS
                → render(<App />, #nkp-root)
```

`App.tsx` owns global state: `activeTab`, `selectedProfile`, `pendingThreadId`, `unreadCount`. Tab navigation and cross-tab transitions (e.g. tapping a profile from Nearby → Profile tab) are driven by callbacks passed down from App.

---

## Critical build constraint — CSS must be a JS string

Vite extracts CSS into a separate `.css` file in lib/IIFE mode. A bookmarklet can only load one file. **All styles live in `src/styles/index.ts` as an exported string constant `STYLES`.** `main.tsx` injects it via `document.createElement('style')`. Never add `.css` files to `src/` — they will silently break the build.

---

## File map

| File | Role |
|---|---|
| `src/main.tsx` | Entry point: domain check, page wipe, style injection, `render(<App />)` |
| `src/App.tsx` | Root component: tab state, profile routing, unread badge count |
| `src/api.ts` | All API calls (`fetchMail`, `fetchThread`, `sendMessage`, `fetchOinkGrid`, `fetchProfileData`). All use `credentials: 'include'` — session cookies handle auth automatically. Do not duplicate these functions. |
| `src/types/api.types.ts` | All request/response TypeScript types. Do not redefine types elsewhere. |
| `src/styles/index.ts` | **All CSS** as exported string constant `STYLES`. Add new component styles here. |
| `src/hooks/useInbox.ts` | Wraps `fetchMail()`, re-fetches on `visibilitychange`, detects not-logged-in |
| `src/hooks/useThread.ts` | Fetches thread by ID, sends messages, CSRF retry on 403 |
| `src/hooks/useGeo.ts` | `navigator.geolocation` with module-scope cache (persists across tab switches) |
| `src/hooks/useGrid.ts` | Wraps `fetchOinkGrid()`, filter state, pagination |
| `src/hooks/useProfile.ts` | Wraps `fetchProfileData()`, keyed by selected profile ID |
| `src/tabs/MessagesTab.tsx` | InboxView + ThreadView sub-components, compose bar |
| `src/tabs/NearbyTab.tsx` | Filter bar, user cards with heat badges, load-more |
| `src/tabs/ProfileTab.tsx` | Profile detail, photo gallery, Message button |
| `src/components/` | TabBar, Avatar, DopplerBadge, Spinner, ErrorBanner |
| `install/index.html` | Standalone GitHub Pages install page (no Vite, no framework). Detects mobile vs desktop and shows appropriate install flow. |
| `scripts/gen-bookmarklet.mjs` | Prints bookmarklet URL to terminal (`--dev` for localhost) |
| `.github/workflows/deploy.yml` | CI/CD: build on push, deploy `dist/` to `gh-pages` on `main` |
| `vite.config.ts` | IIFE lib build, `publicDir: 'install'`, defines `__GIT_SHA__` and `__BUNDLE_URL__` |

---

## API endpoints

All calls use `credentials: 'include'`. Functions already exist in `src/api.ts` — use them, don't re-implement.

| Feature | Function | Endpoint |
|---|---|---|
| Inbox | `fetchMail()` | `GET /api/organized-chat.php?action=inbox` |
| Thread | `fetchThread(thread_id)` | `GET /api/organized-chat.php?action=thread&thread_id=` |
| Send message | `sendMessage(csrf, recipient_id, text, thread_id)` | `POST /api/organized-chat.php` |
| Nearby grid | `fetchOinkGrid({lat, lng, radius, window, position, page})` | `GET /mobile/oink/index.php?action=grid` |
| Profile | `fetchProfileData({id, lat, lng})` | `GET /mobile/oink/index.php?action=profile` |

`sendMessage` uses `parent_id: thread_id` in the POST body. The CSRF token comes from the `fetchThread` response. `useThread` handles re-fetching a fresh CSRF and retrying once on failure.

---

## Known limitations / TODOs

- **New thread compose**: `sendMessage` requires a `thread_id` / `parent_id`. The correct value for brand-new conversations (no existing thread) hasn't been confirmed from the API. Currently, tapping "Message" on a profile with no prior thread falls back to opening the inbox. Fix: determine what `parent_id` value the API accepts for new threads (likely `"0"` or `""`), then wire up a compose screen.

- **Old HTML endpoints** (`/oink/index.php` non-JSON): Not implemented. Could be added as fallback if JSON endpoints degrade.

- **Firefox Android**: Not tested.

---

## Visual theme

Dark/neon. CSS custom properties live in `src/styles/index.ts`:

```
--bg: #09090f          deep background
--bg-2: #0d0d1a        slightly lighter bg
--bg-card: #16161f     card surfaces
--border: #1e1e2e      borders
--accent: #e040fb      electric magenta (primary)
--accent-2: #7c4dff    electric purple (secondary)
--text: #f0f0f0        primary text
--text-muted: #888     secondary text
--radius: 8px
```

Tab bar is at the bottom (mobile-first). All interactive elements use the `--accent` colour.

---

## Browser support target

Chrome 108+, Firefox 110+, Safari 16+ (desktop + iOS). Defined in `vite.config.ts` `build.target`.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**NKP Deshittifier**

A Preact bookmarklet SPA that replaces nastykinkpigs.com's broken native UI with a clean, fast,
mobile-first tabbed interface. The user fires it on any NKP page while logged in — it wipes the
page and mounts a full app that talks directly to the site's working JSON APIs using the browser's
existing session cookies. This milestone extends the messaging and map features significantly.

**Core Value:** Users can find, message, and locate people near them — faster and more reliably than the native site.

### Constraints

- **Single file output**: IIFE bundle only. All styles in `src/styles/index.ts`. No `.css` files in `src/`.
- **No router**: Tab navigation is `useState` in `App.tsx`. Do not add a routing library.
- **No global store**: No Redux, Zustand, etc.
- **Bundle size**: < 50 KB gzipped. Leaflet stays on CDN.
- **No API keys**: Nominatim is key-free. Tile provider must be key-free or use a free tier with no key.
- **Browser target**: Chrome 108+, Firefox 110+, Safari 16+.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.8.3 - All application source code under `src/`
- TSX (TypeScript + JSX) - Component files (`src/main.tsx`, `src/App.tsx`, `src/tabs/*.tsx`, `src/components/*.tsx`)
- JavaScript (ESM) - Build scripts (`scripts/gen-bookmarklet.mjs`)
- HTML - Static install page (`install/index.html`)
## Runtime
- Browser (Chrome 108+, Firefox 110+, Safari 16+) — the bundle runs as a bookmarklet injected into the user's browser tab
- Node.js 20 (pinned in `deploy.yml` via `actions/setup-node@v4`)
- No `.nvmrc` or `.node-version` file in repo; version constraint is CI-only
- npm
- Lockfile: `package-lock.json` present (CI uses `npm ci`)
## Frameworks
- Preact 10.25.4 - UI rendering; chosen for minimal bundle size vs React
- Vite 6.3.5 - Build tool; configured as IIFE lib build outputting `dist/bundle.js`
- `@preact/preset-vite` 2.10.1 - Preact JSX transform + HMR integration for Vite
- Not configured — no test runner present
## Key Dependencies
- `preact` ^10.25.4 - Only runtime dependency; provides `render`, `h`, hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
- `@biomejs/biome` 2.4.15 - Linting and formatting (replaces ESLint + Prettier)
- `typescript` ^5.8.3 - Type checking; `noEmit: true` (Vite handles transpilation)
- `vite` ^6.3.5 - IIFE bundle build; single output file required by bookmarklet constraint
- `@preact/preset-vite` ^2.10.1 - JSX factory wiring + Preact-specific Babel transforms
## Configuration
- `tsconfig.json` — `target: ES2020`, `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- JSX: `"jsx": "react-jsx"` with `"jsxImportSource": "preact"`
- Path aliases: `@api` → `src/api.ts`, `@types/*` → `src/types/*`
- `vite.config.ts` — lib mode, IIFE format, single entry `src/main.tsx`, output `dist/bundle.js`
- CSS extraction disabled (`cssCodeSplit: false`); all styles live in `src/styles/index.ts` as a JS string constant
- Defines `__GIT_SHA__` and `__BUNDLE_URL__` as compile-time constants
- `publicDir: 'install'` copies `install/` contents into `dist/` (GitHub Pages install page)
- Browser targets: `['chrome108', 'firefox110', 'safari16']`
- `biome.json` — Biome 2.x; 2-space indent, LF, 100-char line width, single quotes in JS/TS, no semicolons, trailing commas
- No `.env` files; no runtime environment variables — all configuration is hardcoded or injected at build time via Vite `define`
- The only sensitive context is the user's browser session cookie, which is passed automatically via `credentials: 'include'` on all fetch calls
## Platform Requirements
- Node.js 20+, npm
- Run `npm run dev` (Vite watch build) + `npm run preview` (serve `dist/`)
- Bookmarklet URL from `node scripts/gen-bookmarklet.mjs --dev` installed in browser
- GitHub Pages hosting at `https://attaris-base.github.io/nkp-deshittifier/`
- Output: single file `dist/bundle.js` (IIFE)
- Bundle size target: < 50 KB gzipped (enforced by CI check in `deploy.yml`)
- Deploy: push to `main` → GitHub Actions (`deploy.yml`) → `peaceiris/actions-gh-pages@v4` publishes `dist/` to `gh-pages` branch
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Components: PascalCase `.tsx` — `Avatar.tsx`, `TabBar.tsx`, `ErrorBanner.tsx`
- Hooks: camelCase with `use` prefix `.ts` — `useInbox.ts`, `useThread.ts`, `useGrid.ts`
- Tabs: PascalCase with `Tab` suffix `.tsx` — `MessagesTab.tsx`, `NearbyTab.tsx`, `MapTab.tsx`
- Types file: singular kebab-case with `.types.ts` suffix — `api.types.ts`
- Styles: `index.ts` (single file in `src/styles/`)
- API module: flat `api.ts` (single file, all functions)
- Exported components: PascalCase — `function App()`, `function Avatar(...)`, `function Spinner(...)`
- Hooks: camelCase `use` prefix — `useInbox()`, `useThread()`, `useGeo()`
- Event handlers: `handle` prefix camelCase — `handleSend`, `handleMessage`, `handleKeyDown`, `handleTouchStart`
- API functions: camelCase `fetch`/`send` prefix — `fetchMail`, `fetchThread`, `sendMessage`, `fetchOinkGrid`, `fetchProfileData`
- Private helpers in a file: camelCase — `fmtDate`, `esc`, `initial`, `markerHtml`, `popupHtml`, `injectLeaflet`
- Callback props: `on` prefix camelCase — `onViewProfile`, `onOpenThread`, `onBack`, `onUnreadChange`
- State variables: camelCase descriptive noun — `activeTab`, `selectedProfile`, `pendingThreadId`
- Refs: camelCase with `Ref` suffix — `bottomRef`, `mapRef`, `dataRef`, `touchStartX`
- Constants (module-scope): SCREAMING_SNAKE_CASE — `ALLOWED_HOSTS`, `DEFAULT_FILTERS`, `WINDOW_OPTIONS`, `LEAFLET_VERSION`
- Constants (local arrays/objects): SCREAMING_SNAKE_CASE — `TABS`, `POSITION_OPTIONS`, `SIZE_CLASS`
- Interfaces: PascalCase noun — `InboxState`, `ThreadState`, `GridState`, `GeoState`
- Props interfaces: named `Props` (local to file, never exported)
- Exported types: PascalCase, match domain concept — `TabId`, `SelectedProfile`, `CurrentMail`, `Grid`, `Profile`
- Enums: PascalCase with PascalCase members — `Heat`, `LOCSource`, `Position`
## Code Style
- 2-space indentation, `space` style
- LF line endings
- 100-character line width
- No semicolons (`asNeeded`)
- Single quotes in JS/TS, double quotes in JSX attributes
- Trailing commas in JS/TS, none in JSON
- Arrow function parentheses: always
- `noUnusedVariables` / `noUnusedImports` → error
- `noDebugger` → error
- `useConst` → error (prefer `const` over `let` everywhere possible)
- `useButtonType` (a11y) → error — all `<button>` must have explicit `type=`
- `useSemanticElements` (a11y) → error — use `<button>` not `<div role="button">`
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- `import type` used consistently for type-only imports (enforced by `noUnusedImports`)
- Path aliases: `@api` → `./src/api.ts`, `@types/*` → `./src/types/*`
- No `any` except for Leaflet CDN global — suppress with `// biome-ignore lint/suspicious/noExplicitAny: Leaflet CDN global, no type defs installed`
## Import Organization
- `import type` for type-only imports, not `import`
- Relative paths used throughout (`../`, `./`) — path aliases available but rarely used in `src/`
- No barrel files (`index.ts` re-exports) — import each module directly
## Error Handling
## Logging
## Comments
- Inline comments explain non-obvious decisions (e.g., why a `ref` is used instead of state, why `// biome-ignore` is necessary)
- Section dividers use `// ─── ComponentName ──────` style for large files (`MessagesTab.tsx`)
- Feature flags use `// ── MAP FEATURE ──` delimiters to mark removable blocks
- JSDoc (`/** ... */`) used selectively for exported API functions with non-obvious parameters
- Commented-out code left in `api.types.ts` (duplicate `Doppler` interface) — clean up opportunity
- Present on `fetchOinkGrid` and `fetchProfileData` in `src/api.ts`
- Not present on hook exports or component props
- Interface-level comments used in `src/types/api.types.ts` to group request/response shapes
## Function Design
- Components receive a single `Props` interface (locally defined, not exported)
- Hooks receive primitive arguments (`lat`, `lng`, `threadId | null`)
- API functions receive a destructured params object for Grid/Profile, positional args for Chat
- Hooks spread state object and expose named action functions: `return { ...state, refresh, send }`
- Components return JSX or `null` for early guard returns
- `send()` in `useThread` returns `Promise<boolean>` — true on success, false on failure
## Module Design
- Named exports only — no default exports anywhere in `src/`
- Each file exports exactly what it provides: one component per `.tsx`, one hook per `.ts`
## Accessibility
- All `<button>` elements have `type="button"` (enforced by Biome)
- Interactive nav uses `<nav>` with `aria-label`
- Tab buttons use `aria-current="page"` for active state
- `<Spinner>` uses `aria-live="polite"` and `aria-busy="true"`
- `<ErrorBanner>` uses `role="alert"`
- `<Avatar>` uses `alt` on `<img>`, lazy loading on all images
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- One output file (`dist/bundle.js`). CSS is a JS string to avoid Vite extracting a separate `.css` file in IIFE mode.
- Session cookies carry all auth — no token management needed. All API calls use `credentials: 'include'`.
- Cross-tab navigation (e.g. Profile → Messages with a thread) is done by lifting `pendingThreadId` state to `App` and passing callbacks down.
- The entire existing page is destroyed on boot (`document.documentElement.innerHTML = ...`). The SPA runs in a `position:fixed` overlay element (`#nkp-root`).
## Layers
- Purpose: Validate domain, destroy host page, inject styles, mount Preact tree
- Location: `src/main.tsx`
- Contains: Domain check logic, `showWrongDomainToast`, `boot()` function
- Depends on: `src/App.tsx`, `src/styles/index.ts`
- Used by: Bookmarklet script injection
- Purpose: Own global state; route between tabs; coordinate cross-tab transitions
- Location: `src/App.tsx`
- Contains: `activeTab`, `selectedProfile`, `pendingThreadId`, `unreadCount` state; `handleViewProfile`, `handleOpenThread`, `handleThreadOpened` callbacks
- Depends on: All tab components, `TabBar`
- Used by: `main.tsx`
- Purpose: Render each major feature pane; orchestrate hooks for that feature
- Location: `src/tabs/`
- Contains: `MessagesTab`, `NearbyTab`, `ProfileTab`, `MapTab`
- Depends on: `src/hooks/`, `src/components/`, `src/types/api.types.ts`
- Used by: `src/App.tsx`
- Purpose: Encapsulate async state management for each data domain; call `api.ts` functions
- Location: `src/hooks/`
- Contains: `useInbox`, `useThread`, `useGrid`, `useGeo`, `useProfile`
- Depends on: `src/api.ts`, `src/types/api.types.ts`
- Used by: Tab components
- Purpose: All HTTP calls to nastykinkpigs.com; single source of truth for endpoints and headers
- Location: `src/api.ts`
- Contains: `fetchMail`, `fetchThread`, `sendMessage`, `fetchOinkGrid`, `fetchProfileData`
- Depends on: `src/types/api.types.ts`
- Used by: `src/hooks/`
- Purpose: TypeScript interfaces and enums for all API request/response shapes
- Location: `src/types/api.types.ts`
- Contains: `CurrentMail`, `Thread`, `ThreadDetails`, `Message`, `Grid`, `Pig`, `Profile`, `OinkGridParams`, `ProfileQueryParams`, enums
- Depends on: nothing
- Used by: `src/api.ts`, `src/hooks/`, `src/tabs/`
- Purpose: Reusable presentational components with no business logic
- Location: `src/components/`
- Contains: `TabBar`, `Avatar`, `DopplerBadge`, `Spinner`, `ErrorBanner`
- Depends on: `src/types/api.types.ts` (DopplerBadge only), `src/App.tsx` (TabBar imports `TabId`)
- Used by: Tab components
- Purpose: Deliver all application CSS via a JS string to avoid Vite CSS extraction
- Location: `src/styles/index.ts`
- Contains: Single exported constant `STYLES` — all CSS for every component and tab
- Depends on: nothing
- Used by: `src/main.tsx`
## Data Flow
### Messages: Inbox to Thread
### Cross-Tab: Profile → Messages
### Nearby / Map: Geolocation → Grid
- All state is local Preact `useState` within hooks and tab components. No global store.
- `App.tsx` holds the only shared state: `activeTab`, `selectedProfile`, `pendingThreadId`, `unreadCount`. Everything else is owned by individual hooks.
- `useGeo` is the single exception: module-scope `cached` variable persists geolocation across hook re-mounts (`src/hooks/useGeo.ts:13`).
- `MapTab` uses a module-scope `leafletLoading` promise to guard against duplicate CDN injections (`src/tabs/MapTab.tsx:23`).
## Key Abstractions
- Purpose: Encapsulate async loading state (data/loading/error) for a single data domain
- Examples: `src/hooks/useInbox.ts`, `src/hooks/useThread.ts`, `src/hooks/useGrid.ts`
- Pattern: Each hook returns `{ data, loading, error, refresh, ...extras }`. Callers never call `api.ts` directly.
- Purpose: Minimal cross-tab transfer object carrying enough context to fetch a profile
- Defined: `src/App.tsx:12` — `{ id: number; lat: number; lng: number }`
- Used by: `ProfileTab` props, `NearbyTab.onViewProfile`, `MessagesTab.onViewProfile`, `MapTab.onViewProfile`
- Purpose: Deliver all CSS through a JS string so the IIFE build stays one file
- Defined: `src/styles/index.ts:2`
- Used by: `src/main.tsx:25` — injected as a `<style>` element on boot
## Entry Points
- Triggers: User fires the bookmark on nastykinkpigs.com
- Behavior: Injects `<script src="bundle.js?t=TIMESTAMP">` into `document.head`
- Generated by: `scripts/gen-bookmarklet.mjs`
- Location: `src/main.tsx:9`
- Triggers: Script load completes (invoked at `src/main.tsx:63`)
- Responsibilities: Domain check → page wipe → style injection → `render(<App />, #nkp-root)`
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
### Defining types outside `src/types/api.types.ts`
### Adding `.css` files to `src/`
### Calling `useInbox()` inside `ProfileTab` for cross-tab state
## Error Handling
- `useInbox` detects `not-logged-in` state by checking that the API response is an object with a `threads` array; sets `error: 'not-logged-in'` — `MessagesTab` shows a login prompt for this specific value.
- `useThread.send` implements a single CSRF-retry: on `ok: false` or `csrf` in error string, it re-fetches the thread to get a fresh token and retries the send once (`src/hooks/useThread.ts:59`).
- `useProfile` checks `json?.ok` and sets `error: 'Profile not found'` if falsy (`src/hooks/useProfile.ts:19`).
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| leaflet | >- Build interactive maps with Leaflet.js. Use when a user asks to create map-based applications, add markers and popups, draw shapes, handle geolocation, or integrate tile layers in web applications. | `.claude/skills/leaflet/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
