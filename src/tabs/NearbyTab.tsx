import type { SelectedProfile } from '../App'
import { Avatar } from '../components/Avatar'
import { DopplerBadge } from '../components/DopplerBadge'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import type { GeoReturn } from '../hooks/useGeo'
import type { GridReturn } from '../hooks/useGrid'
import type { Heat, Pig } from '../types/api.types'

interface Props {
  grid: GridReturn
  geo: GeoReturn
  onViewProfile: (p: SelectedProfile) => void
}

const WINDOW_OPTIONS = ['1h', '8h', '24h', '7d'] as const
const POSITION_OPTIONS = [
  { value: 'all', label: 'Any position' },
  { value: 'hungryhole', label: 'Hungry hole' },
  { value: 'angrytop', label: 'Angry top' },
  { value: 'veryversatile', label: 'Very versatile' },
  { value: 'anythinggoes', label: 'Anything goes' },
]

function HeatLabel({ heat }: { heat: Heat }) {
  if (heat === 'live') return <span class="nkp-heat-live">● LIVE</span>
  if (heat === 'warm') return <span class="nkp-heat-warm">● WARM</span>
  return <span class="nkp-heat-stale">● {heat}</span>
}

function UserCard({ pig, onSelect }: { pig: Pig; onSelect: () => void }) {
  const ringColor = pig.doppler?.hue_oklch ?? undefined
  return (
    <button type="button" class="nkp-user-card" onClick={onSelect}>
      <div style={{ position: 'relative' }}>
        <Avatar
          src={pig.avatar}
          name={pig.name}
          ringColor={ringColor}
          badge={pig.unread_count > 0 ? pig.unread_count : undefined}
        />
      </div>
      <div class="nkp-user-info">
        <div class="nkp-user-name">{pig.name}</div>
        <div class="nkp-user-meta">
          {pig.age && <span class="nkp-user-detail">{pig.age}</span>}
          {pig.position && <span class="nkp-user-detail">{pig.position}</span>}
          <HeatLabel heat={pig.heat} />
        </div>
        <DopplerBadge doppler={pig.doppler} distance={pig.distance_str} />
      </div>
    </button>
  )
}

export function NearbyTab({ grid, geo, onViewProfile }: Props) {
  if (geo.denied) {
    return (
      <div>
        <div class="nkp-header">
          <span class="nkp-header-title">Nearby</span>
        </div>
        <div class="nkp-empty">
          <div class="nkp-empty-icon">📍</div>
          <div class="nkp-empty-title">Location access needed</div>
          <div class="nkp-empty-sub">
            Allow location access in your browser settings, then tap retry.
          </div>
          <button
            type="button"
            class="nkp-btn nkp-btn-outline"
            style={{ marginTop: '16px' }}
            onClick={() => geo.request()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div class="nkp-header">
        <span class="nkp-header-title">Nearby</span>
        <button type="button" class="nkp-header-action" onClick={grid.refresh} aria-label="Refresh">
          ↻
        </button>
      </div>

      <div class="nkp-filters">
        <select
          class="nkp-filter-select"
          value={grid.filters.radius}
          onChange={(e) =>
            grid.applyFilters({ radius: Number((e.target as HTMLSelectElement).value) })
          }
          aria-label="Radius"
        >
          {[5, 10, 25, 50, 100].map((r) => (
            <option key={r} value={r}>
              {r} mi
            </option>
          ))}
        </select>

        <select
          class="nkp-filter-select"
          value={grid.filters.window}
          onChange={(e) => grid.applyFilters({ window: (e.target as HTMLSelectElement).value })}
          aria-label="Time window"
        >
          {WINDOW_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        <select
          class="nkp-filter-select"
          value={grid.filters.position}
          onChange={(e) => grid.applyFilters({ position: (e.target as HTMLSelectElement).value })}
          aria-label="Position"
        >
          {POSITION_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {(geo.loading || grid.loading) && <Spinner label="Finding nearby users…" />}
      {grid.error && !grid.loading && <ErrorBanner message={grid.error} onRetry={grid.refresh} />}

      {!grid.loading && grid.pigs.length === 0 && !grid.error && (
        <div class="nkp-empty">
          <div class="nkp-empty-icon">⊕</div>
          <div class="nkp-empty-title">Nobody nearby</div>
          <div class="nkp-empty-sub">Try expanding the radius or time window</div>
        </div>
      )}

      {grid.pigs.map((pig) => (
        <UserCard
          key={pig.id}
          pig={pig}
          onSelect={() => onViewProfile({ id: pig.id, lat: geo.lat ?? 0, lng: geo.lng ?? 0 })}
        />
      ))}

      {grid.hasMore && (
        <button
          type="button"
          class="nkp-load-more"
          onClick={grid.loadMore}
          disabled={grid.loadingMore}
        >
          {grid.loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
