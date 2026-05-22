import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { SelectedProfile } from '../App'
import { fetchOinkGrid, fetchProfileData } from '../api'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import { getUserLocation, trilaterationViaIndex } from '../geoApi'
import type { GeoReturn } from '../hooks/useGeo'
import type { EnrichedPig, GridReturn } from '../hooks/useGrid'
import { addGridObservations } from '../observationStore'

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
    `<div class="nkp-map-discover-dist">${esc(pig.name)} is ${Math.round(pig.discoverNote.dopplerMeters)} meters from ${esc(pig.discoverNote.displayName)}</div>` +
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
  const [trilaterationLoading, setTrilaterationLoading] = useState(false)

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

  // After display:none → visible (or after first init), Leaflet must recalculate tile layout
  useEffect(() => {
    if (!isActive || !mapRef.current) return
    requestAnimationFrame(() => mapRef.current?.invalidateSize())
  }, [isActive, mapReady])

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
        <span
          class="nkp-header-title"
          onPointerDown={handleTitlePointerDown}
          onPointerUp={handleTitlePointerUp}
          onPointerCancel={handleTitlePointerUp}
          style={{ userSelect: 'none', touchAction: 'none' }}
        >
          Map
        </span>
        <button type="button" class="nkp-header-action" onClick={grid.refresh} aria-label="Refresh">
          ↻
        </button>
      </div>
      {(geo.loading || (grid.loading && !mapReady)) && <Spinner label="Finding nearby users…" />}
      {discoverLoading && <Spinner label="Discovering user…" />}
      {trilaterationLoading && <Spinner label="Running grid trilateration…" />}
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
