# Shared Pig Store + Map Position Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-tab isolated `useGrid` instances with a single accumulating pig store in App, keep MapTab always mounted to preserve map position across tab switches, and simplify the Discover flow so patching a pig's location automatically moves its map marker.

**Architecture:** `useGrid` is rewritten to accumulate pigs in a `Map<id, EnrichedPig>` rather than replacing pages on each fetch. App hoists `useGeo`, `useGrid`, and the search-location override; both NearbyTab and MapTab receive `grid` and `geo` as props. MapTab is wrapped in an always-rendered div (hidden via `display: none` when inactive) so its Leaflet instance and pan position survive tab switches.

**Tech Stack:** Preact 10, TypeScript, Vite (IIFE build), Biome 2.x. No test framework — correctness is verified with `npm run build` (TypeScript compilation) and `npm run check` (Biome lint + format).

---

## File Map

| File | Change |
|------|--------|
| `src/hooks/useGrid.ts` | Full rewrite: `Map`-based accumulating store, `EnrichedPig` type, `patchPigLocation`, expose `lat`/`lng`, export `GridReturn` |
| `src/hooks/useGeo.ts` | Add one-line `GeoReturn` type export |
| `src/App.tsx` | Hoist `useGeo`/`useGrid`/override state; add geo-ready effect; add `handleSearchAt`; keep-mount MapTab; update prop passing to both tabs |
| `src/tabs/NearbyTab.tsx` | Remove internal hooks + effects; accept `grid`/`geo` as props |
| `src/tabs/MapTab.tsx` | Remove internal hooks/override state; add `isActive`/`onSearchAt` props; fix overflow + invalidateSize effects; simplify Discover flow; update `popupHtml` to accept `EnrichedPig` |

---

### Task 1: Rewrite useGrid.ts as an accumulating pig store

**Files:**
- Modify: `src/hooks/useGrid.ts`
- Modify: `src/hooks/useGeo.ts`

- [ ] **Step 1: Replace the full contents of `src/hooks/useGrid.ts`**

```ts
import { useCallback, useRef, useState } from 'preact/hooks'
import { fetchOinkGrid } from '../api'
import type { Grid, OinkGridParams, Pig } from '../types/api.types'

export type LocationSource = 'api' | 'discover'

export interface EnrichedPig extends Pig {
  locationSource: LocationSource
  discoverNote?: { displayName: string; dopplerMeters: number }
}

export interface GridFilters {
  radius: number
  window: string
  position: string
}

export const DEFAULT_FILTERS: GridFilters = {
  radius: 25,
  window: '24h',
  position: 'all',
}

interface GridState {
  pigs: Map<number, EnrichedPig>
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  currentSearchPage: number
}

function mergePig(existing: EnrichedPig | undefined, incoming: Pig): EnrichedPig {
  if (!existing) return { ...incoming, locationSource: 'api' }
  if (existing.locationSource === 'discover')
    return {
      ...incoming,
      lat: existing.lat,
      lng: existing.lng,
      locationSource: 'discover',
      discoverNote: existing.discoverNote,
    }
  return { ...incoming, locationSource: 'api' }
}

export function useGrid(lat: number, lng: number) {
  const [filters, setFilters] = useState<GridFilters>(DEFAULT_FILTERS)
  const [state, setState] = useState<GridState>({
    pigs: new Map(),
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: false,
    currentSearchPage: 0,
  })
  const latRef = useRef(lat)
  const lngRef = useRef(lng)
  latRef.current = lat
  lngRef.current = lng

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

  const load = useCallback(
    async (f: GridFilters) => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const first = await loadPage(0, f)
        setState((s) => {
          const newPigs = new Map(s.pigs)
          for (const pig of first.pigs) {
            newPigs.set(pig.id, mergePig(newPigs.get(pig.id), pig))
          }
          return {
            ...s,
            loading: false,
            pigs: newPigs,
            hasMore: first.has_more,
            currentSearchPage: 0,
          }
        })
      } catch (e) {
        setState((s) => ({ ...s, loading: false, error: (e as Error).message ?? 'Network error' }))
      }
    },
    [loadPage],
  )

  const loadMore = useCallback(async () => {
    if (!state.hasMore) return
    const nextPage = state.currentSearchPage + 1
    setState((s) => ({ ...s, loadingMore: true }))
    try {
      const next = await loadPage(nextPage, filters)
      setState((s) => {
        const newPigs = new Map(s.pigs)
        for (const pig of next.pigs) {
          newPigs.set(pig.id, mergePig(newPigs.get(pig.id), pig))
        }
        return {
          ...s,
          loadingMore: false,
          pigs: newPigs,
          hasMore: next.has_more,
          currentSearchPage: nextPage,
        }
      })
    } catch (e) {
      setState((s) => ({
        ...s,
        loadingMore: false,
        error: (e as Error).message ?? 'Network error',
      }))
    }
  }, [state.hasMore, state.currentSearchPage, filters, loadPage])

  const applyFilters = useCallback(
    (f: Partial<GridFilters>) => {
      const next = { ...filters, ...f }
      setFilters(next)
      load(next)
    },
    [filters, load],
  )

  const refresh = useCallback(() => load(filters), [load, filters])

  const searchAt = useCallback(
    (searchLat: number, searchLng: number) => {
      latRef.current = searchLat
      lngRef.current = searchLng
      load(filters)
    },
    [load, filters],
  )

  const patchPigLocation = useCallback(
    (
      id: number,
      pigLat: number,
      pigLng: number,
      note?: { displayName: string; dopplerMeters: number },
    ) => {
      setState((s) => {
        const existing = s.pigs.get(id)
        if (!existing) return s
        const newPigs = new Map(s.pigs)
        newPigs.set(id, {
          ...existing,
          lat: pigLat,
          lng: pigLng,
          locationSource: 'discover',
          discoverNote: note,
        })
        return { ...s, pigs: newPigs }
      })
    },
    [],
  )

  const pigs = Array.from(state.pigs.values())

  return {
    pigs,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: state.hasMore,
    filters,
    applyFilters,
    refresh,
    loadMore,
    searchAt,
    patchPigLocation,
    lat: latRef.current,
    lng: lngRef.current,
  }
}

export type GridReturn = ReturnType<typeof useGrid>
```

- [ ] **Step 2: Add `GeoReturn` type export to `src/hooks/useGeo.ts`**

Append this line at the end of `src/hooks/useGeo.ts`, after the closing brace of `useGeo`:

```ts
export type GeoReturn = ReturnType<typeof useGeo>
```

- [ ] **Step 3: Verify the build passes**

```
npm run build
```

Expected: exits 0 with no TypeScript errors. NearbyTab and MapTab still call `useGrid` locally at this point — that's intentional and correct for this step.

- [ ] **Step 4: Commit**

```
git add src/hooks/useGrid.ts src/hooks/useGeo.ts
git commit -m "feat(grid): rewrite useGrid as accumulating pig store with patchPigLocation"
```

---

### Task 2: Hoist location state to App.tsx; update NearbyTab to accept props

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/tabs/NearbyTab.tsx`

After this task, NearbyTab uses the shared grid. MapTab still uses its own local `useGrid` — that's intentional and will be fixed in Task 3. The build must pass with both in flight.

- [ ] **Step 1: Replace the full contents of `src/App.tsx`**

```tsx
import { useEffect, useState } from 'preact/hooks'
import { TabBar } from './components/TabBar'
// ── MAP FEATURE import (remove to disable) ───────────────────────────────────
import { MapTab } from './tabs/MapTab'
import { MessagesTab } from './tabs/MessagesTab'
import { NearbyTab } from './tabs/NearbyTab'
import { ProfileTab } from './tabs/ProfileTab'
// ─────────────────────────────────────────────────────────────────────────────
import { useGeo } from './hooks/useGeo'
import { useGrid } from './hooks/useGrid'

export type TabId = 'messages' | 'nearby' | 'profile' | 'map'

export interface SelectedProfile {
  id: number
  lat: number
  lng: number
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('messages')
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null)
  const [pendingThreadId, setPendingThreadId] = useState<number | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [overrideLat, setOverrideLat] = useState<number | null>(null)
  const [overrideLng, setOverrideLng] = useState<number | null>(null)

  const geo = useGeo()
  const gridLat = overrideLat ?? geo.lat ?? 0
  const gridLng = overrideLng ?? geo.lng ?? 0
  const grid = useGrid(gridLat, gridLng)

  useEffect(() => {
    geo.request()
  }, [])

  useEffect(() => {
    if (geo.lat != null && geo.lng != null && !geo.loading) grid.refresh()
  }, [geo.lat, geo.lng, geo.loading])

  function handleViewProfile(profile: SelectedProfile) {
    setSelectedProfile(profile)
    setActiveTab('profile')
  }

  function handleOpenThread(threadId: number) {
    setPendingThreadId(threadId)
    setActiveTab('messages')
  }

  function handleThreadOpened() {
    setPendingThreadId(null)
  }

  return (
    <div id="nkp-app">
      <div id="nkp-content">
        {activeTab === 'messages' && (
          <MessagesTab
            onViewProfile={handleViewProfile}
            pendingThreadId={pendingThreadId}
            onThreadOpened={handleThreadOpened}
            onUnreadChange={setUnreadCount}
          />
        )}
        {activeTab === 'nearby' && (
          <NearbyTab grid={grid} geo={geo} onViewProfile={handleViewProfile} />
        )}
        {activeTab === 'profile' && (
          <ProfileTab profile={selectedProfile} onOpenThread={handleOpenThread} />
        )}
        {/* ── MAP FEATURE render (remove to disable) ── */}
        {activeTab === 'map' && <MapTab onViewProfile={handleViewProfile} />}
        {/* ─────────────────────────────────────────── */}
      </div>
      <TabBar active={activeTab} onChange={setActiveTab} unreadCount={unreadCount} />
    </div>
  )
}
```

Note: MapTab still uses its own `useGrid`/`useGeo` and only receives `onViewProfile`. That's correct for this step.

- [ ] **Step 2: Replace the full contents of `src/tabs/NearbyTab.tsx`**

```tsx
import type { SelectedProfile } from '../App'
import { Avatar } from '../components/Avatar'
import { DopplerBadge } from '../components/DopplerBadge'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import type { GeoReturn } from '../hooks/useGeo'
import type { GridReturn } from '../hooks/useGrid'
import type { Heat, Pig } from '../types/api.types'

interface Props {
  grid: GridReturn
  geo: GeoReturn
  onViewProfile: (p: SelectedProfile) => void
}

const WINDOW_OPTIONS = ['1h', '6h', '24h', '7d'] as const
const POSITION_OPTIONS = [
  { value: 'all', label: 'Any position' },
  { value: 'hungryhole', label: 'Hungry hole' },
  { value: 'angrytop', label: 'Angry top' },
  { value: 'veryversatile', label: 'Very versatile' },
  { value: 'anythinggoes', label: 'Anything goes' },
]

function HeatLabel({ heat }: { heat: Heat }) {
  if (heat === 'live') return <span class="nkp-heat-live">● LIVE</span>
  if (heat === 'warm') return <span class="nkp-heat-warm">● WARM</span>
  return <span class="nkp-heat-stale">● {heat}</span>
}

function UserCard({ pig, onSelect }: { pig: Pig; onSelect: () => void }) {
  const ringColor = pig.doppler?.hue_oklch ?? undefined
  return (
    <button type="button" class="nkp-user-card" onClick={onSelect}>
      <div style={{ position: 'relative' }}>
        <Avatar
          src={pig.avatar}
          name={pig.name}
          ringColor={ringColor}
          badge={pig.unread_count > 0 ? pig.unread_count : undefined}
        />
      </div>
      <div class="nkp-user-info">
        <div class="nkp-user-name">{pig.name}</div>
        <div class="nkp-user-meta">
          {pig.age && <span class="nkp-user-detail">{pig.age}</span>}
          {pig.position && <span class="nkp-user-detail">{pig.position}</span>}
          <HeatLabel heat={pig.heat} />
        </div>
        <DopplerBadge doppler={pig.doppler} distance={pig.distance_str} />
      </div>
    </button>
  )
}

export function NearbyTab({ grid, geo, onViewProfile }: Props) {
  if (geo.denied) {
    return (
      <div>
        <div class="nkp-header">
          <span class="nkp-header-title">Nearby</span>
        </div>
        <div class="nkp-empty">
          <div class="nkp-empty-icon">📍</div>
          <div class="nkp-empty-title">Location access needed</div>
          <div class="nkp-empty-sub">
            Allow location access in your browser settings, then tap retry.
          </div>
          <button
            type="button"
            class="nkp-btn nkp-btn-outline"
            style={{ marginTop: '16px' }}
            onClick={() => geo.request()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div class="nkp-header">
        <span class="nkp-header-title">Nearby</span>
        <button type="button" class="nkp-header-action" onClick={grid.refresh} aria-label="Refresh">
          ↻
        </button>
      </div>

      <div class="nkp-filters">
        <select
          class="nkp-filter-select"
          value={grid.filters.radius}
          onChange={(e) =>
            grid.applyFilters({ radius: Number((e.target as HTMLSelectElement).value) })
          }
          aria-label="Radius"
        >
          {[5, 10, 25, 50, 100].map((r) => (
            <option key={r} value={r}>
              {r} mi
            </option>
          ))}
        </select>

        <select
          class="nkp-filter-select"
          value={grid.filters.window}
          onChange={(e) => grid.applyFilters({ window: (e.target as HTMLSelectElement).value })}
          aria-label="Time window"
        >
          {WINDOW_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        <select
          class="nkp-filter-select"
          value={grid.filters.position}
          onChange={(e) => grid.applyFilters({ position: (e.target as HTMLSelectElement).value })}
          aria-label="Position"
        >
          {POSITION_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {(geo.loading || grid.loading) && <Spinner label="Finding nearby users…" />}
      {grid.error && !grid.loading && <ErrorBanner message={grid.error} onRetry={grid.refresh} />}

      {!grid.loading && grid.pigs.length === 0 && !grid.error && (
        <div class="nkp-empty">
          <div class="nkp-empty-icon">⊕</div>
          <div class="nkp-empty-title">Nobody nearby</div>
          <div class="nkp-empty-sub">Try expanding the radius or time window</div>
        </div>
      )}

      {grid.pigs.map((pig) => (
        <UserCard
          key={pig.id}
          pig={pig}
          onSelect={() => onViewProfile({ id: pig.id, lat: geo.lat ?? 0, lng: geo.lng ?? 0 })}
        />
      ))}

      {grid.hasMore && (
        <button
          type="button"
          class="nkp-load-more"
          onClick={grid.loadMore}
          disabled={grid.loadingMore}
        >
          {grid.loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify the build passes**

```
npm run build
```

Expected: exits 0. MapTab still compiles fine because it still uses its own internal `useGrid`/`useGeo` and still accepts only `onViewProfile`.

- [ ] **Step 4: Commit**

```
git add src/App.tsx src/tabs/NearbyTab.tsx
git commit -m "feat(nearby): hoist geo/grid to App; NearbyTab accepts grid+geo as props"
```

---

### Task 3: Update MapTab.tsx; complete App.tsx wiring

**Files:**
- Modify: `src/tabs/MapTab.tsx`
- Modify: `src/App.tsx`

This task removes MapTab's local `useGrid`/`useGeo`, wires it to the shared store, keeps it always mounted, fixes the overflow/resize effects, and simplifies the Discover flow.

- [ ] **Step 1: Replace the full contents of `src/tabs/MapTab.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { SelectedProfile } from '../App'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import { getUserLocation } from '../geoApi'
import type { GeoReturn } from '../hooks/useGeo'
import type { EnrichedPig, GridReturn } from '../hooks/useGrid'

// ── MAP FEATURE ───────────────────────────────────────────────────────────────
// All map code lives here. To remove: delete this file, remove the MapTab
// import + render block in App.tsx (marked with MAP FEATURE comments), swap
// the 'map' tab entry back to 'profile' in TabBar.tsx, and delete the
// /* Map Tab */ section from src/styles/index.ts.
// ─────────────────────────────────────────────────────────────────────────────

const LEAFLET_VERSION = '1.9.4'

// Leaflet loaded from CDN to keep bundle under 50 KB gzip target
// biome-ignore lint/suspicious/noExplicitAny: Leaflet CDN global, no type defs installed
declare const L: any

// Module-level promise prevents concurrent CDN injection on rapid mount/unmount
let leafletLoading: Promise<void> | null = null

function injectLeaflet(): Promise<void> {
  if ('L' in window) return Promise.resolve()
  if (leafletLoading) return leafletLoading

  if (!document.getElementById('nkp-leaflet-css')) {
    const link = document.createElement('link')
    link.id = 'nkp-leaflet-css'
    link.rel = 'stylesheet'
    link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`
    document.head.appendChild(link)
  }

  leafletLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Leaflet'))
    document.head.appendChild(script)
  })
  return leafletLoading
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function initial(pig: EnrichedPig): string {
  return pig.name ? pig.name.charAt(0).toUpperCase() : '?'
}

function markerHtml(pig: EnrichedPig): string {
  if (pig.avatar) {
    return `<div class="nkp-map-pin"><img src="${esc(pig.avatar)}" class="nkp-map-pin-img" alt="${esc(pig.name)}" /></div>`
  }
  return `<div class="nkp-map-pin nkp-map-pin--init">${initial(pig)}</div>`
}

function avatarHtml(pig: EnrichedPig): string {
  if (pig.avatar) {
    return `<img src="${esc(pig.avatar)}" class="nkp-map-avatar nkp-map-avatar--lg" alt="${esc(pig.name)}" />`
  }
  return `<div class="nkp-map-avatar nkp-map-avatar--lg nkp-map-avatar--init">${initial(pig)}</div>`
}

function popupHtml(pig: EnrichedPig): string {
  const main =
    `<div class="nkp-map-popup">` +
    `<div class="nkp-map-corner-tl"></div>` +
    `<div class="nkp-map-corner-br"></div>` +
    `${avatarHtml(pig)}` +
    `<div class="nkp-map-popup-name">${esc(pig.name)}</div>` +
    `<div class="nkp-map-popup-meta">${pig.age ?? '?'} · ${esc(pig.position)} · ${esc(pig.distance_str)}</div>` +
    `<button type="button" class="nkp-btn nkp-btn-primary nkp-btn-full nkp-map-popup-btn" data-pig-id="${pig.id}">View Profile</button>` +
    `</div>`
  if (!pig.discoverNote) return main
  const gmapsUrl = `https://maps.google.com/?q=${pig.lat},${pig.lng}`
  return (
    main +
    `<div class="nkp-map-discover-note">` +
    `<div class="nkp-map-discover-place">${esc(pig.discoverNote.displayName)}</div>` +
    `<div class="nkp-map-discover-dist">${esc(pig.name)} is ${Math.round(pig.discoverNote.dopplerMeters)} m from ${esc(pig.discoverNote.displayName)}</div>` +
    `<a class="nkp-map-discover-gmaps" href="${esc(gmapsUrl)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>` +
    `</div>`
  )
}

interface Props {
  grid: GridReturn
  geo: GeoReturn
  isActive: boolean
  onViewProfile: (profile: SelectedProfile) => void
  onSearchAt: (lat: number, lng: number) => void
}

export function MapTab({ grid, geo, isActive, onViewProfile, onSearchAt }: Props) {
  const [mapCenterChanged, setMapCenterChanged] = useState(false)
  // biome-ignore lint/suspicious/noExplicitAny: Leaflet CDN global, no type defs installed
  const pendingCenterRef = useRef<any>(null)
  const searchOriginRef = useRef<{ lat: number; lng: number } | null>(null)

  // biome-ignore lint/suspicious/noExplicitAny: Leaflet CDN global, no type defs installed
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // biome-ignore lint/suspicious/noExplicitAny: Leaflet CDN global, no type defs installed
  const markersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverError, setDiscoverError] = useState<string | null>(null)

  const handleDiscoverUser = useCallback(async (userId: number, lat: number, lng: number) => {
    setDiscoverLoading(true)
    setDiscoverError(null)
    try {
      return await getUserLocation(userId, lat, lng)
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : 'Discover failed')
      return null
    } finally {
      setDiscoverLoading(false)
    }
  }, [])

  const handleDiscoverUserRef = useRef(handleDiscoverUser)
  useEffect(() => {
    handleDiscoverUserRef.current = handleDiscoverUser
  }, [handleDiscoverUser])

  const patchPigLocationRef = useRef(grid.patchPigLocation)
  useEffect(() => {
    patchPigLocationRef.current = grid.patchPigLocation
  }, [grid.patchPigLocation])

  // Keep popup click handlers pointed at the latest search coords without stale closures
  const gridLatRef = useRef(grid.lat)
  const gridLngRef = useRef(grid.lng)
  useEffect(() => {
    gridLatRef.current = grid.lat
    gridLngRef.current = grid.lng
  }, [grid.lat, grid.lng])

  // Apply/remove overflow suppression based on whether the map tab is visible
  useEffect(() => {
    const el = document.getElementById('nkp-content')
    if (!el) return
    el.style.overflow = isActive ? 'hidden' : ''
    el.style.paddingBottom = isActive ? '0' : ''
  }, [isActive])

  // After display:none → visible, Leaflet must recalculate tile layout
  useEffect(() => {
    if (isActive && mapRef.current) mapRef.current.invalidateSize()
  }, [isActive])

  // Initialize once — guarded by mapRef.current so GPS drift doesn't destroy/recreate the map
  useEffect(() => {
    if (!containerRef.current || geo.lat == null || geo.lng == null || mapRef.current) return
    let cancelled = false
    const snapLat = geo.lat
    const snapLng = geo.lng

    injectLeaflet()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const map = L.map(containerRef.current, { zoomControl: true }).setView(
          [snapLat, snapLng],
          14,
        )
        // nkp-map-tiles applies a CSS filter to fade the basemap so user pins stand out
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://openstreetmap.org">OSM</a> contributors',
          maxZoom: 19,
          className: 'nkp-map-tiles',
        }).addTo(map)

        searchOriginRef.current = { lat: snapLat, lng: snapLng }

        let initialMove = true
        map.on('moveend', () => {
          if (initialMove) {
            initialMove = false
            return
          }
          const center = map.getCenter()
          pendingCenterRef.current = center

          const origin = searchOriginRef.current
          if (!origin) {
            setMapCenterChanged(true)
            return
          }
          const distFromOrigin = map.distance(center, [origin.lat, origin.lng])
          const bounds = map.getBounds()
          const viewportWidth = map.distance(bounds.getSouthWest(), bounds.getSouthEast())
          setMapCenterChanged(distFromOrigin > viewportWidth / 2)
        })

        mapRef.current = map
        setMapReady(true)
      })
      .catch(() => {
        // CDN load failure — user can retry via the ↻ button
      })

    return () => {
      cancelled = true
    }
  }, [geo.lat, geo.lng])

  // Destroy map only when the component actually unmounts (page unload)
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    for (const m of markersRef.current) {
      m.remove()
    }
    markersRef.current = []

    for (const pig of grid.pigs) {
      if (!pig.lat || !pig.lng) continue

      const icon = L.divIcon({
        html: markerHtml(pig),
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24],
      })

      const marker = L.marker([pig.lat, pig.lng], { icon })
      marker.bindPopup(popupHtml(pig), { className: 'nkp-map-leaflet-popup', maxWidth: 180 })

      marker.on('popupopen', () => {
        const controller = new AbortController()
        const { signal } = controller
        marker.once('popupclose', () => controller.abort())

        const popupEl = marker.getPopup()?.getElement()

        const btn = popupEl?.querySelector(
          `.nkp-map-popup-btn[data-pig-id="${pig.id}"]`,
        ) as HTMLElement | null
        btn?.addEventListener(
          'click',
          () => {
            onViewProfile({ id: pig.id, lat: gridLatRef.current, lng: gridLngRef.current })
            map.closePopup()
          },
          { once: true, signal },
        )

        const wrapper = popupEl?.querySelector(
          '.leaflet-popup-content-wrapper',
        ) as HTMLElement | null

        const resetWrapper = () => {
          wrapper?.classList.remove('nkp-popup-armed')
          if (wrapper) {
            wrapper.style.transition = ''
            wrapper.style.borderWidth = ''
            wrapper.style.borderColor = ''
          }
        }

        resetWrapper()

        let tlPrimed = false
        let armed = false

        const tlEl = popupEl?.querySelector('.nkp-map-corner-tl') as HTMLElement | null
        const brEl = popupEl?.querySelector('.nkp-map-corner-br') as HTMLElement | null
        const avatarEl = popupEl?.querySelector('.nkp-map-avatar') as HTMLElement | null
        const popupDiv = popupEl?.querySelector('.nkp-map-popup') as HTMLElement | null
        const viewProfileBtn = popupEl?.querySelector('.nkp-map-popup-btn') as HTMLElement | null

        tlEl?.addEventListener(
          'click',
          () => {
            armed = false
            resetWrapper()
            tlPrimed = true
            if (popupDiv) popupDiv.style.paddingBottom = '20px'
            if (viewProfileBtn) {
              viewProfileBtn.style.paddingTop = '4px'
              viewProfileBtn.style.paddingBottom = '4px'
            }
          },
          { signal },
        )

        brEl?.addEventListener(
          'click',
          () => {
            if (!tlPrimed) return
            tlPrimed = false
            armed = true
            if (wrapper) {
              wrapper.style.transition = 'border-width 0.2s ease'
              wrapper.style.borderWidth = '6px'
              setTimeout(() => {
                if (!armed) return
                wrapper.style.transition = 'border-color 0.25s ease'
                wrapper.style.borderColor = 'hsl(0,100%,65%)'
                setTimeout(() => {
                  if (!armed) return
                  wrapper.style.transition = ''
                  wrapper.style.borderColor = ''
                  wrapper.classList.add('nkp-popup-armed')
                }, 300)
              }, 250)
            }
          },
          { signal },
        )

        avatarEl?.addEventListener(
          'click',
          () => {
            if (!armed) return
            const popup = avatarEl.closest('.nkp-map-popup')
            if (!popup || popup.querySelector('.nkp-map-discover-menu')) return
            armed = false
            resetWrapper()

            const label = document.createElement('div')
            label.className = 'nkp-map-discover-label'
            label.textContent = 'Discover User'

            const confirmBtn = document.createElement('button')
            confirmBtn.type = 'button'
            confirmBtn.className = 'nkp-btn nkp-btn-primary nkp-btn-full nkp-map-discover-confirm'
            confirmBtn.textContent = 'Discover User'

            const dismissBtn = document.createElement('button')
            dismissBtn.type = 'button'
            dismissBtn.className = 'nkp-btn nkp-btn-outline nkp-btn-full nkp-map-discover-dismiss'
            dismissBtn.textContent = 'Dismiss'

            const menu = document.createElement('div')
            menu.className = 'nkp-map-discover-menu'
            menu.appendChild(label)
            menu.appendChild(confirmBtn)
            menu.appendChild(dismissBtn)

            confirmBtn.addEventListener(
              'click',
              () => {
                menu.remove()
                void handleDiscoverUserRef
                  .current(pig.id, pig.lat ?? 0, pig.lng ?? 0)
                  .then((result) => {
                    if (!result) return
                    patchPigLocationRef.current(pig.id, result.lat, result.lng, {
                      displayName: result.displayName,
                      dopplerMeters: result.dopplerMeters ?? 0,
                    })
                    marker.closePopup()
                  })
              },
              { once: true },
            )
            dismissBtn.addEventListener('click', () => menu.remove(), { once: true })

            popup.appendChild(menu)
          },
          { signal },
        )
      })

      marker.addTo(map)
      markersRef.current.push(marker)
    }
  }, [grid.pigs, mapReady])

  const handleSearchHere = () => {
    const center = pendingCenterRef.current
    if (!center) return
    setMapCenterChanged(false)
    searchOriginRef.current = { lat: center.lat as number, lng: center.lng as number }
    onSearchAt(center.lat as number, center.lng as number)
  }

  if (geo.denied) {
    return (
      <div>
        <div class="nkp-header">
          <span class="nkp-header-title">Map</span>
        </div>
        <div class="nkp-empty">
          <div class="nkp-empty-icon">📍</div>
          <div class="nkp-empty-title">Location access needed</div>
          <div class="nkp-empty-sub">
            Allow location access in your browser settings, then tap retry.
          </div>
          <button
            type="button"
            class="nkp-btn nkp-btn-outline"
            style={{ marginTop: '16px' }}
            onClick={() => geo.request()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div class="nkp-map-tab">
      <div class="nkp-header">
        <span class="nkp-header-title">Map</span>
        <button type="button" class="nkp-header-action" onClick={grid.refresh} aria-label="Refresh">
          ↻
        </button>
      </div>
      {(geo.loading || (grid.loading && !mapReady)) && <Spinner label="Finding nearby users…" />}
      {discoverLoading && <Spinner label="Discovering user…" />}
      {grid.error && !grid.loading && <ErrorBanner message={grid.error} onRetry={grid.refresh} />}
      {discoverError && (
        <ErrorBanner message={discoverError} onRetry={() => setDiscoverError(null)} />
      )}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        {mapCenterChanged && (
          <button type="button" class="nkp-map-search-here" onClick={handleSearchHere}>
            Search here
          </button>
        )}
        <div ref={containerRef} class="nkp-map-container" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the full contents of `src/App.tsx`**

This is the final App.tsx — adds `handleSearchAt`, wraps MapTab in an always-mounted div, and passes the complete prop set.

```tsx
import { useEffect, useState } from 'preact/hooks'
import { TabBar } from './components/TabBar'
// ── MAP FEATURE import (remove to disable) ───────────────────────────────────
import { MapTab } from './tabs/MapTab'
import { MessagesTab } from './tabs/MessagesTab'
import { NearbyTab } from './tabs/NearbyTab'
import { ProfileTab } from './tabs/ProfileTab'
// ─────────────────────────────────────────────────────────────────────────────
import { useGeo } from './hooks/useGeo'
import { useGrid } from './hooks/useGrid'

export type TabId = 'messages' | 'nearby' | 'profile' | 'map'

export interface SelectedProfile {
  id: number
  lat: number
  lng: number
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('messages')
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null)
  const [pendingThreadId, setPendingThreadId] = useState<number | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [overrideLat, setOverrideLat] = useState<number | null>(null)
  const [overrideLng, setOverrideLng] = useState<number | null>(null)

  const geo = useGeo()
  const gridLat = overrideLat ?? geo.lat ?? 0
  const gridLng = overrideLng ?? geo.lng ?? 0
  const grid = useGrid(gridLat, gridLng)

  useEffect(() => {
    geo.request()
  }, [])

  useEffect(() => {
    if (geo.lat != null && geo.lng != null && !geo.loading) grid.refresh()
  }, [geo.lat, geo.lng, geo.loading])

  function handleViewProfile(profile: SelectedProfile) {
    setSelectedProfile(profile)
    setActiveTab('profile')
  }

  function handleOpenThread(threadId: number) {
    setPendingThreadId(threadId)
    setActiveTab('messages')
  }

  function handleThreadOpened() {
    setPendingThreadId(null)
  }

  function handleSearchAt(lat: number, lng: number) {
    setOverrideLat(lat)
    setOverrideLng(lng)
    grid.searchAt(lat, lng)
  }

  return (
    <div id="nkp-app">
      <div id="nkp-content">
        {activeTab === 'messages' && (
          <MessagesTab
            onViewProfile={handleViewProfile}
            pendingThreadId={pendingThreadId}
            onThreadOpened={handleThreadOpened}
            onUnreadChange={setUnreadCount}
          />
        )}
        {activeTab === 'nearby' && (
          <NearbyTab grid={grid} geo={geo} onViewProfile={handleViewProfile} />
        )}
        {activeTab === 'profile' && (
          <ProfileTab profile={selectedProfile} onOpenThread={handleOpenThread} />
        )}
        {/* ── MAP FEATURE render (remove to disable) ── */}
        <div style={{ display: activeTab === 'map' ? '' : 'none' }}>
          <MapTab
            grid={grid}
            geo={geo}
            isActive={activeTab === 'map'}
            onViewProfile={handleViewProfile}
            onSearchAt={handleSearchAt}
          />
        </div>
        {/* ─────────────────────────────────────────── */}
      </div>
      <TabBar active={activeTab} onChange={setActiveTab} unreadCount={unreadCount} />
    </div>
  )
}
```

- [ ] **Step 3: Verify the build passes**

```
npm run build
```

Expected: exits 0 with no TypeScript errors.

- [ ] **Step 4: Run lint and format check**

```
npm run check
```

Expected: exits 0 (Biome formats and lints all changed files with no errors). If Biome auto-fixes formatting, stage the changes before committing.

- [ ] **Step 5: Commit**

```
git add src/tabs/MapTab.tsx src/App.tsx
git commit -m "feat(map): keep MapTab mounted; share pig store with MapTab; simplify Discover flow"
```

---

### Task 4: Smoke-test the feature in the browser

**Files:** none — manual verification only

- [ ] **Step 1: Start dev server**

```
npm run dev
```

In a second terminal:

```
npm run preview
```

Install the dev bookmarklet (run `node scripts/gen-bookmarklet.mjs --dev` and save the printed URL as a browser bookmark), then fire it on nastykinkpigs.com.

- [ ] **Step 2: Verify map position persistence**

1. Navigate to the Map tab — map loads at GPS position.
2. Pan to a different area.
3. Tap a pig marker → tap "View Profile".
4. Tap "Back" / navigate back to the Map tab.

Expected: map is still centred on the panned position, not reset to GPS.

- [ ] **Step 3: Verify shared location**

1. On the Map tab, pan to a new area and tap "Search here".
2. Switch to the Nearby tab.

Expected: Nearby list updates with pigs from the panned-to location.

- [ ] **Step 4: Verify accumulation**

1. On Nearby tab, note the pig count.
2. Switch to Map, pan to a different area, tap "Search here".
3. Switch back to Nearby.

Expected: pig count is equal to or greater than before (pigs from both searches are present; no results were discarded).

- [ ] **Step 5: Verify Discover flow**

1. Open a pig's popup on the map.
2. Complete the discover gesture (TL corner → BR corner → avatar).
3. Tap "Discover User" in the confirm menu.

Expected: the pig's marker moves to the trilaterated location (no separate discover pin is placed). The popup shows the discover note (place name, distance, Google Maps link) when reopened.

- [ ] **Step 6: Verify filter sharing**

1. On Nearby tab, change the radius filter (e.g. 5 mi → 100 mi).
2. Switch to Map tab.

Expected: map markers update to reflect the new radius.
