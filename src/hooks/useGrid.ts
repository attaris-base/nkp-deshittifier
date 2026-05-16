import { useState, useCallback, useRef } from 'preact/hooks'
import { fetchOinkGrid } from '../api'
import type { Grid, OinkGridParams } from '../types/api.types'

export interface GridFilters {
  radius: number
  window: string
  position: string
}

export const DEFAULT_FILTERS: GridFilters = {
  radius: 50,
  window: '24h',
  position: 'all',
}

export interface GridState {
  pages: Grid[]
  loading: boolean
  loadingMore: boolean
  error: string | null
}

export function useGrid(lat: number, lng: number) {
  const [filters, setFilters] = useState<GridFilters>(DEFAULT_FILTERS)
  const [state, setState] = useState<GridState>({
    pages: [], loading: false, loadingMore: false, error: null,
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

  const load = useCallback(async (f: GridFilters) => {
    setState(s => ({ ...s, loading: true, error: null, pages: [] }))
    try {
      const first = await loadPage(0, f)
      setState(s => ({ ...s, loading: false, pages: [first] }))
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: (e as Error).message ?? 'Network error' }))
    }
  }, [loadPage])

  const loadMore = useCallback(async () => {
    const { pages } = state
    if (!pages.length || !pages[pages.length - 1].has_more) return
    const nextPage = pages.length
    setState(s => ({ ...s, loadingMore: true }))
    try {
      const next = await loadPage(nextPage, filters)
      setState(s => ({ ...s, loadingMore: false, pages: [...s.pages, next] }))
    } catch (e) {
      setState(s => ({ ...s, loadingMore: false, error: (e as Error).message ?? 'Network error' }))
    }
  }, [state, filters, loadPage])

  const applyFilters = useCallback((f: Partial<GridFilters>) => {
    const next = { ...filters, ...f }
    setFilters(next)
    load(next)
  }, [filters, load])

  const refresh = useCallback(() => load(filters), [load, filters])

  // All pigs across pages
  const pigs = state.pages.flatMap(p => p.pigs)
  const hasMore = state.pages.length > 0 && state.pages[state.pages.length - 1].has_more

  return { ...state, pigs, hasMore, filters, applyFilters, refresh, loadMore }
}
