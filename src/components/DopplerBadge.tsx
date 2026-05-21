import type { Doppler } from '../types/api.types'

interface Props {
  doppler?: Doppler | null
  distance?: string | null
}

export function DopplerBadge({ doppler, distance }: Props) {
  if (!doppler) return null

  return (
    <span class="nkp-doppler" style={{ color: doppler.hue_oklch }}>
      <span class="nkp-doppler-dot" style={{ background: doppler.hue_oklch }} />
      {doppler.term}
      {distance
        ? ` · ${distance}`
        : doppler.meters_raw
          ? ` · ${(doppler.meters_raw / 1609.344).toFixed(1)} mi`
          : ''}
    </span>
  )
}
