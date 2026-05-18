import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { fetchMail } from '../api'
import type { CurrentMail, Thread } from '../types/api.types'

export interface InboxState {
  threads: Thread[]
  cursor: string | null
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  /** 'not-logged-in' | error message string | null */
  error: string | null
}

export function useInbox() {
  const [state, setState] = useState<InboxState>({
    threads: [],
    cursor: null,
    hasMore: false,
    loading: true,
    loadingMore: false,
    error: null,
  })
  // Stable ref so loadMore can read latest cursor without being in its dep array
  const cursorRef = useRef<string | null>(null)
  cursorRef.current = state.cursor

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const json = await fetchMail()
      if (
        typeof json !== 'object' ||
        json === null ||
        !Array.isArray((json as CurrentMail).threads)
      ) {
        setState((s) => ({ ...s, threads: [], loading: false, error: 'not-logged-in' }))
        return
      }
      const data = json as CurrentMail
      setState({
        threads: data.threads,
        cursor: data.next_cursor || null,
        hasMore: Boolean(data.next_cursor),
        loading: false,
        loadingMore: false,
        error: null,
      })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message ?? 'Network error' }))
    }
  }, [])

  const loadMore = useCallback(async () => {
    const cursor = cursorRef.current
    if (!cursor) return
    setState((s) => ({ ...s, loadingMore: true }))
    try {
      const json = await fetchMail(cursor)
      if (
        typeof json !== 'object' ||
        json === null ||
        !Array.isArray((json as CurrentMail).threads)
      ) {
        setState((s) => ({ ...s, loadingMore: false }))
        return
      }
      const data = json as CurrentMail
      setState((s) => ({
        ...s,
        threads: [...s.threads, ...data.threads],
        cursor: data.next_cursor || null,
        hasMore: Boolean(data.next_cursor),
        loadingMore: false,
      }))
    } catch {
      setState((s) => ({ ...s, loadingMore: false }))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Re-fetch when window regains focus (user switches tabs and comes back)
  useEffect(() => {
    const onFocus = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [load])

  const unreadCount = state.threads.reduce((n, t) => n + (t.unread ?? 0), 0)

  return { ...state, refresh: load, loadMore, unreadCount }
}
