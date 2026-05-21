import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { SelectedProfile } from '../App'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import { getUserLocation } from '../geoApi'
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
    <div class="nkp-map-corner-tl"></div>
    <div class="nkp-map-corner-br"></div>
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
  // The center point of the last executed search — "Search here" appears only when the map
  // has drifted more than half a viewport-width away from this origin
  const searchOriginRef = useRef<{ lat: number; lng: number } | null>(null)

  const gridLat = overrideLat ?? geo.lat ?? 0
  const gridLng = overrideLng ?? geo.lng ?? 0
  const grid = useGrid(gridLat, gridLng)

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

  // Ref keeps Leaflet's imperative event listeners pointed at the current callback
  // without needing to re-register them on every render
  const handleDiscoverUserRef = useRef(handleDiscoverUser)
  useEffect(() => {
    handleDiscoverUserRef.current = handleDiscoverUser
  }, [handleDiscoverUser])

  // Refs so popup click handlers always read the latest search coords, not stale closure values
  const gridLatRef = useRef(gridLat)
  const gridLngRef = useRef(gridLng)
  useEffect(() => {
    gridLatRef.current = gridLat
    gridLngRef.current = gridLng
  }, [gridLat, gridLng])

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

        searchOriginRef.current = { lat: snapLat, lng: snapLng }

        // Show "Search here" only when the center has moved more than half a viewport-width
        // away from the last search origin, so minor pans don't trigger a re-fetch prompt.
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

      // Wire "View Profile" button and secret discover gesture after popup opens
      marker.on('popupopen', () => {
        // AbortController cleans up all gesture listeners when the popup closes,
        // preventing accumulation on repeated open/close cycles
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

        // Secret discover gesture: tap TL corner, tap BR corner, then tap avatar
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
              // Three-step sequence: widen border → shift to animation start color → run hue cycle
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

            confirmBtn.addEventListener('click', () => {
              menu.remove()
              void handleDiscoverUserRef
                .current(pig.id, pig.lat ?? 0, pig.lng ?? 0)
                .then((result) => {
                  if (!result) return
                  marker.setLatLng([result.lat, result.lng])
                  map.setView([result.lat, result.lng], 17, { animate: true })
                  const gmapsUrl = `https://maps.google.com/?q=${result.lat},${result.lng}`
                  const meters =
                    result.dopplerMeters != null ? Math.round(result.dopplerMeters) : '?'
                  const note =
                    `<div class="nkp-map-discover-note">` +
                    `<div class="nkp-map-discover-place">${esc(result.displayName)}</div>` +
                    `<div class="nkp-map-discover-dist">${esc(pig.name)} is ${meters} m from ${esc(result.displayName)}</div>` +
                    `<a class="nkp-map-discover-gmaps" href="${esc(gmapsUrl)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>` +
                    `</div>`
                  marker.bindPopup(popupHtml(pig) + note, {
                    className: 'nkp-map-leaflet-popup',
                    maxWidth: 220,
                  })
                  marker.openPopup()
                })
            })
            dismissBtn.addEventListener('click', () => menu.remove())

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
    const lat = center.lat as number
    const lng = center.lng as number
    setOverrideLat(lat)
    setOverrideLng(lng)
    setMapCenterChanged(false)
    searchOriginRef.current = { lat, lng }
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
