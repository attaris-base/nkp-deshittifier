import { fetchGridDistance, fetchOinkGrid, fetchProfileData } from './api'
import { addGridObservations, getObservations } from './observationStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const EARTH_RADIUS_METERS = 6_378_000

// ─── Math primitives ──────────────────────────────────────────────────────────

export const toRadians = (deg: number) => (deg * Math.PI) / 180
export const toDegrees = (rad: number) => (180 * rad) / Math.PI

export const haversineDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const lat1Rad = toRadians(lat1)
  const lat2Rad = toRadians(lat2)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_METERS * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function destinationPoint(
  lat: number,
  lng: number,
  distMeters: number,
  bearingDeg: number,
): { lat: number; lng: number } {
  const latRad = toRadians(lat)
  const lngRad = toRadians(lng)
  const bearingRad = toRadians(bearingDeg)
  const newLat = Math.asin(
    Math.sin(latRad) * Math.cos(distMeters / EARTH_RADIUS_METERS) +
      Math.cos(latRad) * Math.sin(distMeters / EARTH_RADIUS_METERS) * Math.cos(bearingRad),
  )
  const newLng =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distMeters / EARTH_RADIUS_METERS) * Math.cos(latRad),
      Math.cos(distMeters / EARTH_RADIUS_METERS) - Math.sin(latRad) * Math.sin(newLat),
    )
  return { lat: toDegrees(newLat), lng: toDegrees(newLng) }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeoPoint = { lat: number; lng: number }
export type ProbePoint = GeoPoint & { distance: number }

// ─── Distance probe ───────────────────────────────────────────────────────────

/** Probes `user_id`'s distance as reported by the profile API from `(lat, lng)`.
 *  Returns distance in miles; -1 means the API reported "<1 mi" (within range). */
export async function getUserDistance(
  user_id: number,
  lat: number,
  lng: number,
): Promise<ProbePoint> {
  const profileData = await fetchProfileData({ id: user_id, lat, lng })
  const distanceString = profileData.distance
  if (distanceString[0] === '<') return { lat, lng, distance: -1 }
  return { lat, lng, distance: +distanceString.slice(0, distanceString.length - 3) }
}

// ─── Circle intersections ─────────────────────────────────────────────────────

/**
 * Computes the spherical intersection points of two distance-circles
 * (each defined by a probe point centre + its reported distance as radius).
 * Returns null when the circles do not intersect, a single-element array
 * when they are tangent, and a two-element array otherwise.
 */
export function circleIntersections(p1: ProbePoint, p2: ProbePoint): GeoPoint[] | null {
  const lat1Rad = toRadians(p1.lat)
  const lng1Rad = toRadians(p1.lng)
  const lat2Rad = toRadians(p2.lat)
  const lng2Rad = toRadians(p2.lng)
  const pairDist = haversineDistanceMeters(p1.lat, p1.lng, p2.lat, p2.lng)

  if (p1.distance + p2.distance < pairDist || Math.abs(p1.distance - p2.distance) > pairDist) {
    return null
  }

  const angDist = pairDist / EARTH_RADIUS_METERS
  const angR1 = p1.distance / EARTH_RADIUS_METERS
  const angR2 = p2.distance / EARTH_RADIUS_METERS
  const alpha = Math.acos(
    (Math.cos(angR2) - Math.cos(angR1) * Math.cos(angDist)) / (Math.sin(angR1) * Math.sin(angDist)),
  )
  const bearing = Math.atan2(
    Math.sin(lng2Rad - lng1Rad) * Math.cos(lat2Rad),
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lng2Rad - lng1Rad),
  )

  const computePoint = (brg: number): GeoPoint => {
    const newLat = Math.asin(
      Math.sin(lat1Rad) * Math.cos(angR1) + Math.cos(lat1Rad) * Math.sin(angR1) * Math.cos(brg),
    )
    const newLng =
      lng1Rad +
      Math.atan2(
        Math.sin(brg) * Math.sin(angR1) * Math.cos(lat1Rad),
        Math.cos(angR1) - Math.sin(lat1Rad) * Math.sin(newLat),
      )
    return { lat: toDegrees(newLat), lng: toDegrees(newLng) }
  }

  const c1 = computePoint(bearing + alpha)
  const c2 = computePoint(bearing - alpha)

  if (Math.abs(c1.lat - c2.lat) < 1e-10 && Math.abs(c1.lng - c2.lng) < 1e-10) return [c1]
  return [c1, c2]
}

// ─── Disambiguation ───────────────────────────────────────────────────────────

/**
 * Given two candidate intersection points and a set of reference probe points
 * with known distances, returns the candidate whose Haversine distances to the
 * references have the lower total absolute error.
 */
export function disambiguate(candidates: [GeoPoint, GeoPoint], refs: ProbePoint[]): GeoPoint {
  let err0 = 0
  let err1 = 0
  for (const ref of refs) {
    err0 += Math.abs(
      haversineDistanceMeters(ref.lat, ref.lng, candidates[0].lat, candidates[0].lng) -
        ref.distance,
    )
    err1 += Math.abs(
      haversineDistanceMeters(ref.lat, ref.lng, candidates[1].lat, candidates[1].lng) -
        ref.distance,
    )
  }
  return err0 <= err1 ? candidates[0] : candidates[1]
}

// ─── Trilateration ────────────────────────────────────────────────────────────

/**
 * One recursive trilateration step.  Probes the target from `(lat, lng)` and
 * from N / S / E / W cardinal offsets, intersects the resulting distance
 * circles, averages valid intersection points, then recurses on the averaged
 * position.  Terminates when any probe reports distance -1 (within range).
 */
export async function trilaterationStep(
  params: { lat: number; lng: number; user_id: number },
  existingProbePoints: ProbePoint[],
): Promise<{ lat: number; lng: number; distance: number; user_id: number }> {
  const { lat, lng, user_id } = params

  const central = await getUserDistance(user_id, lat, lng)
  const [northPt, southPt, eastPt, westPt] = [0, 180, 90, 270].map((bearing) =>
    destinationPoint(lat, lng, central.distance, bearing),
  )
  const [north, south, east, west] = await Promise.all([
    getUserDistance(user_id, northPt.lat, northPt.lng),
    getUserDistance(user_id, southPt.lat, southPt.lng),
    getUserDistance(user_id, eastPt.lat, eastPt.lng),
    getUserDistance(user_id, westPt.lat, westPt.lng),
  ])

  const cardinals: ProbePoint[] = [central, north, south, east, west]
  const allPoints = [...cardinals, ...existingProbePoints]

  for (const pt of allPoints) {
    if (pt.distance === -1) return { ...pt, user_id }
  }

  const pairs: Array<[ProbePoint, ProbePoint]> = []
  for (let i = 0; i < allPoints.length; i++) {
    for (let j = i + 1; j < allPoints.length; j++) {
      if (allPoints[i].lat !== allPoints[j].lat && allPoints[i].lng !== allPoints[j].lng) {
        pairs.push([allPoints[i], allPoints[j]])
      }
    }
  }

  const validPoints: GeoPoint[] = pairs.flatMap(([p1, p2]) => {
    const candidates = circleIntersections(p1, p2)
    if (!candidates) return []
    if (candidates.length === 1) return candidates
    return [disambiguate(candidates as [GeoPoint, GeoPoint], existingProbePoints)]
  })

  if (validPoints.length === 0) return { ...central, user_id }

  const averaged = validPoints.reduce(
    (acc, pt) => ({
      lat: acc.lat + pt.lat / validPoints.length,
      lng: acc.lng + pt.lng / validPoints.length,
    }),
    { lat: 0, lng: 0 },
  )

  const avgResult = await getUserDistance(user_id, averaged.lat, averaged.lng)
  const result: ProbePoint = { ...averaged, distance: avgResult.distance }

  if (result.distance !== -1) {
    return trilaterationStep({ lat: result.lat, lng: result.lng, user_id }, [...allPoints, result])
  }

  return { ...result, user_id }
}

// ─── Reverse geocode ──────────────────────────────────────────────────────────

export interface ReverseGeocodeResult {
  displayName: string
  city: string | null
  state: string | null
  country: string | null
  countryCode: string | null
  postcode: string | null
  raw: Record<string, unknown>
}

/** Key-free reverse geocode via Nominatim (OpenStreetMap). Rate limit: 1 req/s. */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  const response = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'nkp-deshittifier/1.0' },
  })
  if (!response.ok) throw new Error(`Nominatim error: ${response.status}`)
  // biome-ignore lint/suspicious/noExplicitAny: Nominatim response has no type defs
  const data: any = await response.json()
  const addr = data.address ?? {}
  return {
    displayName: data.display_name ?? '',
    city: addr.city ?? addr.town ?? addr.village ?? null,
    state: addr.state ?? null,
    country: addr.country ?? null,
    countryCode: addr.country_code ?? null,
    postcode: addr.postcode ?? null,
    raw: data,
  }
}

// ─── getUserLocation ──────────────────────────────────────────────────────────

export const getUserLocation = async (user_id: number, lat: number, lng: number) => {
  const result = await trilaterationStep({ lat, lng, user_id }, [])
  const [grid_distances, address] = await Promise.all([
    fetchGridDistance(result.lat, result.lng, user_id),
    reverseGeocode(result.lat, result.lng),
  ])
  return { ...result, displayName: address.displayName, dopplerMeters: grid_distances.doppler }
}

// ─── Trilateration via grid index ─────────────────────────────────────────────

export type TrilaterationGridResult = {
  userId: number
  name?: string
  lat: number
  lng: number
  observationCount: number
}

/**
 * Fires 4 grid probes around `searchCenter` (center, 25 mi N/E/S), feeds all
 * results into the observation store, then trilateration-locates every user
 * that has accumulated ≥3 observations (including any from prior normal fetches).
 * Distances are stored in meters, so `circleIntersections` receives the correct
 * unit (unlike the existing profile-based path which has a pre-existing miles/meters
 * mismatch that this function does not inherit).
 */
export async function trilaterationViaIndex(searchCenter: {
  lat: number
  lng: number
}): Promise<TrilaterationGridResult[]> {
  const PROBE_OFFSET_M = 25 * 1609.344

  const probePoints = [
    searchCenter,
    destinationPoint(searchCenter.lat, searchCenter.lng, PROBE_OFFSET_M, 0),
    destinationPoint(searchCenter.lat, searchCenter.lng, PROBE_OFFSET_M, 90),
    destinationPoint(searchCenter.lat, searchCenter.lng, PROBE_OFFSET_M, 180),
  ]

  await Promise.all(
    probePoints.map(async (probe) => {
      const res = await fetchOinkGrid({ lat: probe.lat, lng: probe.lng, radius: 50 })
      addGridObservations(probe, res.pigs)
    }),
  )

  const observations = getObservations()
  const results: TrilaterationGridResult[] = []

  for (const [userId, obs] of observations) {
    if (obs.length < 3) continue

    const pts: ProbePoint[] = obs.map((o) => ({
      lat: o.probePoint.lat,
      lng: o.probePoint.lng,
      distance: o.distanceMeters,
    }))

    const validPoints: GeoPoint[] = []

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const p1 = pts[i]
        const p2 = pts[j]
        if (p1.lat === p2.lat && p1.lng === p2.lng) continue
        const candidates = circleIntersections(p1, p2)
        if (!candidates) continue
        if (candidates.length === 1) {
          validPoints.push(candidates[0])
        } else {
          validPoints.push(disambiguate(candidates as [GeoPoint, GeoPoint], pts))
        }
      }
    }

    if (validPoints.length === 0) continue

    const lat = validPoints.reduce((s, p) => s + p.lat, 0) / validPoints.length
    const lng = validPoints.reduce((s, p) => s + p.lng, 0) / validPoints.length

    results.push({ userId, lat, lng, observationCount: obs.length })
  }

  return results
}
