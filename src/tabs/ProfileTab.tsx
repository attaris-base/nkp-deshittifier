import type { SelectedProfile } from '../App'

interface Props {
  profile: SelectedProfile | null
  onOpenThread: (threadId: number) => void
}

/** Placeholder — full implementation in Phase 5 */
export function ProfileTab({ profile }: Props) {
  if (!profile) {
    return (
      <div class="nkp-empty">
        <div class="nkp-empty-icon">◉</div>
        <div class="nkp-empty-title">No profile selected</div>
        <div class="nkp-empty-sub">Browse Nearby or tap a sender to view a profile</div>
      </div>
    )
  }
  return (
    <div>
      <div class="nkp-header">
        <span class="nkp-header-title">Profile</span>
      </div>
      <div class="nkp-loading">
        <div class="nkp-spinner" />
        <span>Loading profile…</span>
      </div>
    </div>
  )
}
