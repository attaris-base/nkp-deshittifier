# Trilateration via Grid — Design Spec

**Date:** 2026-05-22  
**Status:** Approved

---

## Overview

A secondary location-accuracy mechanism that accumulates distance observations from all grid API calls and performs circle-intersection trilateration to determine precise user locations. Complements the existing per-user profile-based discover flow. Triggered manually via the Map tab header and outputs diagnostic console data alongside live map updates.

---

## Goals

1. Accumulate `(probePoint, distanceMeters)` observations for every user seen in any grid response, passively and continuously.
2. On demand, fire 4 targeted grid probes around the current search center to build up sufficient observations per user.
3. Trilaterate positions for any user with 3+ observations using circle-intersection geometry.
4. Verify trilaterated positions via a follow-up grid call from the calculated position; log results to console for diagnostic analysis.
5. Apply trilaterated positions to the map and NearbyTab list.

---

## Data Model

### `src/observationStore.ts` (new file)

Module-level singleton — no React state, persists for the full page session.

```typescript
type GridObservation = {
  probePoint: { lat: number; lng: number }
  distanceMeters: number  // distance_mi * 1609.344
}

const store = new Map<number, GridObservation[]>()  // keyed by userId

export function addGridObservations(
  probePoint: { lat: number; lng: number },
  pigs: Pig[],
): void

export function getObservations(): ReadonlyMap<number, GridObservation[]>
```

`addGridObservations` converts each pig's `distance_mi` to meters and appends a `GridObservation` entry. Multiple calls for the same user accumulate entries; entries are never pruned within a session.

---

## Feeding the Store

`useGrid` calls `addGridObservations({ lat, lng }, response.pigs)` inside `loadPage` after every successful `fetchOinkGrid` response. The probe point is the `lat`/`lng` used for that fetch (from `latRef.current` / `lngRef.current` at call time).

This covers all code paths that call `loadPage`: initial load, refresh, load-more, and search-here. Server-provided `lat`/`lng` fields on `Pig` are ignored — only `distance_mi` is stored.

---

## `trilaterationViaIndex` Function

Lives in `src/geoApi.ts` alongside existing trilateration code.

### Signature

```typescript
export type TrilaterationGridResult = {
  userId: number
  name?: string  // populated during verification from the grid response or grid.pigs fallback
  lat: number
  lng: number
  observationCount: number
}

export async function trilaterationViaIndex(
  searchCenter: { lat: number; lng: number },
): Promise<TrilaterationGridResult[]>
```

### Steps

**1. Compute 4 probe points** using the existing `destinationPoint` helper:

| Probe | Bearing | Offset |
|-------|---------|--------|
| Center | — | 0 |
| North | 0° | 25 mi (40,233.6 m) |
| East | 90° | 25 mi (40,233.6 m) |
| South | 180° | 25 mi (40,233.6 m) |

**2. Fire 4 grid calls in parallel** (`Promise.all`):
```
fetchOinkGrid({ ...probe, radius: 50 })
```
For each response, call `addGridObservations(probe, response.pigs)` immediately — feeds the store and makes these observations available to any subsequent trilateration calls as well.

**3. Read qualifying users** from `getObservations()`. Select users with **3 or more** observations.

**4. Trilaterate each qualifying user:**
- Build `ProbePoint[]` from their observations: `{ lat, lng, distance: distanceMeters }`.
- Generate all unique pairs from the observation list.
- Call `circleIntersections(p1, p2)` on each pair.
- Collect all valid intersection points: single-element results pass through directly; two-candidate results are resolved via `disambiguate(candidates, allUserProbePoints)` where `allUserProbePoints` is the full `ProbePoint[]` for that user (all observations converted, serving as reference distances for picking the correct candidate).
- Average all collected valid points → trilaterated `{ lat, lng }`.
- If no valid intersections exist for a user, skip them.

**Unit note:** `circleIntersections` divides `ProbePoint.distance` by `EARTH_RADIUS_METERS` and expects meters. The existing `getUserDistance` / `trilaterationStep` path has a pre-existing unit inconsistency (passes miles) that is not changed by this work. The grid observation path stores meters from the start, so the math is correct for `trilaterationViaIndex`.

---

## Verification Pass

Runs in `MapTab` immediately after `trilaterationViaIndex` resolves, before applying positions.

For each result, sequentially (not parallel — avoids API hammering):

1. Call `fetchOinkGrid({ lat: result.lat, lng: result.lng, radius: 50 })`.
2. Feed all pigs in the response back to `addGridObservations` — free additional observations.
3. **If the target user appears in the response:** their `distance_mi` is the position error.
4. **If not found:** fall back to `fetchProfileData({ id: result.userId, lat: result.lat, lng: result.lng })` and parse its `distance` string for the error value.

After all verification calls complete:
```typescript
console.table(results.map(r => ({
  userId: r.userId,
  name: r.name,
  calculatedLat: r.lat,
  calculatedLng: r.lng,
  observationCount: r.observationCount,
  verificationErrorMi: r.verificationErrorMi,
  verificationErrorM: Math.round(r.verificationErrorMi * 1609.344),
})))
```

---

## Trigger Mechanism

### Gesture

5 consecutive tap-and-holds on the `nkp-header-title` span ("Map") in `MapTab`.

**Implementation** (refs only — no re-renders):

- `holdCountRef: number` — holds confirmed so far (0–5)
- `holdTimerRef: ReturnType<typeof setTimeout> | null` — 500 ms hold threshold timer
- `resetTimerRef: ReturnType<typeof setTimeout> | null` — 3 s inactivity reset timer

| Event | Action |
|-------|--------|
| `pointerdown` | Start 500 ms `holdTimerRef`. On fire: increment `holdCountRef`, restart 3 s `resetTimerRef`. If count reaches 5: clear both timers, reset count, fire confirm. |
| `pointerup` / `pointercancel` | Cancel `holdTimerRef`. Leave `resetTimerRef` running. |
| 3 s reset fires | Set `holdCountRef` to 0. |

### Confirm dialog

```
window.confirm('Run Trilateration Grid?')
```

If confirmed, invoke the trilateration handler.

---

## MapTab Integration

### New state

```typescript
const [trilaterationLoading, setTrilaterationLoading] = useState(false)
```

Displayed via existing `<Spinner label="Running grid trilateration…" />`.

### Handler flow

```
5 tap-holds on "Map" title
  → window.confirm('Run Trilateration Grid?')
    → setTrilaterationLoading(true)
      → trilaterationViaIndex(searchCenter)        // 4 parallel grid probes
        → sequential verification calls per result
          → console.table(verificationData)
          → grid.patchPigLocation(id, lat, lng)    // no discoverNote
      → setTrilaterationLoading(false)
```

`searchCenter` is `{ lat: gridLatRef.current, lng: gridLngRef.current }` — the current grid search coordinates, not the user's GPS position.

### Error handling

Errors from `trilaterationViaIndex` or the verification pass surface via the existing `discoverError` state and `<ErrorBanner>` component. No new error state needed.

### Position application

`grid.patchPigLocation(result.userId, result.lat, result.lng)` is called for each result — no `discoverNote` argument, so no popup annotation for grid-trilaterated markers. This updates both the map marker and the NearbyTab list entry via the existing `patchPigLocation` mechanism in `useGrid`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/observationStore.ts` | **New** — module-level observation store |
| `src/geoApi.ts` | Add `TrilaterationGridResult` type + `trilaterationViaIndex` function |
| `src/hooks/useGrid.ts` | Call `addGridObservations` in `loadPage` after each successful fetch |
| `src/tabs/MapTab.tsx` | Add trigger gesture, confirm dialog, loading state, handler, `patchPigLocation` calls |
| `src/types/api.types.ts` | No changes |

---

## Out of Scope

- Pigs API (`fetchOinkPigs`) observations — grid is sufficient; pigs can be added later.
- Persisting observations across page reloads.
- Auto-tuning probe distance or count based on verification results.
- UI result display — console output is sufficient for the diagnostic phase.
- Fixing the unit inconsistency in the existing `trilaterationStep` / `getUserDistance` path.
