import { useState, useEffect, useCallback } from 'preact/hooks'
import { fetchProfileData } from '../api'
import type { Profile } from '../types/api.types'
import type { SelectedProfile } from '../App'

export interface ProfileState {
  data: Profile | null
  loading: boolean
  error: string | null
}

export function useProfile(selected: SelectedProfile | null) {
  const [state, setState] = useState<ProfileState>({ data: null, loading: false, error: null })

  const load = useCallback(async (s: SelectedProfile) => {
    setState({ data: null, loading: true, error: null })
    try {
      const json = await fetchProfileData({ id: s.id, lat: s.lat, lng: s.lng })
      if (!json?.ok) {
        setState({ data: null, loading: false, error: 'Profile not found' })
        return
      }
      setState({ data: json as Profile, loading: false, error: null })
    } catch (e) {
      setState({ data: null, loading: false, error: (e as Error).message ?? 'Network error' })
    }
  }, [])

  useEffect(() => {
    if (selected) load(selected)
    else setState({ data: null, loading: false, error: null })
  }, [selected?.id, load])

  return { ...state, refresh: () => selected && load(selected) }
}
