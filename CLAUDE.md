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
| `src/tabs/MapTab.tsx` | Leaflet map (dynamically injected), pan-to-search, secret discover gesture |
| `src/geoApi.ts` | Trilateration helpers, reverse geocoding, haversine distance — used by the discover gesture |
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

