import type { Pig } from './types/api.types'

export type GridObservation = {
  probePoint: { lat: number; lng: number }
  distanceMeters: number
}

const store = new Map<number, GridObservation[]>()

export function addGridObservations(probePoint: { lat: number; lng: number }, pigs: Pig[]): void {
  for (const pig of pigs) {
    const obs = store.get(pig.id) ?? []
    obs.push({ probePoint, distanceMeters: pig.distance_mi * 1609.344 })
    store.set(pig.id, obs)
  }
}

export function getObservations(): ReadonlyMap<number, GridObservation[]> {
  return store
}
