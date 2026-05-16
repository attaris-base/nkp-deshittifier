import type { SelectedProfile } from '../App'
import { Spinner } from '../components/Spinner'

interface Props {
  onViewProfile: (p: SelectedProfile) => void
}

/** Placeholder — full implementation in Phase 4 */
export function NearbyTab(_props: Props) {
  return (
    <div>
      <div class="nkp-header">
        <span class="nkp-header-title">Nearby</span>
      </div>
      <Spinner label="Finding nearby users…" />
    </div>
  )
}
