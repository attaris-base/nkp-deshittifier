import { useEffect, useRef, useState } from 'preact/hooks'
import type { SelectedProfile } from '../App'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import { useGeo } from '../hooks/useGeo'
import { useGrid } from '../hooks/useGrid'
import type { Pig } from '../types/api.types'

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

function initial(pig: Pig): string {
  return pig.name ? pig.name.charAt(0).toUpperCase() : '?'
}

function markerHtml(pig: Pig): string {
  if (pig.avatar) {
    return `<div class="nkp-map-pin"><img src="${esc(pig.avatar)}" class="nkp-map-pin-img" alt="${esc(pig.name)}" /></div>`
  }
  return `<div class="nkp-map-pin nkp-map-pin--init">${initial(pig)}</div>`
}

function avatarHtml(pig: Pig): string {
  if (pig.avatar) {
    return `<img src="${esc(pig.avatar)}" class="nkp-map-avatar nkp-map-avatar--lg" alt="${esc(pig.name)}" />`
  }
  return `<div class="nkp-map-avatar nkp-map-avatar--lg nkp-map-avatar--init">${initial(pig)}</div>`
}

function popupHtml(pig: Pig): string {
  return `<div class="nkp-map-popup">
    ${avatarHtml(pig)}
    <div class="nkp-map-popup-name">${esc(pig.name)}</div>
    <div class="nkp-map-popup-meta">${pig.age ?? '?'} · ${esc(pig.position)} · ${esc(pig.distance_str)}</div>
    <button type="button" class="nkp-btn nkp-btn-primary nkp-btn-full nkp-map-popup-btn" data-pig-id="${pig.id}">View Profile</button>
  </div>`
}

interface Props {
  onViewProfile: (profile: SelectedProfile) => void
}

export function MapTab({ onViewProfile }: Props) {
  const geo = useGeo()

  // When user pans to a new location, we track the override coords so the grid
  // fetches from that position instead of the GPS position on subsequent refreshes.
  const [overrideLat, setOverrideLat] = useState<number | null>(null)
  const [overrideLng, setOverrideLng] = useState<number | null>(null)
  const [mapCenterChanged, setMapCenterChanged] = useState(false)
  // Stores the latest map center from moveend without triggering re-renders on every pan
  // biome-ignore lint/suspicious/noExplicitAny: Leaflet CDN global, no type defs installed
  const pendingCenterRef = useRef<any>(null)

  const gridLat = overrideLat ?? geo.lat ?? 0
  const gridLng = overrideLng ?? geo.lng ?? 0
  const grid = useGrid(gridLat, gridLng)

  // biome-ignore lint/suspicious/noExplicitAny: Leaflet CDN global, no type defs installed
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // biome-ignore lint/suspicious/noExplicitAny: Leaflet CDN global, no type defs installed
  const markersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)

  // Suppress #nkp-content scrolling so the map fills the viewport correctly
  useEffect(() => {
    const el = document.getElementById('nkp-content')
    if (!el) return
    const prevOverflow = el.style.overflow
    const prevPadding = el.style.paddingBottom
    el.style.overflow = 'hidden'
    el.style.paddingBottom = '0'
    return () => {
      el.style.overflow = prevOverflow
      el.style.paddingBottom = prevPadding
    }
  }, [])

  useEffect(() => {
    geo.request()
  }, [])

  useEffect(() => {
    if (geo.lat != null && geo.lng != null && !geo.loading) {
      grid.refresh()
    }
  }, [geo.lat, geo.lng, geo.loading])

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

        // Show "Search here" when the user pans; skip the first moveend from setView
        let initialMove = true
        map.on('moveend', () => {
          if (initialMove) {
            initialMove = false
            return
          }
          pendingCenterRef.current = map.getCenter()
          setMapCenterChanged(true)
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

  // Destroy map only when the component unmounts, not on every coord change
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

      // Wire "View Profile" button after popup opens
      marker.on('popupopen', () => {
        const btn = marker
          .getPopup()
          ?.getElement()
          ?.querySelector(`[data-pig-id="${pig.id}"]`) as HTMLElement | null
        btn?.addEventListener(
          'click',
          () => {
            onViewProfile({ id: pig.id, lat: gridLat, lng: gridLng })
            map.closePopup()
          },
          { once: true },
        )
      })

      marker.addTo(map)
      markersRef.current.push(marker)
    }
  }, [grid.pigs, mapReady])

  const handleSearchHere = () => {
    const center = pendingCenterRef.current
    if (!center) return
    const lat = center.lat as number
    const lng = center.lng as number
    setOverrideLat(lat)
    setOverrideLng(lng)
    setMapCenterChanged(false)
    // searchAt synchronously updates the grid refs and triggers a fetch at the new location
    grid.searchAt(lat, lng)
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
      {grid.error && !grid.loading && <ErrorBanner message={grid.error} onRetry={grid.refresh} />}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
