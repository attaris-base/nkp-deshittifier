import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import { fetchThread, sendMessage } from '../api'
import type { ThreadDetails } from '../types/api.types'

export interface ThreadState {
  data: ThreadDetails | null
  loading: boolean
  error: string | null
  sending: boolean
}

export function useThread(threadId: number | null) {
  const [state, setState] = useState<ThreadState>({
    data: null, loading: false, error: null, sending: false,
  })
  // Keep ref for send callback to avoid stale closure
  const dataRef = useRef<ThreadDetails | null>(null)
  dataRef.current = state.data

  const load = useCallback(async (id: number) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const json = await fetchThread(String(id))
      setState(s => ({ ...s, data: json as ThreadDetails, loading: false }))
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: (e as Error).message ?? 'Network error' }))
    }
  }, [])

  useEffect(() => {
    if (threadId != null) {
      setState({ data: null, loading: true, error: null, sending: false })
      load(threadId)
    } else {
      setState({ data: null, loading: false, error: null, sending: false })
    }
  }, [threadId, load])

  const send = useCallback(async (text: string): Promise<boolean> => {
    const current = dataRef.current
    if (!current || !text.trim()) return false

    setState(s => ({ ...s, sending: true, error: null }))
    try {
      const result = await sendMessage(
        current.csrf,
        String(current.other_id),
        text,
        String(current.thread_id),
      )

      // CSRF expired: silently refresh thread and retry once
      if (result?.ok === false || result?.error?.includes?.('csrf')) {
        const fresh = await fetchThread(String(current.thread_id)) as ThreadDetails
        const retry = await sendMessage(
          fresh.csrf,
          String(fresh.other_id),
          text,
          String(fresh.thread_id),
        )
        const refreshed = await fetchThread(String(current.thread_id)) as ThreadDetails
        setState(s => ({ ...s, data: refreshed, sending: false }))
        return retry?.ok !== false
      }

      // Refresh thread to surface the sent message
      const updated = await fetchThread(String(current.thread_id)) as ThreadDetails
      setState(s => ({ ...s, data: updated, sending: false }))
      return true
    } catch (e) {
      setState(s => ({ ...s, sending: false, error: (e as Error).message ?? 'Send failed' }))
      return false
    }
  }, [])

  return {
    ...state,
    refresh: () => { if (threadId != null) load(threadId) },
    send,
  }
}
