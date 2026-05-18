# Codebase Structure

**Analysis Date:** 2026-05-18

## Directory Layout

```
nkp-unshittifier/
├── src/                    # All application source code
│   ├── main.tsx            # Entry point: boot sequence and Preact render
│   ├── App.tsx             # Root component: tab state and cross-tab routing
│   ├── api.ts              # All HTTP calls to nastykinkpigs.com
│   ├── tabs/               # One file per full-screen tab view
│   │   ├── MessagesTab.tsx # Inbox + ThreadView + compose bar
│   │   ├── NearbyTab.tsx   # Geo-gated user card grid with filters
│   │   ├── ProfileTab.tsx  # Profile detail, photos, Message CTA
│   │   └── MapTab.tsx      # Leaflet map with user pins
│   ├── hooks/              # Custom hooks — async state per data domain
│   │   ├── useInbox.ts
│   │   ├── useThread.ts
│   │   ├── useGrid.ts
│   │   ├── useGeo.ts
│   │   └── useProfile.ts
│   ├── components/         # Reusable presentational components
│   │   ├── TabBar.tsx
│   │   ├── Avatar.tsx
│   │   ├── DopplerBadge.tsx
│   │   ├── Spinner.tsx
│   │   └── ErrorBanner.tsx
│   ├── styles/
│   │   └── index.ts        # All CSS as exported STYLES string constant
│   └── types/
│       └── api.types.ts    # All API request/response TypeScript types
├── install/                # GitHub Pages install page (no framework)
│   └── index.html          # Bookmarklet install UI (mobile + desktop flows)
├── scripts/
│   └── gen-bookmarklet.mjs # Print bookmarklet URL to terminal
├── dist/                   # Build output (gitignored, deployed to gh-pages)
│   └── bundle.js           # Single IIFE bundle (< 50 KB gzip target)
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI: build on push, deploy dist/ to gh-pages on main
├── .planning/
│   └── codebase/           # GSD codebase map documents
├── .claude/
│   └── skills/             # Project skill definitions (e.g. leaflet)
├── biome.json              # Biome linter + formatter config
├── vite.config.ts          # Build: IIFE lib mode, publicDir, defines
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies and npm scripts
├── index.html              # Vite dev harness (not deployed)
└── CLAUDE.md               # Project guide for AI assistants
```

## Directory Purposes

**`src/tabs/`:**
- Purpose: One component file per full-screen tab pane. Each file owns its tab's layout, local UI state, and hook composition.
- Contains: `MessagesTab.tsx`, `NearbyTab.tsx`, `ProfileTab.tsx`, `MapTab.tsx`
- Key files: `MessagesTab.tsx` — most complex; contains both `InboxView` and `ThreadView` as module-private sub-components

**`src/hooks/`:**
- Purpose: Async data-fetching hooks that wrap `api.ts`. Each hook manages `{ data, loading, error }` state for one domain.
- Contains: One hook per API concern — inbox, thread, grid, geolocation, profile
- Key files: `useThread.ts` — CSRF retry logic; `useGeo.ts` — module-scope location cache

**`src/components/`:**
- Purpose: Purely presentational, reusable components with no API calls or business logic.
- Contains: `TabBar`, `Avatar`, `DopplerBadge`, `Spinner`, `ErrorBanner`

**`src/styles/`:**
- Purpose: Workaround for Vite IIFE CSS extraction — all CSS lives as a string constant injected by `main.tsx`.
- Key constraint: No `.css` files anywhere in `src/`. All component and layout styles must be added here.

**`src/types/`:**
- Purpose: Canonical TypeScript types for all API shapes. Single source of truth.
- Key constraint: Do not redefine API types elsewhere. Import from here.

**`install/`:**
- Purpose: Static GitHub Pages site for bookmarklet installation. Plain HTML + inline `<script>`. No Vite, no framework.
- Served at: `https://attaris-base.github.io/nkp-deshittifier/`
- Vite copies this directory to `dist/` via `publicDir: 'install'` in `vite.config.ts`.

**`scripts/`:**
- Purpose: Developer utilities. Currently one script to generate and print the bookmarklet URL.

**`dist/`:**
- Purpose: Vite build output. Contains `bundle.js` plus anything from `install/`.
- Generated: Yes
- Committed: No (deployed to `gh-pages` branch by CI)

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Boot function — domain check, page wipe, style injection, `render(<App />)`
- `src/App.tsx`: Root Preact component — global state and tab routing

**Configuration:**
- `vite.config.ts`: IIFE lib build mode, `publicDir`, `__GIT_SHA__` / `__BUNDLE_URL__` defines, browser targets
- `biome.json`: Linting and formatting rules (single tool for both)
- `tsconfig.json`: TypeScript compiler options
- `.github/workflows/deploy.yml`: CI/CD — build + GitHub Pages deploy on push to `main`

**Core Logic:**
- `src/api.ts`: All `fetch()` calls — add new API functions here
- `src/types/api.types.ts`: All API types — add new shapes here
- `src/styles/index.ts`: All CSS — add new styles here

**Tabs:**
- `src/tabs/MessagesTab.tsx`: Messages feature (inbox list + thread detail + compose)
- `src/tabs/NearbyTab.tsx`: Nearby users grid
- `src/tabs/ProfileTab.tsx`: User profile view
- `src/tabs/MapTab.tsx`: Leaflet map view

**Hooks:**
- `src/hooks/useInbox.ts`: Inbox data with auto-refresh on visibility
- `src/hooks/useThread.ts`: Thread fetch + send with CSRF retry
- `src/hooks/useGrid.ts`: Nearby grid with filter and pagination
- `src/hooks/useGeo.ts`: Geolocation with module-scope cache
- `src/hooks/useProfile.ts`: Profile data by selected profile id

**Install Page:**
- `install/index.html`: Bookmarklet installer (inlines `BUNDLE_URL` at runtime via JS)

**Scripts:**
- `scripts/gen-bookmarklet.mjs`: Print production or dev bookmarklet URL to stdout

## Naming Conventions

**Files:**
- Tab components: PascalCase with `Tab` suffix — `MessagesTab.tsx`, `NearbyTab.tsx`
- Hook files: camelCase with `use` prefix — `useInbox.ts`, `useThread.ts`
- Component files: PascalCase — `Avatar.tsx`, `TabBar.tsx`
- Type files: camelCase with `.types.ts` suffix — `api.types.ts`
- Style files: `index.ts` (single file in `styles/`)
- Script files: kebab-case `.mjs` — `gen-bookmarklet.mjs`

**CSS classes:**
- All classes prefixed with `nkp-` — `nkp-header`, `nkp-tabbar`, `nkp-bubble`
- BEM-like modifier suffixes: `nkp-tab.active`, `nkp-bubble-row.me`, `nkp-bubble-row.them`
- Size variants: `nkp-avatar lg` (space-separated, not double-dash)

**TypeScript:**
- Interfaces: PascalCase — `CurrentMail`, `ThreadDetails`, `OinkGridParams`
- Enums: PascalCase enum name, PascalCase values — `enum Heat { Live = 'live', Warm = 'warm' }`
- Hook return state interfaces: PascalCase with `State` suffix — `InboxState`, `ThreadState`, `GridState`
- Props interfaces: named `Props` (local to each file, not exported)

## Where to Add New Code

**New tab / feature pane:**
- Implementation: `src/tabs/NewFeatureTab.tsx`
- Import and render in: `src/App.tsx` (add to `TabId` union type and conditional render)
- Tab entry: `src/components/TabBar.tsx` (add to `TABS` array)
- Styles: `src/styles/index.ts` (add CSS in the relevant section)

**New API endpoint:**
- Function: `src/api.ts` (new exported `async function`)
- Types: `src/types/api.types.ts` (request params interface + response interface)
- Hook: `src/hooks/useNewThing.ts` (wrap the api function with `{ data, loading, error }` state)

**New reusable component:**
- Implementation: `src/components/NewComponent.tsx`
- Styles: `src/styles/index.ts` (add `.nkp-new-component` rules)
- No separate CSS file — see style layer constraint

**New hook:**
- Location: `src/hooks/useNewThing.ts`
- Pattern: Return `{ data: T | null, loading: boolean, error: string | null, refresh: () => void, ...extras }`
- Call only `api.ts` functions, never `fetch()` directly

**New CSS styles:**
- Location: `src/styles/index.ts` — append to the `STYLES` template literal
- Prefix all class names with `nkp-`

## Special Directories

**`dist/`:**
- Purpose: Vite build output — `bundle.js` + `install/` contents
- Generated: Yes (by `npm run build`)
- Committed: No — deployed to `gh-pages` branch by CI

**`install/`:**
- Purpose: GitHub Pages install landing page (static HTML, no build step)
- Generated: No — hand-authored
- Committed: Yes — copied to `dist/` by Vite `publicDir`

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents (STACK.md, ARCHITECTURE.md, etc.)
- Generated: Yes (by `/gsd:map-codebase` commands)
- Committed: Yes

**`.claude/skills/`:**
- Purpose: Project skill definitions consumed by GSD workflows
- Contains: `leaflet/` skill
- Committed: Yes

---

*Structure analysis: 2026-05-18*
