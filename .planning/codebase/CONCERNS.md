# Codebase Concerns

**Analysis Date:** 2026-05-18

## Tech Debt

**New thread compose is unimplemented:**
- Issue: Tapping "Message" on a profile with no prior thread calls `onOpenThread(0)`, which simply clears `pendingThreadId` and falls back to the inbox — no compose screen is shown. The correct `parent_id` value for new threads has not been confirmed from the API.
- Files: `src/tabs/ProfileTab.tsx` (line 40–42), `src/tabs/MessagesTab.tsx` (lines 239–245)
- Impact: Users cannot initiate a new conversation from the Profile tab. The Message button silently does nothing useful in the new-thread case.
- Fix approach: Test whether the API accepts `parent_id: "0"` or `parent_id: ""` for a brand-new thread; then add a compose screen or pre-fill the thread view. The comment in `MessagesTab.tsx` at line 243 marks the entry point.

**Hardcoded browser fingerprint headers in every API call:**
- Issue: All five fetch functions in `src/api.ts` include a hardcoded `sec-ch-ua` value locked to `"Google Chrome";v="148"`, `sec-ch-ua-mobile: ?1`, and `sec-ch-ua-platform: "Android"`. These are Chromium-controlled forbidden headers — browsers set them automatically and may silently strip or override the manually supplied values, making the duplication fragile and pointless.
- Files: `src/api.ts` (lines 14–20, 44–50, 89–95, 148–154, 202–208)
- Impact: If a future browser version ignores these headers entirely, or if the target API starts validating the value as a real UA hint, requests may fail or mismatch. The duplication also makes the header block 7 lines per function — 35 lines of identical boilerplate across 5 functions.
- Fix approach: Extract shared headers into a single `COMMON_HEADERS` constant and omit the Chromium-controlled `sec-ch-ua*` and `sec-fetch-*` headers, which are forbidden and browser-managed. Only `accept`, `accept-language`, `cache-control`, `pragma`, `content-type`, and `credentials` need to be explicitly set.

**No error checking on `response.ok` for `fetchMail` and `fetchThread`:**
- Issue: `fetchMail` and `fetchThread` call `response.json()` directly without checking `response.ok`. `fetchOinkGrid` and `fetchProfileData` do guard on `response.ok`, but the two chat API functions do not.
- Files: `src/api.ts` (lines 28–30, 58–60)
- Impact: A 401, 403, 500, or rate-limit response from the server will silently try to parse non-JSON as JSON, producing an unhelpful parse error instead of a meaningful status code error.
- Fix approach: Add `if (!response.ok) throw new Error(\`HTTP \${response.status}\`)` before calling `.json()` in `fetchMail` and `fetchThread`, matching the pattern already used in `fetchOinkGrid`.

**Duplicate geolocation request logic in NearbyTab and MapTab:**
- Issue: Both `src/tabs/NearbyTab.tsx` (lines 60–67) and `src/tabs/MapTab.tsx` (lines 110–118) contain identical `useEffect` patterns: call `geo.request()` on mount with an empty dependency array, then re-run `grid.refresh()` when coords arrive. This violates the DRY principle and means any future change to the trigger logic must be applied in two places.
- Files: `src/tabs/NearbyTab.tsx`, `src/tabs/MapTab.tsx`
- Impact: Behavioural drift if one copy is updated and the other isn't.
- Fix approach: Encapsulate the "request geo then load grid" choreography into a `useGeoGrid` composable hook that both tabs import.

**`useEffect` missing dependency: `geo.request` in NearbyTab and MapTab:**
- Issue: Both tabs call `geo.request()` inside a `useEffect(() => { ... }, [])` with an empty dependency array. Biome lint currently passes because `geo.request` is stable (it's a `useCallback` with no deps), but the dependency array technically violates exhaustive-deps rules — if `useGeo` ever adds a dependency to `request`, the effect silently stale-closes.
- Files: `src/tabs/NearbyTab.tsx` (line 60), `src/tabs/MapTab.tsx` (line 111)
- Impact: Low today; moderate future regression risk.
- Fix approach: Add `geo.request` to the dependency arrays, or switch to the proposed `useGeoGrid` hook.

**Module-scope geolocation side-effect in `MessagesTab.tsx`:**
- Issue: `MessagesTab.tsx` (lines 208–220) contains a module-level `navigator.geolocation.getCurrentPosition` call that fires unconditionally when the module loads, not when the component mounts. This is outside any component or hook, and the result is stored in a module-scope `geoCache` object.
- Files: `src/tabs/MessagesTab.tsx` (lines 207–220)
- Impact: Location is requested before the user has interacted with the Nearby tab. On first load the browser may show a permission prompt unexpectedly. The result is also stale since it is never re-requested.
- Fix approach: Replace the module-scope call with `useGeo()` hook usage inside `MessagesTab`, using the same `cached` module-scope variable that `useGeo` already manages in `src/hooks/useGeo.ts`.

**`Avatar` component: size prop has no effect on CSS class for `lg`:**
- Issue: `SIZE_CLASS` in `src/components/Avatar.tsx` maps both `'sm'` and `'md'` to `'nkp-avatar'`, and `'lg'` to `'nkp-avatar lg'`. The `lg` class is appended with a space rather than the conventional `nkp-avatar--lg` modifier, inconsistent with BEM-style naming used elsewhere in the stylesheet.
- Files: `src/components/Avatar.tsx` (lines 9–13)
- Impact: Minor CSS specificity oddity; consistent with current stylesheet but fragile if CSS is refactored.
- Fix approach: Rename to `nkp-avatar--lg` in both `Avatar.tsx` and `src/styles/index.ts`.

**`Slug` enum is single-value and likely will grow:**
- Issue: `src/types/api.types.ts` (line 64–66) defines `enum Slug { Miles = 'miles' }`. The API likely returns other distance unit slugs for non-US users. Types with a single enum value that represent external API data are brittle.
- Files: `src/types/api.types.ts` (line 64–66)
- Impact: Any non-`miles` slug from the API produces a TypeScript type error at runtime (after casting).
- Fix approach: Widen to `string` or add known additional values. Same concern applies to `enum Sex { Male = 'male' }` (line 174–176), which assumes only male-identified users.

**`HueOklch` enum encodes literal color strings as enum keys:**
- Issue: `src/types/api.types.ts` (lines 44–52) creates an enum whose member *names* are auto-generated from the string values (e.g. `Oklch55012230 = 'oklch(55% 0.12 230)'`). This appears to be code generated from a JSON sample. The enum is fragile: any new hue value from the API that doesn't match an existing member will fail type checking.
- Files: `src/types/api.types.ts` (lines 44–52)
- Impact: TypeScript type errors if the API adds a new hue variant.
- Fix approach: Replace `enum HueOklch` with `type HueOklch = string` since these are CSS color values, not a closed set.

**Commented-out `Doppler` interface block:**
- Issue: `src/types/api.types.ts` (lines 216–224) contains a large commented-out interface definition for `Doppler`. This is dead code that was superseded by the active definition at line 34 but never removed.
- Files: `src/types/api.types.ts` (lines 216–224)
- Impact: Confusing to future contributors; no functional impact.
- Fix approach: Delete the commented block.

## Known Bugs

**CSRF retry in `useThread.send` does not surface error if retry also fails:**
- Symptoms: If the first send returns an error that matches the CSRF check (`result?.ok === false || result?.error?.includes?.('csrf')`), the code refetches a fresh thread and retries. If the retry `sendMessage` call also fails (network error, server error), the error from `retry` is not surfaced — the thread is refreshed and `sending: false` is set, but `error` remains null. The `send` function returns `retry?.ok !== false` which would be `true` for a non-ok result if the `ok` field is absent.
- Files: `src/hooks/useThread.ts` (lines 60–74)
- Trigger: Send a message when CSRF is expired, and the retry also fails.
- Workaround: None; user sees no feedback.

**Map CDN load failure is silently swallowed:**
- Symptoms: If the Leaflet CDN load fails (network offline, CDN down), the `injectLeaflet()` promise rejects. The `.catch` in `MapTab.tsx` (line 141–143) swallows the error entirely with an empty block — no error state is set, no `ErrorBanner` is shown, and the map container just stays blank with no user feedback.
- Files: `src/tabs/MapTab.tsx` (lines 127–143)
- Trigger: Navigate to Map tab while offline or when unpkg.com is unreachable.
- Workaround: User can tap ↻ refresh, which re-runs `grid.refresh()` but not the Leaflet inject, since `leafletLoading` is now a rejected promise stored as module state — meaning retry is impossible without a full page reload.

**`leafletLoading` module variable persists rejected promise:**
- Symptoms: After a failed CDN load, `leafletLoading` holds the rejected promise permanently. Subsequent calls to `injectLeaflet()` return the rejected promise, making Leaflet unrecoverable until the page is refreshed.
- Files: `src/tabs/MapTab.tsx` (lines 23–44)
- Trigger: Leaflet CDN fails to load once; user stays on page.
- Workaround: Full page reload.

## Security Considerations

**User-controlled content rendered as plain text — no XSS vector in Preact JSX:**
- Risk: Message text (`m.text`), profile bios (`data.about`, `data.looking`, etc.), and usernames are rendered directly in JSX. Preact escapes these by default.
- Files: `src/tabs/MessagesTab.tsx`, `src/tabs/ProfileTab.tsx`
- Current mitigation: Preact's JSX renderer auto-escapes string children. No `dangerouslySetInnerHTML` is used in component code.
- Recommendations: Maintain current pattern; never introduce `dangerouslySetInnerHTML` for user-supplied content.

**Map popup HTML is manually constructed with `esc()` escaping:**
- Risk: `popupHtml()` and `markerHtml()` in `src/tabs/MapTab.tsx` build HTML strings with a hand-rolled `esc()` function that only escapes `& < > "`. Values injected include `pig.name`, `pig.avatar` (URL), `pig.position`, `pig.distance_str`, `pig.age`, and `pig.id`. The `esc()` function does not escape single quotes, which could allow attribute injection if a value is used in a single-quoted attribute context. Currently all attributes use double quotes so this is low risk, but the escaping is fragile.
- Files: `src/tabs/MapTab.tsx` (lines 47–79)
- Current mitigation: Partial — double-quote attributes are correctly escaped; `data-pig-id` uses `pig.id` which is a number.
- Recommendations: Use `encodeURIComponent` for URLs, and add `'` → `&#39;` to `esc()` as a defense-in-depth measure.

**Profile tab mounts a second `useInbox()` instance:**
- Risk: `ProfileTab.tsx` calls `useInbox()` to find an existing thread for the "Message" button. This means every time the Profile tab is active, a second parallel inbox fetch runs alongside the one in `MessagesTab`. This is not a security issue but causes redundant authenticated API calls.
- Files: `src/tabs/ProfileTab.tsx` (line 17), `src/hooks/useInbox.ts`
- Current mitigation: None.
- Recommendations: Lift inbox data to `App.tsx` as shared state, or pass the thread list down as a prop from `MessagesTab`.

## Performance Bottlenecks

**Double (or triple) inbox fetch on every profile view:**
- Problem: When the user navigates to the Profile tab, `useInbox()` is mounted fresh and fires an HTTP request. When they return to Messages, `useInbox()` there re-fetches on `visibilitychange`. Combined with the module-scope `getCurrentPosition` call in `MessagesTab.tsx`, navigation between tabs generates repeated auth-sensitive API calls.
- Files: `src/tabs/ProfileTab.tsx` (line 17), `src/tabs/MessagesTab.tsx` (lines 207–220), `src/hooks/useInbox.ts`
- Cause: `useInbox` has no shared singleton or context; each mount creates an independent fetch cycle.
- Improvement path: Hoist inbox state to `App.tsx` and pass down, or use a Preact context/signal to share a single inbox hook instance.

**`useGrid` `loadMore` captures stale `state` and `filters` via closure:**
- Problem: The `loadMore` callback in `src/hooks/useGrid.ts` (line 63) lists both `state` and `filters` as dependencies, causing it to be recreated on every page load and filter change. Any component that binds `loadMore` directly (e.g. the Load More button in `NearbyTab`) will re-render whenever a new page lands. For large grids this is frequent.
- Files: `src/hooks/useGrid.ts` (lines 63–78)
- Cause: `state` (which includes the `pages` array) is a dependency because `loadMore` reads `state.pages`. Using a ref for `pages` would break the dependency chain.
- Improvement path: Store `pages` in a ref and derive `hasMore` from state separately; `loadMore` can then use a stable ref without listing `state` as a dep.

**Map renders all markers on every `grid.pigs` change with no deduplication:**
- Problem: `MapTab.tsx` (lines 161–201) removes all existing markers and re-adds all pigs on every `grid.pigs` update. With 500 pigs per page and load-more, this means O(n) DOM operations every time filters change or a new page loads.
- Files: `src/tabs/MapTab.tsx` (lines 161–201)
- Cause: No diffing of marker set; full clear-and-replace strategy.
- Improvement path: Maintain a `Map<id, L.Marker>` and diff add/remove on each update.

## Fragile Areas

**Single IIFE bundle — CSS injection via JS string:**
- Files: `src/styles/index.ts`, `src/main.tsx` (lines 23–25), `vite.config.ts` (lines 37–41)
- Why fragile: Any `.css` file added to `src/` will be silently extracted by Vite into `bundle.css`, which is not loaded by the bookmarklet. The build will succeed but styles will be missing. There is no build-time check that catches this.
- Safe modification: All new styles must go into `src/styles/index.ts` as string additions. Never add `.css` files under `src/`.
- Test coverage: No automated test; relies on manual visual verification.

**`document.documentElement.innerHTML` wipe in `main.tsx`:**
- Files: `src/main.tsx` (lines 17–19)
- Why fragile: Replacing `documentElement.innerHTML` is non-standard and may detach event listeners, break `document.head` references, or behave inconsistently across browsers. If Preact or any hook attempts to access a reference captured before the wipe, it will get a stale/detached node.
- Safe modification: Keep the wipe. Do not attempt to preserve references across the boot() call. Do not add code that runs before `boot()` and captures DOM nodes.
- Test coverage: None.

**Leaflet loaded from CDN at runtime (`unpkg.com`):**
- Files: `src/tabs/MapTab.tsx` (lines 16, 34, 38–39)
- Why fragile: The map tab has a hard dependency on `unpkg.com` being available and serving the exact version `1.9.4`. If the CDN is unavailable, the map is permanently broken for the session (see `leafletLoading` bug above). The version is hardcoded as `const LEAFLET_VERSION = '1.9.4'`.
- Safe modification: When updating Leaflet version, update `LEAFLET_VERSION` constant and test the map tab manually.
- Test coverage: None.

**`ProfileTab` navigates to Profile tab only via `App.tsx` shared state:**
- Files: `src/App.tsx`, `src/tabs/ProfileTab.tsx`
- Why fragile: The Profile tab is only reachable by setting `selectedProfile` and `activeTab` via callbacks passed through multiple layers. If `selectedProfile` is null when `activeTab === 'profile'`, the tab renders an empty state rather than an error. The Tab Bar has no 'Profile' entry (it was replaced by 'Map'), so the Profile tab is invisible to the user unless navigated to programmatically.
- Safe modification: Any code that navigates to the profile tab must also set `selectedProfile` via `handleViewProfile`. Never set `activeTab = 'profile'` without also providing a profile.
- Test coverage: None.

## Scaling Limits

**Inbox pagination not implemented:**
- Current capacity: Fetches up to 100 threads in a single request (hardcoded `limit=100` in `fetchMail` URL).
- Limit: Users with more than 100 threads will silently see a truncated inbox. The API response includes a `next_cursor` field that is loaded into `CurrentMail.next_cursor` but is never consumed.
- Scaling path: Implement cursor-based pagination in `useInbox`, exposing a `loadMore` function similar to `useGrid`.

**Grid page size hardcoded at 50:**
- Current capacity: `useGrid` always requests `page_size: 50` (line 46 in `src/hooks/useGrid.ts`).
- Limit: The grid API supports up to `page_size: 500` (used in `OinkGridParams` default), but the hook always uses 50. This means dense areas require many load-more taps.
- Scaling path: This is a UX tradeoff; no code change is blocking. Consider making `page_size` configurable or raising the default.

## Dependencies at Risk

**No test framework:**
- Risk: There are zero test files in the project. All validation is manual. Any refactor to shared hooks (`useGrid`, `useInbox`, `useThread`) or `api.ts` is entirely unguarded.
- Impact: Regressions in API handling, CSRF retry logic, geolocation caching, or unread count propagation would not be caught before deploy.
- Migration plan: Add Vitest (already in the Vite ecosystem, low setup cost). Priority targets: `src/api.ts` error handling, `src/hooks/useThread.ts` CSRF retry path, `src/hooks/useInbox.ts` logged-out detection.

**`@biomejs/biome` pinned to `2.4.15` (exact) in package.json:**
- Risk: `devDependencies` uses an exact version `2.4.15` with no `^` or `~`. This is intentional for a formatting tool (to avoid churn), but means new lint rules and bug fixes are not automatically picked up.
- Impact: Low; intentional.
- Migration plan: Manually bump version when new Biome releases are needed.

## Missing Critical Features

**No compose flow for new conversations:**
- Problem: As noted above, the Message button silently falls back to the inbox when no prior thread exists. This is the single most impactful missing feature — it blocks users from initiating contact with new people found via Nearby or Map.
- Blocks: Core use case of the app (meeting people).

**No polling / push for new messages:**
- Problem: `useInbox` re-fetches on `visibilitychange` but there is no interval-based polling or WebSocket push. Users must switch browser tabs or manually tap ↻ to see new messages.
- Blocks: Real-time messaging experience.

## Test Coverage Gaps

**No tests exist:**
- What's not tested: Everything — API error handling, CSRF retry logic, unread count calculation, geolocation fallback, logged-out detection, tab navigation state, compose message flow, map marker wiring.
- Files: All of `src/` has zero test coverage.
- Risk: Any change to any hook or API function is a silent regression risk.
- Priority: High for `src/hooks/useThread.ts` (CSRF retry is complex), `src/api.ts` (HTTP error paths), and `src/hooks/useInbox.ts` (logged-out detection heuristic).

---

*Concerns audit: 2026-05-18*
