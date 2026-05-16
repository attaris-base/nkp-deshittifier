import { useCallback, useState } from 'preact/hooks'

export interface GeoState {
  lat: number | null
  lng: number | null
  loading: boolean
  denied: boolean
  error: string | null
}

/** Module-scope cache so geolocation persists across tab switches */
let cached: { lat: number; lng: number } | null = null

export function useGeo() {
  const [state, setState] = useState<GeoState>(() => ({
    lat: cached?.lat ?? null,
    lng: cached?.lng ?? null,
    loading: cached == null,
    denied: false,
    error: null,
  }))

  const request = useCallback(() => {
    if (cached) {
      setState({ lat: cached.lat, lng: cached.lng, loading: false, denied: false, error: null })
      return
    }
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, loading: false, error: 'Geolocation not supported' }))
      return
    }
    setState((s) => ({ ...s, loading: true, error: null, denied: false }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cached = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setState({ lat: cached.lat, lng: cached.lng, loading: false, denied: false, error: null })
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED
        setState((s) => ({
          ...s,
          loading: false,
          denied,
          error: denied ? 'Location access denied' : err.message,
        }))
      },
      { timeout: 10_000, maximumAge: 300_000 },
    )
  }, [])

  return { ...state, request }
}
