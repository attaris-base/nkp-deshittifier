import { useCallback, useRef, useState } from 'preact/hooks'
import { fetchOinkGrid } from '../api'
import { addGridObservations } from '../observationStore'
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
