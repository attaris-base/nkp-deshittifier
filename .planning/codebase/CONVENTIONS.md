# Coding Conventions

**Analysis Date:** 2026-05-18

## Naming Patterns

**Files:**
- Components: PascalCase `.tsx` — `Avatar.tsx`, `TabBar.tsx`, `ErrorBanner.tsx`
- Hooks: camelCase with `use` prefix `.ts` — `useInbox.ts`, `useThread.ts`, `useGrid.ts`
- Tabs: PascalCase with `Tab` suffix `.tsx` — `MessagesTab.tsx`, `NearbyTab.tsx`, `MapTab.tsx`
- Types file: singular kebab-case with `.types.ts` suffix — `api.types.ts`
- Styles: `index.ts` (single file in `src/styles/`)
- API module: flat `api.ts` (single file, all functions)

**Functions:**
- Exported components: PascalCase — `function App()`, `function Avatar(...)`, `function Spinner(...)`
- Hooks: camelCase `use` prefix — `useInbox()`, `useThread()`, `useGeo()`
- Event handlers: `handle` prefix camelCase — `handleSend`, `handleMessage`, `handleKeyDown`, `handleTouchStart`
- API functions: camelCase `fetch`/`send` prefix — `fetchMail`, `fetchThread`, `sendMessage`, `fetchOinkGrid`, `fetchProfileData`
- Private helpers in a file: camelCase — `fmtDate`, `esc`, `initial`, `markerHtml`, `popupHtml`, `injectLeaflet`
- Callback props: `on` prefix camelCase — `onViewProfile`, `onOpenThread`, `onBack`, `onUnreadChange`

**Variables:**
- State variables: camelCase descriptive noun — `activeTab`, `selectedProfile`, `pendingThreadId`
- Refs: camelCase with `Ref` suffix — `bottomRef`, `mapRef`, `dataRef`, `touchStartX`
- Constants (module-scope): SCREAMING_SNAKE_CASE — `ALLOWED_HOSTS`, `DEFAULT_FILTERS`, `WINDOW_OPTIONS`, `LEAFLET_VERSION`
- Constants (local arrays/objects): SCREAMING_SNAKE_CASE — `TABS`, `POSITION_OPTIONS`, `SIZE_CLASS`

**Types/Interfaces:**
- Interfaces: PascalCase noun — `InboxState`, `ThreadState`, `GridState`, `GeoState`
- Props interfaces: named `Props` (local to file, never exported)
- Exported types: PascalCase, match domain concept — `TabId`, `SelectedProfile`, `CurrentMail`, `Grid`, `Profile`
- Enums: PascalCase with PascalCase members — `Heat`, `LOCSource`, `Position`

## Code Style

**Formatting (Biome 2.x — `biome.json`):**
- 2-space indentation, `space` style
- LF line endings
- 100-character line width
- No semicolons (`asNeeded`)
- Single quotes in JS/TS, double quotes in JSX attributes
- Trailing commas in JS/TS, none in JSON
- Arrow function parentheses: always

**Linting (Biome recommended + extras):**
- `noUnusedVariables` / `noUnusedImports` → error
- `noDebugger` → error
- `useConst` → error (prefer `const` over `let` everywhere possible)
- `useButtonType` (a11y) → error — all `<button>` must have explicit `type=`
- `useSemanticElements` (a11y) → error — use `<button>` not `<div role="button">`

**TypeScript:**
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- `import type` used consistently for type-only imports (enforced by `noUnusedImports`)
- Path aliases: `@api` → `./src/api.ts`, `@types/*` → `./src/types/*`
- No `any` except for Leaflet CDN global — suppress with `// biome-ignore lint/suspicious/noExplicitAny: Leaflet CDN global, no type defs installed`

## Import Organization

**Order (top of file):**
1. Framework imports — `import { useState } from 'preact/hooks'`
2. Internal absolute/alias imports — `import type { TabId } from '../App'`
3. Component imports — `import { Avatar } from '../components/Avatar'`
4. Hook imports — `import { useInbox } from '../hooks/useInbox'`
5. Type imports — `import type { Thread } from '../types/api.types'`

**Rules:**
- `import type` for type-only imports, not `import`
- Relative paths used throughout (`../`, `./`) — path aliases available but rarely used in `src/`
- No barrel files (`index.ts` re-exports) — import each module directly

## Error Handling

**Hook pattern — all async data hooks follow this shape:**
```typescript
try {
  const json = await fetchSomething()
  setState({ data: json, loading: false, error: null })
} catch (e) {
  setState({ data: null, loading: false, error: (e as Error).message ?? 'Network error' })
}
```

**Validation before setting success state:**
```typescript
if (!json?.ok) {
  setState({ data: null, loading: false, error: 'Profile not found' })
  return
}
```

**Error surfacing in components:**
```tsx
if (error) return <ErrorBanner message={error} onRetry={refresh} />
```

**Typed error cast:** errors are cast as `(e as Error).message` with a fallback string (`?? 'Network error'`, `?? 'Send failed'`).

**API response errors:** checked via `response.ok` in functions that have typed return shapes (`fetchOinkGrid`, `fetchProfileData`). `fetchMail` and `fetchThread` do not check `response.ok` — they rely on hook-level shape validation.

**CSRF retry pattern** (`useThread.ts`): on 403 / `result.error.includes('csrf')`, re-fetch the thread for a fresh CSRF token and retry the send once before surfacing an error.

## Logging

**Framework:** `console.info` (not a logging library)

**Pattern:** Single boot log in `src/main.tsx`:
```typescript
console.info(`[NKP Deshittifier] booting — build ${__GIT_SHA__}`)
```

No runtime logging elsewhere. `console.log` and `debugger` are disallowed by Biome rules.

## Comments

**When to Comment:**
- Inline comments explain non-obvious decisions (e.g., why a `ref` is used instead of state, why `// biome-ignore` is necessary)
- Section dividers use `// ─── ComponentName ──────` style for large files (`MessagesTab.tsx`)
- Feature flags use `// ── MAP FEATURE ──` delimiters to mark removable blocks
- JSDoc (`/** ... */`) used selectively for exported API functions with non-obvious parameters
- Commented-out code left in `api.types.ts` (duplicate `Doppler` interface) — clean up opportunity

**JSDoc/TSDoc:**
- Present on `fetchOinkGrid` and `fetchProfileData` in `src/api.ts`
- Not present on hook exports or component props
- Interface-level comments used in `src/types/api.types.ts` to group request/response shapes

## Function Design

**Size:** Small, single-purpose. Hooks encapsulate all async logic for a domain. Components delegate to hooks.

**Parameters:**
- Components receive a single `Props` interface (locally defined, not exported)
- Hooks receive primitive arguments (`lat`, `lng`, `threadId | null`)
- API functions receive a destructured params object for Grid/Profile, positional args for Chat

**Return Values:**
- Hooks spread state object and expose named action functions: `return { ...state, refresh, send }`
- Components return JSX or `null` for early guard returns
- `send()` in `useThread` returns `Promise<boolean>` — true on success, false on failure

## Module Design

**Exports:**
- Named exports only — no default exports anywhere in `src/`
- Each file exports exactly what it provides: one component per `.tsx`, one hook per `.ts`

**Barrel Files:** None — import each module directly by path.

**State shape pattern:** Each hook defines a typed state interface (`InboxState`, `ThreadState`, `GridFilters`, etc.) exported from the hook file for consumers that need the type.

**CSS:** All styles in `src/styles/index.ts` as exported string constant `STYLES`. Never add `.css` files to `src/` — Vite extracts them separately and a bookmarklet can only load one file.

## Accessibility

- All `<button>` elements have `type="button"` (enforced by Biome)
- Interactive nav uses `<nav>` with `aria-label`
- Tab buttons use `aria-current="page"` for active state
- `<Spinner>` uses `aria-live="polite"` and `aria-busy="true"`
- `<ErrorBanner>` uses `role="alert"`
- `<Avatar>` uses `alt` on `<img>`, lazy loading on all images

---

*Convention analysis: 2026-05-18*
