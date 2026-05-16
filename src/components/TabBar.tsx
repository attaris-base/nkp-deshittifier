import type { TabId } from '../App'

interface Props {
  active: TabId
  onChange: (tab: TabId) => void
  unreadCount?: number
}

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'messages', icon: '✉', label: 'Msgs' },
  { id: 'nearby', icon: '⊕', label: 'Nearby' },
  { id: 'profile', icon: '◉', label: 'Profile' },
]

export function TabBar({ active, onChange, unreadCount = 0 }: Props) {
  return (
    <nav class="nkp-tabbar" aria-label="Main navigation">
      {TABS.map(({ id, icon, label }) => (
        <button
          type="button"
          key={id}
          class={`nkp-tab${active === id ? ' active' : ''}`}
          onClick={() => onChange(id)}
          aria-label={label}
          aria-current={active === id ? 'page' : undefined}
        >
          <span class="nkp-tab-icon">{icon}</span>
          <span class="nkp-tab-label">{label}</span>
          {id === 'messages' && unreadCount > 0 && (
            <span class="nkp-tab-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
