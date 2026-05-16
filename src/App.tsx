import { useState } from 'preact/hooks'
import { TabBar } from './components/TabBar'
// ── MAP FEATURE import (remove to disable) ───────────────────────────────────
import { MapTab } from './tabs/MapTab'
import { MessagesTab } from './tabs/MessagesTab'
import { NearbyTab } from './tabs/NearbyTab'
import { ProfileTab } from './tabs/ProfileTab'
// ─────────────────────────────────────────────────────────────────────────────

export type TabId = 'messages' | 'nearby' | 'profile' | 'map'

export interface SelectedProfile {
  id: number
  lat: number
  lng: number
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('messages')
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null)
  /** thread_id to open when switching to Messages — set by Profile "Message" button */
  const [pendingThreadId, setPendingThreadId] = useState<number | null>(null)
  /** Unread count badge on Messages tab — updated by MessagesTab */
  const [unreadCount, setUnreadCount] = useState(0)

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
        {activeTab === 'nearby' && <NearbyTab onViewProfile={handleViewProfile} />}
        {activeTab === 'profile' && (
          <ProfileTab profile={selectedProfile} onOpenThread={handleOpenThread} />
        )}
        {/* ── MAP FEATURE render (remove to disable) ── */}
        {activeTab === 'map' && <MapTab onViewProfile={handleViewProfile} />}
        {/* ─────────────────────────────────────────── */}
      </div>
      <TabBar active={activeTab} onChange={setActiveTab} unreadCount={unreadCount} />
    </div>
  )
}
