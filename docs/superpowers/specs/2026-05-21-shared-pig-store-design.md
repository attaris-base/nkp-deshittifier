# Shared Pig Store + Map Position Persistence

**Date:** 2026-05-21  
**Status:** Approved

## Problem

Two independent bugs / limitations:

1. **Map position reset** — navigating from the map to a profile and back unmounts `MapTab`, destroying the Leaflet instance and all local state. On remount the map recentres to the GPS position regardless of where the user had panned.

2. **Duplicate, non-shared fetches** — `NearbyTab` and `MapTab` each call `useGrid` independently. Every tab switch fires a fresh `fetchOinkGrid` request, results are not retained, and there is no way for one tab's data to inform the other.

## Goals

- Preserve map position and zoom across tab switches.
- Accumulate pig data indefinitely as the user explores; new API results update existing pig records (except for discover-derived locations, which are protected).
- Share the pig store and search location between `NearbyTab` and `MapTab` so both views always show the same area.
- Filters (radius, time window, position) are shared between the two views.
- When the Discover flow trilateration succeeds, the pig's marker moves to the derived location automatically — no separate discover pin needed.

## Non-Goals

- Per-tab independent filter state (rejected in design — shared filters chosen for simplicity).
- Clearing the accumulated store on filter changes or refresh (user requirement: accumulate indefinitely; a full page reload is the only reset).

---

## Design

### 1. Data model

A new `EnrichedPig` type extends `Pig` with a `locationSource` discriminator and an optional discover note:

```ts
type LocationSource = 'api' | 'discover'

interface EnrichedPig extends Pig {
  locationSource: LocationSource
  discoverNote?: { displayName: string; dopplerMeters: number }
}
```

**Merge rule** — every API result for a pig runs through:

```ts
function mergePig(existing: EnrichedPig | undefined, incoming: Pig): EnrichedPig {
  if (!existing) return { ...incoming, locationSource: 'api' }
  if (existing.locationSource === 'discover')
    // Preserve trilaterated coords; update everything else
    return { ...incoming, lat: existing.lat, lng: existing.lng, locationSource: 'discover' }
  return { ...incoming, locationSource: 'api' }
}
```

`patchPigLocation` bypasses the merge and forcibly sets coords + `locationSource: 'discover'`. It is the only path that can overwrite a discover-derived location.

---

### 2. `useGrid` rewrite (`src/hooks/useGrid.ts`)

**Signature unchanged:** `useGrid(lat: number, lng: number)`

**Internal state:**

```ts
interface GridState {
  pigs: Map<number, EnrichedPig>   // JS Map preserves insertion order
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  currentSearchPage: number
}
```

`pages: Grid[]` is removed. `hasMore` and `currentSearchPage` become first-class state fields.

**Method behaviour:**

| Method | Change |
|--------|--------|
| `load(filters)` | Fetches page 0, merges into existing map. Does **not** clear. Resets `hasMore` + `currentSearchPage` from API response. |
| `searchAt(lat, lng)` | Updates `latRef/lngRef`, calls `load`. Results accumulate. |
| `loadMore()` | Fetches `currentSearchPage + 1`, merges, increments page counter. |
| `applyFilters(f)` | Updates filter state, calls `load`. Old results stay; new results merge in. |
| `refresh()` | Calls `load(currentFilters)`. Re-fetches page 0 at current location, merging updates. |
| `patchPigLocation(id, lat, lng, note?)` | Directly sets pig's `lat/lng`, `locationSource: 'discover'`, and optional `discoverNote`. No fetch. |

**Public return shape** gains two fields and one method compared to today:
- `pigs: EnrichedPig[]` — `Array.from(state.pigs.values())` (unchanged shape)
- `lat: number` / `lng: number` — the current search coords (mirrors `latRef.current` / `lngRef.current`); consumers use these when they need to know where the last search was run (e.g. MapTab's popup `onViewProfile` callback)
- `patchPigLocation(id, lat, lng, note?)` — new

---

### 3. App.tsx — location ownership, shared grid, keep-mounted map

App gains ownership of geo state and the search-location override:

```ts
const geo = useGeo()
const [overrideLat, setOverrideLat] = useState<number | null>(null)
const [overrideLng, setOverrideLng] = useState<number | null>(null)
const gridLat = overrideLat ?? geo.lat ?? 0
const gridLng = overrideLng ?? geo.lng ?? 0
const grid = useGrid(gridLat, gridLng)
```

The geo-ready effect (currently duplicated in both tabs) consolidates here:

```ts
useEffect(() => { geo.request() }, [])
useEffect(() => {
  if (geo.lat != null && geo.lng != null && !geo.loading) grid.refresh()
}, [geo.lat, geo.lng, geo.loading])
```

`handleSearchAt` is called by MapTab when "Search here" is tapped:

```ts
function handleSearchAt(lat: number, lng: number) {
  setOverrideLat(lat)
  setOverrideLng(lng)
  grid.searchAt(lat, lng)
}
```

Both `setOverride*` and `grid.searchAt` are called together: the override state ensures `latRef` is not reset to GPS coords on the next render; `searchAt` fires the fetch immediately.

**Keep-mounted MapTab** — wrapped in a div that applies `display: none` when inactive. All other tabs keep conditional rendering:

```tsx
<div style={{ display: activeTab === 'map' ? '' : 'none' }}>
  <MapTab
    grid={grid}
    geo={geo}
    isActive={activeTab === 'map'}
    onViewProfile={handleViewProfile}
    onSearchAt={handleSearchAt}
  />
</div>
{activeTab === 'nearby' && <NearbyTab grid={grid} geo={geo} onViewProfile={handleViewProfile} />}
```

---

### 4. MapTab updates (`src/tabs/MapTab.tsx`)

**Removed:**
- `useGrid` and `useGeo` calls
- `overrideLat`, `overrideLng` state
- `gridLat`, `gridLng` computation
- `gridLatRef`, `gridLngRef` — replaced by a single ref that tracks `grid.lat`/`grid.lng` (exposed by the shared `useGrid` return), keeping popup click handlers pointed at current search coords without stale closure values
- Separate discover marker creation and post-discovery `bindPopup`/`openPopup` sequence

**New props interface:**

```ts
interface Props {
  grid: ReturnType<typeof useGrid>
  geo: ReturnType<typeof useGeo>
  isActive: boolean
  onViewProfile: (profile: SelectedProfile) => void
  onSearchAt: (lat: number, lng: number) => void
}
```

**Overflow suppression** reacts to `isActive` instead of mount/unmount:

```ts
useEffect(() => {
  const el = document.getElementById('nkp-content')
  if (!el) return
  el.style.overflow = isActive ? 'hidden' : ''
  el.style.paddingBottom = isActive ? '0' : ''
}, [isActive])
```

**Leaflet resize fix** — called when map becomes visible after `display: none`:

```ts
useEffect(() => {
  if (isActive && mapRef.current) mapRef.current.invalidateSize()
}, [isActive])
```

**`handleSearchHere`** delegates to the App callback:

```ts
const handleSearchHere = () => {
  const center = pendingCenterRef.current
  if (!center) return
  setMapCenterChanged(false)
  searchOriginRef.current = { lat: center.lat, lng: center.lng }
  onSearchAt(center.lat as number, center.lng as number)
}
```

**Discover flow** — on success, patches the pig store and closes the popup. The marker-rendering effect fires automatically, moving the pig's existing marker to the trilaterated position:

```ts
.then((result) => {
  if (!result) return
  grid.patchPigLocation(pig.id, result.lat, result.lng, {
    displayName: result.displayName,
    dopplerMeters: result.dopplerMeters ?? 0,
  })
  marker.closePopup()
})
```

`popupHtml` is updated to accept `EnrichedPig` and append the discover note block when `pig.discoverNote` is present.

---

### 5. NearbyTab updates (`src/tabs/NearbyTab.tsx`)

**Removed:**
- `import { useGeo }` and `import { useGrid }`
- `const geo = useGeo()`
- `const grid = useGrid(...)`
- Both `useEffect` calls

**New props interface:**

```ts
interface Props {
  grid: ReturnType<typeof useGrid>
  geo: ReturnType<typeof useGeo>
  onViewProfile: (p: SelectedProfile) => void
}
```

All render logic (filter bar, spinner, error banner, pig cards, load-more button) is unchanged. Filter dropdowns call `grid.applyFilters()` on the shared instance, affecting both views.

---

## File change summary

| File | Nature of change |
|------|-----------------|
| `src/hooks/useGrid.ts` | Rewrite internal state to accumulating `Map`; add `patchPigLocation`; update all fetch methods to merge |
| `src/App.tsx` | Add `useGeo`, override state, `useGrid`, geo-ready effects, `handleSearchAt`; keep-mount MapTab in wrapper div; update prop passing |
| `src/tabs/MapTab.tsx` | Drop `useGrid`/`useGeo`/override state; add `isActive` + `onSearchAt` props; fix overflow/invalidateSize effects; simplify Discover flow |
| `src/tabs/NearbyTab.tsx` | Drop `useGrid`/`useGeo`/effects; accept `grid` + `geo` as props |
| `src/types/api.types.ts` | No changes — `EnrichedPig` lives in `useGrid.ts` alongside the hook |
