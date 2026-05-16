import type { SelectedProfile } from '../App'
import { Spinner } from '../components/Spinner'

interface Props {
  onViewProfile: (p: SelectedProfile) => void
  pendingThreadId: number | null
  onThreadOpened: () => void
  onUnreadChange: (n: number) => void
}

/** Placeholder — full implementation in Phase 3 */
export function MessagesTab(_props: Props) {
  return (
    <div>
      <div class="nkp-header">
        <span class="nkp-header-title">Messages</span>
      </div>
      <Spinner label="Loading messages…" />
    </div>
  )
}
