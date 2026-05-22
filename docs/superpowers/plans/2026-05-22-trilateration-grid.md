# Trilateration via Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a passive observation store that accumulates distance data from every grid API call, a `trilaterationViaIndex` function that fires 4 targeted grid probes and trilateration over all accumulated data, and a 5-tap-hold trigger in MapTab that runs the flow, logs verification results to the console, and applies positions to the map.

**Architecture:** A module-level singleton (`observationStore.ts`) accumulates `(probePoint, distanceMeters)` tuples per userId from every grid fetch; `useGrid` feeds it automatically inside `loadPage`; `trilaterationViaIndex` in `geoApi.ts` fires 4 additional probes, runs circle-intersection trilateration over all users with ≥3 observations, and returns results; MapTab drives the verification pass (one sequential grid call per result, console.table output) and applies positions via the existing `patchPigLocation` mechanism.

**Tech Stack:** TypeScript, Preact, Vite/ESM, Biome (lint + format). No test runner is configured — verification steps use `npm run check` (Biome) and `npm run build` (TypeScript compile) instead of automated tests.

---

## File Map

| File | Change |
|------|--------|
| `src/observationStore.ts` | **New** — `GridObservation` type, module-level store, `addGridObservations`, `getObservations` |
| `src/hooks/useGrid.ts` | Feed store in `loadPage` after each successful grid fetch |
| `src/geoApi.ts` | Add `TrilaterationGridResult` type + `trilaterationViaIndex`; add `fetchOinkGrid` and `observationStore` imports |
| `src/tabs/MapTab.tsx` | Add imports, `trilaterationLoading` state, `handleTrilateration` callback, tap-and-hold gesture refs/handlers, updated JSX |

---

### Task 1: Create the observation store

**Files:**
- Create: `src/observationStore.ts`

- [ ] **Create `src/observationStore.ts` with the module-level store**

```typescript
import type { Pig } from './types/api.types'

export type GridObservation = {
  probePoint: { lat: number; lng: number }
  distanceMeters: number
}

const store = new Map<number, GridObservation[]>()

export function addGridObservations(
  probePoint: { lat: number; lng: number },
  pigs: Pig[],
): void {
  for (const pig of pigs) {
    const obs = store.get(pig.id) ?? []
    obs.push({ probePoint, distanceMeters: pig.distance_mi * 1609.344 })
    store.set(pig.id, obs)
  }
}

export function getObservations(): ReadonlyMap<number, GridObservation[]> {
  return store
}
```

- [ ] **Verify: lint + build**

```
npm run check
npm run build
```

Expected: zero errors, zero warnings.

- [ ] **Commit**

```
git add src/observationStore.ts
git commit -m "feat: add grid observation store"
```

---

### Task 2: Feed the store from `useGrid`

**Files:**
- Modify: `src/hooks/useGrid.ts`

- [ ] **Add import to the top of `useGrid.ts`**

After the existing imports, add:

```typescript
import { addGridObservations } from '../observationStore'
```

- [ ] **Replace the `loadPage` callback in `useGrid.ts`**

Find the current `loadPage`:

```typescript
const loadPage = useCallback(async (page: number, currentFilters: GridFilters) => {
  const params: OinkGridParams = {
    lat: latRef.current,
    lng: lngRef.current,
    radius: currentFilters.radius,
    window: currentFilters.window,
    position: currentFilters.position,
    page,
    page_size: 50,
  }
  return fetchOinkGrid(params) as Promise<Grid>
}, [])
```

Replace it with:

```typescript
const loadPage = useCallback(async (page: number, currentFilters: GridFilters) => {
  const lat = latRef.current
  const lng = lngRef.current
  const params: OinkGridParams = {
    lat,
    lng,
    radius: currentFilters.radius,
    window: currentFilters.window,
    position: currentFilters.position,
    page,
    page_size: 50,
  }
  const result = await fetchOinkGrid(params)
  addGridObservations({ lat, lng }, result.pigs)
  return result as Grid
}, [])
```

`lat` and `lng` are snapshotted before the await so the probe point recorded in the store matches the coordinates that were actually queried.

- [ ] **Verify: lint + build**

```
npm run check
npm run build
```

Expected: zero errors, zero warnings.

- [ ] **Commit**

```
git add src/hooks/useGrid.ts
git commit -m "feat: feed observation store from useGrid loadPage"
```

---

### Task 3: Add `trilaterationViaIndex` to `geoApi.ts`

**Files:**
- Modify: `src/geoApi.ts`

- [ ] **Update the import line at the top of `geoApi.ts`**

Replace:

```typescript
import { fetchGridDistance, fetchProfileData } from './api'
```

With:

```typescript
import { fetchGridDistance, fetchOinkGrid, fetchProfileData } from './api'
import { addGridObservations, getObservations } from './observationStore'
```

- [ ] **Append `TrilaterationGridResult` and `trilaterationViaIndex` to the end of `geoApi.ts`**

Add after the closing brace of the existing `getUserLocation` constant:

```typescript
// ─── Trilateration via grid index ─────────────────────────────────────────────

export type TrilaterationGridResult = {
  userId: number
  name?: string
  lat: number
  lng: number
  observationCount: number
}

/**
 * Fires 4 grid probes around `searchCenter` (center, 25 mi N/E/S), feeds all
 * results into the observation store, then trilateration-locates every user
 * that has accumulated ≥3 observations (including any from prior normal fetches).
 * Distances are stored in meters, so `circleIntersections` receives the correct
 * unit (unlike the existing profile-based path which has a pre-existing miles/meters
 * mismatch that this function does not inherit).
 */
export async function trilaterationViaIndex(
  searchCenter: { lat: number; lng: number },
): Promise<TrilaterationGridResult[]> {
  const PROBE_OFFSET_M = 25 * 1609.344

  const probePoints = [
    searchCenter,
    destinationPoint(searchCenter.lat, searchCenter.lng, PROBE_OFFSET_M, 0),
    destinationPoint(searchCenter.lat, searchCenter.lng, PROBE_OFFSET_M, 90),
    destinationPoint(searchCenter.lat, searchCenter.lng, PROBE_OFFSET_M, 180),
  ]

  await Promise.all(
    probePoints.map(async (probe) => {
      const res = await fetchOinkGrid({ lat: probe.lat, lng: probe.lng, radius: 50 })
      addGridObservations(probe, res.pigs)
    }),
  )

  const observations = getObservations()
  const results: TrilaterationGridResult[] = []

  for (const [userId, obs] of observations) {
    if (obs.length < 3) continue

    const pts: ProbePoint[] = obs.map((o) => ({
      lat: o.probePoint.lat,
      lng: o.probePoint.lng,
      distance: o.distanceMeters,
    }))

    const validPoints: GeoPoint[] = []

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const p1 = pts[i]
        const p2 = pts[j]
        if (p1.lat === p2.lat && p1.lng === p2.lng) continue
        const candidates = circleIntersections(p1, p2)
        if (!candidates) continue
        if (candidates.length === 1) {
          validPoints.push(candidates[0])
        } else {
          validPoints.push(disambiguate(candidates as [GeoPoint, GeoPoint], pts))
        }
      }
    }

    if (validPoints.length === 0) continue

    const lat = validPoints.reduce((s, p) => s + p.lat, 0) / validPoints.length
    const lng = validPoints.reduce((s, p) => s + p.lng, 0) / validPoints.length

    results.push({ userId, lat, lng, observationCount: obs.length })
  }

  return results
}
```

- [ ] **Verify: lint + build**

```
npm run check
npm run build
```

Expected: zero errors, zero warnings.

- [ ] **Commit**

```
git add src/geoApi.ts
git commit -m "feat: add trilaterationViaIndex to geoApi"
```

---

### Task 4: Wire trigger and handler in `MapTab.tsx`

**Files:**
- Modify: `src/tabs/MapTab.tsx`

- [ ] **Replace the import block at the top of `MapTab.tsx` (lines 1–8)**

```typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { SelectedProfile } from '../App'
import { fetchOinkGrid, fetchProfileData } from '../api'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import { getUserLocation, trilaterationViaIndex } from '../geoApi'
import type { GeoReturn } from '../hooks/useGeo'
import type { EnrichedPig, GridReturn } from '../hooks/useGrid'
import { addGridObservations } from '../observationStore'
```

- [ ] **Add `trilaterationLoading` state inside `MapTab`**

After the existing line:
```typescript
const [discoverError, setDiscoverError] = useState<string | null>(null)
```

Add:
```typescript
const [trilaterationLoading, setTrilaterationLoading] = useState(false)
```

- [ ] **Add `handleTrilateration` callback and its ref after the `handleDiscoverUserRef` block**

The `handleDiscoverUserRef` block ends with:
```typescript
useEffect(() => {
  handleDiscoverUserRef.current = handleDiscoverUser
}, [handleDiscoverUser])
```

Immediately after it, add:

```typescript
const handleTrilateration = useCallback(async () => {
  setTrilaterationLoading(true)
  setDiscoverError(null)
  try {
    const results = await trilaterationViaIndex({
      lat: gridLatRef.current,
      lng: gridLngRef.current,
    })

    const verificationData: Array<{
      userId: number
      name: string | undefined
      calculatedLat: number
      calculatedLng: number
      observationCount: number
      verificationErrorMi: number
      verificationErrorM: number
    }> = []

    for (const result of results) {
      let verificationErrorMi = 0
      let name: string | undefined

      try {
        const gridRes = await fetchOinkGrid({ lat: result.lat, lng: result.lng, radius: 50 })
        addGridObservations({ lat: result.lat, lng: result.lng }, gridRes.pigs)
        const found = gridRes.pigs.find((p) => p.id === result.userId)
        if (found) {
          verificationErrorMi = found.distance_mi
          name = found.name
        } else {
          const profile = await fetchProfileData({
            id: result.userId,
            lat: result.lat,
            lng: result.lng,
          })
          const ds = profile.distance
          verificationErrorMi = ds[0] === '<' ? 0 : +ds.slice(0, ds.length - 3)
          name = profile.nick
        }
      } catch {}

      patchPigLocationRef.current(result.userId, result.lat, result.lng)
      verificationData.push({
        userId: result.userId,
        name,
        calculatedLat: result.lat,
        calculatedLng: result.lng,
        observationCount: result.observationCount,
        verificationErrorMi,
        verificationErrorM: Math.round(verificationErrorMi * 1609.344),
      })
    }

    console.table(verificationData)
  } catch (err) {
    setDiscoverError(err instanceof Error ? err.message : 'Trilateration failed')
  } finally {
    setTrilaterationLoading(false)
  }
}, [])

const handleTrilaterationRef = useRef(handleTrilateration)
useEffect(() => {
  handleTrilaterationRef.current = handleTrilateration
}, [handleTrilateration])
```

- [ ] **Add tap-and-hold gesture refs, cleanup effect, and handlers after the `handleTrilaterationRef` block**

```typescript
const holdCountRef = useRef(0)
const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  return () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
  }
}, [])

const handleTitlePointerDown = useCallback(() => {
  holdTimerRef.current = setTimeout(() => {
    holdCountRef.current += 1
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => {
      holdCountRef.current = 0
    }, 3000)
    if (holdCountRef.current >= 5) {
      holdCountRef.current = 0
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
      if (window.confirm('Run Trilateration Grid?')) {
        void handleTrilaterationRef.current()
      }
    }
  }, 500)
}, [])

const handleTitlePointerUp = useCallback(() => {
  if (holdTimerRef.current) {
    clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }
}, [])
```

- [ ] **Add the trilateration spinner to the JSX**

After the existing line:
```tsx
{discoverLoading && <Spinner label="Discovering user…" />}
```

Add:
```tsx
{trilaterationLoading && <Spinner label="Running grid trilateration…" />}
```

- [ ] **Replace the plain header title span with the gesture-wired version**

Find:
```tsx
<span class="nkp-header-title">Map</span>
```

Replace with:
```tsx
<span
  class="nkp-header-title"
  onPointerDown={handleTitlePointerDown}
  onPointerUp={handleTitlePointerUp}
  onPointerCancel={handleTitlePointerUp}
  style={{ userSelect: 'none', touchAction: 'none' }}
>
  Map
</span>
```

`userSelect: 'none'` prevents the browser from selecting the text on long press; `touchAction: 'none'` prevents competing browser touch behaviours.

- [ ] **Verify: lint + build**

```
npm run check
npm run build
```

Expected: zero errors, zero warnings.

- [ ] **Commit**

```
git add src/tabs/MapTab.tsx
git commit -m "feat: add grid trilateration trigger and handler to MapTab"
```

---

## Manual Test Checklist

After all tasks are complete, test on [nastykinkpigs.com](https://nastykinkpigs.com) with the dev bookmarklet:

1. **Passive accumulation** — open Nearby tab, scroll through results; open devtools console and run `window.__obsStore` (not exposed, so verify indirectly: trigger trilateration and confirm observation counts in the console table are > 4 for active users).
2. **Trigger gesture** — on the Map tab, tap-and-hold the "Map" title 5 times within ~3s between each; confirm the `window.confirm` dialog appears.
3. **Trilateration runs** — confirm the "Running grid trilateration…" spinner appears while the 4 probes + verification calls run.
4. **Console output** — in devtools, confirm `console.table` printed a table with columns `userId`, `name`, `calculatedLat`, `calculatedLng`, `observationCount`, `verificationErrorMi`, `verificationErrorM`.
5. **Map updates** — confirm that markers for trilaterated users moved to new positions on the map.
6. **Zero result case** — if no users have ≥3 observations yet, confirm spinner dismisses cleanly and console table shows an empty array with no errors.
7. **Error case** — disconnect network mid-run; confirm `ErrorBanner` appears with an error message.
