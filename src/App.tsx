import { useEffect, useState } from 'preact/hooks'
import { TabBar } from './components/TabBar'
// ─────────────────────────────────────────────────────────────────────────────
import { useGeo } from './hooks/useGeo'
import { useGrid } from './hooks/useGrid'
// ── MAP FEATURE import (remove to disable) ───────────────────────────────────
import { MapTab } from './tabs/MapTab'
import { MessagesTab } from './tabs/MessagesTab'
import { NearbyTab } from './tabs/NearbyTab'
import { ProfileTab } from './tabs/ProfileTab'

export type TabId = 'messages' | 'nearby' | 'profile' | 'map'

export interface SelectedProfile {
  id: number
  lat: number
  lng: number
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('messages')
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null)
  const [pendingThreadId, setPendingThreadId] = useState<number | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [overrideLat, setOverrideLat] = useState<number | null>(null)
  const [overrideLng, setOverrideLng] = useState<number | null>(null)

  const geo = useGeo()
  const gridLat = overrideLat ?? geo.lat ?? 0
  const gridLng = overrideLng ?? geo.lng ?? 0
  const grid = useGrid(gridLat, gridLng)

  useEffect(() => {
    geo.request()
  }, [])

  useEffect(() => {
    if (geo.lat != null && geo.lng != null && !geo.loading) grid.refresh()
  }, [geo.lat, geo.lng, geo.loading])

  function handleViewProfile(profile: SelectedProfile) {
    setSelectedProfile(profile)
    setActiveTab('profile')
  }

  function handleOpenThread(threadId: number) {
    setPendingThreadId(threadId)
    setActiveTab('messages')
  }

  function handleThreadOpened() {
    setPendingThreadId(null)
  }

  function handleSearchAt(lat: number, lng: number) {
    setOverrideLat(lat)
    setOverrideLng(lng)
    grid.searchAt(lat, lng)
  }

  return (
    <div id="nkp-app">
      <div id="nkp-content">
        {activeTab === 'messages' && (
          <MessagesTab
            onViewProfile={handleViewProfile}
            pendingThreadId={pendingThreadId}
            onThreadOpened={handleThreadOpened}
            onUnreadChange={setUnreadCount}
          />
        )}
        {activeTab === 'nearby' && (
          <NearbyTab grid={grid} geo={geo} onViewProfile={handleViewProfile} />
        )}
        {activeTab === 'profile' && (
          <ProfileTab profile={selectedProfile} onOpenThread={handleOpenThread} />
        )}
        {/* ── MAP FEATURE render (remove to disable) ── */}
        <div style={{ display: activeTab === 'map' ? '' : 'none', height: '100%' }}>
          <MapTab
            grid={grid}
            geo={geo}
            isActive={activeTab === 'map'}
            onViewProfile={handleViewProfile}
            onSearchAt={handleSearchAt}
          />
        </div>
        {/* ─────────────────────────────────────────── */}
      </div>
      <TabBar active={activeTab} onChange={setActiveTab} unreadCount={unreadCount} />
    </div>
  )
}
