import { useCallback, useEffect, useState } from 'preact/hooks'
import { fetchMail } from '../api'
import type { CurrentMail } from '../types/api.types'

export interface InboxState {
  data: CurrentMail | null
  loading: boolean
  /** 'not-logged-in' | error message string | null */
  error: string | null
}

export function useInbox() {
  const [state, setState] = useState<InboxState>({ data: null, loading: true, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const json = await fetchMail()
      // Detect logged-out state: API may return a non-object or missing threads
      if (
        typeof json !== 'object' ||
        json === null ||
        !Array.isArray((json as CurrentMail).threads)
      ) {
        setState({ data: null, loading: false, error: 'not-logged-in' })
        return
      }
      setState({ data: json as CurrentMail, loading: false, error: null })
    } catch (e) {
      setState({ data: null, loading: false, error: (e as Error).message ?? 'Network error' })
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

  const unreadCount = state.data?.threads.reduce((n, t) => n + (t.unread ?? 0), 0) ?? 0

  return { ...state, refresh: load, unreadCount }
}
