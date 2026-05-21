import type {
  Grid,
  OinkGridParams,
  PigsResponse,
  PigsResponsePig,
  Profile,
  ProfileQueryParams,
} from './types/api.types'

// Fetch csrf token value:
export const fetchCSRF = async () => {
  const response = await fetch('https://nastykinkpigs.com/oc/api/oc-organize.php?action=csrf', {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      priority: 'u=1, i',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
    },
    referrer: 'https://nastykinkpigs.com/oc/',
    body: null,
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
  })
  const json = await response.json()
  if (json?.token) {
    return json.token
  } else {
    return
  }
}

// fetch 50 most recent messages as JSON; pass cursor from previous response to page backwards:
export const fetchMail = async (cursor?: string) => {
  const base =
    'https://nastykinkpigs.com/api/organized-chat.php?action=inbox&limit=100&filter=all&sort=date_desc'
  const url = cursor ? `${base}&cursor=${encodeURIComponent(cursor)}` : base
  const response = await fetch(url, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.7',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      priority: 'u=1, i',
      'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="148", "Google Chrome";v="148"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
    },
    referrer: 'https://nastykinkpigs.com/oc/',
    body: null,
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
  })
  const json = await response.json()
  return json
}

// fetch messages from specific thread (conversation):
export const fetchThread = async (thread_id: string) => {
  const response = await fetch(
    `https://nastykinkpigs.com/api/organized-chat.php?action=thread&thread_id=${thread_id}`,
    {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.7',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        priority: 'u=1, i',
        'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="148", "Google Chrome";v="148"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
      },
      referrer: 'https://nastykinkpigs.com/oc/',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
    },
  )
  const json = await response.json()
  return json
}

// send message to recipient as part of thread -- param values available via fetchThread response
export const sendMessage = async (
  csrf: string,
  recipient_id: string,
  text: string,
  thread_id: string,
) => {
  const bodyObj = {
    action: 'send',
    _csrf: csrf,
    recipient_id,
    text,
    parent_id: thread_id,
  }

  // Convert the object into a application/x-www-form-urlencoded string
  const formBody = new URLSearchParams(bodyObj).toString()

  const response = await fetch('https://nastykinkpigs.com/api/organized-chat.php', {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.7',
      'cache-control': 'no-cache',
      'content-type': 'application/x-www-form-urlencoded',
      pragma: 'no-cache',
      priority: 'u=1, i',
      'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="148", "Google Chrome";v="148"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
    },
    referrer: 'https://nastykinkpigs.com/oc/',
    body: formBody, // Now uses the dynamic, serialized variables
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  })

  const json = await response.json()
  return json
}

export const searchMessages = async (query: string) => {
  const response = await fetch(
    `https://nastykinkpigs.com/api/organized-chat.php?action=search&q=${query}`,
    {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        priority: 'u=1, i',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
      referrer: 'https://nastykinkpigs.com/oc/',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
    },
  )
  const json = await response.json()
  return json
}

// Send OINK message using old API:
export const sendOink = async (userID: string) => {
  const response = await fetch(`https://nastykinkpigs.com/greet_modal.php?sendto=${userID}`, {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      priority: 'u=0, i',
      'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
    },
    referrer: 'https://nastykinkpigs.com/cigrpiig',
    body: null,
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
  })
  const html = await response.text()
  if (html.includes('Hey PiG your OINK! was sent.')) {
    return true
  } else {
    return false
  }
}

// Send initial message using old API:

export const sendFirstMessage = async (userID: string, subject: string, message: string) => {
  // const url = "https://example.com"; // Replace with your target URL

  const formData = new FormData()
  formData.append('refpg', 'https://nastykinkpigs.com')
  formData.append('grecaptcha', '0cAFcWeA5...') // Needs fresh token
  formData.append('mes_subject', subject)
  formData.append('attach_counter', '1')
  formData.append('messageID', '0')
  formData.append('parent', '0')
  formData.append('text', message)
  formData.append('textpush', message)
  formData.append('sendto', 'lovemail')
  formData.append('notify', 'checked')
  formData.append('action', 'send')

  // Recreate the empty file fields
  formData.append('mail_attach_phid_', new Blob([]), '')
  formData.append('mail_attach1', new Blob([]), '')

  const response = await fetch(`https://nastykinkpigs.com/compose.php?ID=${userID}`, {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      priority: 'u=0, i',
      'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
    },
    referrer: 'https://nastykinkpigs.com/compose.php?ID=57233',
    body: formData,
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  })

  const status = response.status
  if (response.ok) return status
  else return false
}
// Fetch nearby users JSON using Grid API:

/**
 * Fetches grid data based on coordinates and filters.
 */
export async function fetchOinkGrid({
  lat,
  lng,
  radius = 50, // Updated default per instructions
  window = '24h',
  position = 'all',
  page = 0,
  page_size = 500,
  action = 'grid',
}: OinkGridParams): Promise<Grid> {
  const baseUrl = 'https://nastykinkpigs.com/mobile/oink/index.php'

  // Construct query parameters
  const params = new URLSearchParams({
    action,
    radius: radius.toString(),
    window,
    position,
    page: page.toString(),
    page_size: page_size.toString(),
    lat: lat.toString(),
    lng: lng.toString(),
  })

  const url = `${baseUrl}?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'accept-language': 'en-US,en;q=0.7',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      pragma: 'no-cache',
      priority: 'u=1, i',
      'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="148", "Google Chrome";v="148"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
    },
    referrer: 'https://nastykinkpigs.com/mobile/oink/',
    mode: 'cors',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.statusText}`)
  }

  return await response.json()
}

export const fetchGridDistance = async (lat: number, lng: number, user_id: number) => {
  const grid = await fetchOinkGrid({ lat, lng })
  const userData = grid.pigs.find((v) => v.id === user_id)
  console.log(userData)
  return {
    distance: userData?.distance_mi,
    string: userData?.distance_str,
    doppler: userData?.doppler.meters_raw,
  }
}

export async function fetchOinkPigs({
  lat,
  lng,
  radius = 40000, // Updated default per instructions
  limit = 200,
  action = 'pigs',
}: {
  lat: number
  lng: number
  radius?: number
  limit?: number
  action?: string
}): Promise<PigsResponse> {
  const baseUrl = 'https://nastykinkpigs.com/mobile/oink/index.php'

  // Construct query parameters
  const params = new URLSearchParams({
    action,
    radius: radius.toString(),
    lat: lat.toString(),
    lng: lng.toString(),
    limit: limit.toString(),
  })

  const url = `${baseUrl}?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'accept-language': 'en-US,en;q=0.7',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      pragma: 'no-cache',
      priority: 'u=1, i',
      'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="148", "Google Chrome";v="148"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
    },
    referrer: 'https://nastykinkpigs.com/mobile/oink/',
    mode: 'cors',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.statusText}`)
  }

  return await response.json()
}

export const fetchPigsDistance = async (lat: number, lng: number, user_id: number) => {
  const pigs = await fetchOinkPigs({ lat, lng })
  const userData = pigs.pigs.find((v: PigsResponsePig) => v.id === user_id)
  console.log(userData)
  return userData?.distance_m
}

// Fetch user profile:

/**
 * Fetches profile data from the mobile API.
 * @param params Object containing id, lat, and lng
 * @returns Promise resolving to the JSON response
 */
export async function fetchProfileData({
  id,
  lat,
  lng,
  action = 'profile',
}: ProfileQueryParams): Promise<Profile> {
  const baseUrl = 'https://nastykinkpigs.com/mobile/oink/index.php'

  // Construct the query string
  const query = new URLSearchParams({
    action,
    id: id.toString(),
    lat: lat.toString(),
    lng: lng.toString(),
  })

  const url = `${baseUrl}?${query.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'accept-language': 'en-US,en;q=0.7',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      pragma: 'no-cache',
      priority: 'u=1, i',
      'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="148", "Google Chrome";v="148"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
    },
    referrer: 'https://nastykinkpigs.com/mobile/oink/',
    mode: 'cors',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

// export const getUserLocation = async (user_id: number, lat: number, lng: number) => {
//   let closest: { lat: number; lng: number; distance: number } = { lat: 0, lng: 0, distance: 0 }
//   const EARTH_RADIUS_METERS = 6378000

//   const toRadians = (deg: number) => (deg * Math.PI) / 180
//   const toDegrees = (rad: number) => (180 * rad) / Math.PI

//   const haversineDistanceMeters = (
//     lat1: number,
//     lng1: number,
//     lat2: number,
//     lng2: number,
//   ): number => {
//     const dLat = toRadians(lat2 - lat1)
//     const dLng = toRadians(lng2 - lng1)
//     const lat1Rad = toRadians(lat1)
//     const lat2Rad = toRadians(lat2)
//     const a =
//       Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2
//     return 6371e3 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
//   }

//   function destinationPoint(lat: number, lng: number, distMeters: number, bearingDeg: number) {
//     const latRad = toRadians(lat)
//     const lngRad = toRadians(lng)
//     const bearingRad = toRadians(bearingDeg)
//     const newLat = Math.asin(
//       Math.sin(latRad) * Math.cos(distMeters / EARTH_RADIUS_METERS) +
//         Math.cos(latRad) * Math.sin(distMeters / EARTH_RADIUS_METERS) * Math.cos(bearingRad),
//     )
//     const newLng =
//       lngRad +
//       Math.atan2(
//         Math.sin(bearingRad) * Math.sin(distMeters / EARTH_RADIUS_METERS) * Math.cos(latRad),
//         Math.cos(distMeters / EARTH_RADIUS_METERS) - Math.sin(latRad) * Math.sin(newLat),
//       )
//     return { lat: toDegrees(newLat), lng: toDegrees(newLng) }
//   }

//   const getUserDistance = async (user_id: number, lat: number, lng: number) => {
//     const profileData = await fetchProfileData({ id: user_id, lat, lng })
//     const distanceString = profileData.distance
//     if (distanceString[0] === '<') {
//       return { lat, lng, distance: -1 }
//     }
//     const distance: number = +distanceString.slice(0, distanceString.length - 3)
//     return { lat, lng, distance }
//   }

//   // — Trilateration
//   const trilaterationStep = async (
//     params: { lat: number; lng: number; user_id: number },
//     allProbePoints: Array<{ lat: number; lng: number; distance: number }>,
//   ): Promise<{ lat: number; lng: number; distance: number; user_id: number }> => {
//     const { lat, lng, user_id } = params
//     const central = await getUserDistance(user_id, lat, lng)
//     const northPt = destinationPoint(lat, lng, central.distance, 0)
//     const north = await getUserDistance(user_id, northPt.lat, northPt.lng)
//     const southPt = destinationPoint(lat, lng, central.distance, 0)
//     const south = await getUserDistance(user_id, southPt.lat, southPt.lng)
//     const eastPt = destinationPoint(lat, lng, central.distance, 90)
//     const east = await getUserDistance(user_id, eastPt.lat, eastPt.lng)
//     const westPt = destinationPoint(lat, lng, central.distance, 270)
//     const west = await getUserDistance(user_id, westPt.lat, westPt.lng)

//     const probePoints = { central, north, south, east, west }

//     // Generate all pairs
//     const values = [...Object.values(probePoints), ...allProbePoints]
//     for (const point of values) {
//       if (point.distance === -1) {
//         return { ...point, user_id }
//       }
//     }
//     const pointPairs: Array<{ p1: typeof central; p2: typeof central }> = []
//     for (let i = 0; i < values.length; i++) {
//       for (let j = i + 1; j < values.length; j++) {
//         if (values[i].lat !== values[j].lat && values[i].lng !== values[j].lng) {
//           pointPairs.push({ p1: values[i], p2: values[j] })
//         }
//       }
//     }
//     // Compute circle intersections for each pair
//     const intersections = pointPairs.map(({ p1, p2 }) => {
//       const lat1Rad = toRadians(p1.lat)
//       const lng1Rad = toRadians(p1.lng)
//       const lat2Rad = toRadians(p2.lat)
//       const lng2Rad = toRadians(p2.lng)
//       const pairDist = haversineDistanceMeters(p1.lat, p1.lng, p2.lat, p2.lng)

//       if (p1.distance + p2.distance < pairDist || Math.abs(p1.distance - p2.distance) > pairDist) {
//         return null
//       }

//       const angDist = pairDist / EARTH_RADIUS_METERS
//       const angR1 = p1.distance / EARTH_RADIUS_METERS
//       const angR2 = p2.distance / EARTH_RADIUS_METERS
//       const alpha = Math.acos(
//         (Math.cos(angR2) - Math.cos(angR1) * Math.cos(angDist)) /
//           (Math.sin(angR1) * Math.sin(angDist)),
//       )
//       const bearing = Math.atan2(
//         Math.sin(lng2Rad - lng1Rad) * Math.cos(lat2Rad),
//         Math.cos(lat1Rad) * Math.sin(lat2Rad) -
//           Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lng2Rad - lng1Rad),
//       )

//       const computePoint = (brg: number) => {
//         const newLat = Math.asin(
//           Math.sin(lat1Rad) * Math.cos(angR1) + Math.cos(lat1Rad) * Math.sin(angR1) * Math.cos(brg),
//         )
//         const newLng =
//           lng1Rad +
//           Math.atan2(
//             Math.sin(brg) * Math.sin(angR1) * Math.cos(lat1Rad),
//             Math.cos(angR1) - Math.sin(lat1Rad) * Math.sin(newLat),
//           )
//         // debugger
//         return { lat: toDegrees(newLat), lng: toDegrees(newLng) }
//       }

//       const candidate1 = computePoint(bearing + alpha)
//       const candidate2 = computePoint(bearing - alpha)

//       if (
//         Math.abs(candidate1.lat - candidate2.lat) < 1e-10 &&
//         Math.abs(candidate1.lng - candidate2.lng) < 1e-10
//       ) {
//         return [candidate1]
//       }
//       return [candidate1, candidate2]
//     })

//     // Disambiguate: pick the closer intersection point
//     const disambiguated = intersections.map((pair) => {
//       if (pair?.length === 2) {
//         let err0 = 0
//         let err1 = 0
//         for (const ref of allProbePoints) {
//           const d0 = haversineDistanceMeters(ref.lat, ref.lng, pair[0].lat, pair[0].lng)
//           const d1 = haversineDistanceMeters(ref.lat, ref.lng, pair[1].lat, pair[1].lng)
//           err0 += Math.abs(d0 - ref.distance)
//           err1 += Math.abs(d1 - ref.distance)
//         }
//         // debugger
//         return err0 <= err1 ? [pair[0]] : [pair[1]]
//       }
//       return pair
//     })

//     const validPoints = disambiguated
//       .filter(
//         (pts): pts is { lat: number; lng: number }[] =>
//           pts != null && pts.length > 0 && pts[0] != null,
//       )
//       .flat()

//     const averaged = validPoints.reduce(
//       (acc, pt) => ({
//         lat: acc.lat + pt.lat / validPoints.length,
//         lng: acc.lng + pt.lng / validPoints.length,
//       }),
//       { lat: 0, lng: 0 },
//     )
//     debugger
//     const avgResult = await getUserDistance(user_id, averaged.lat, averaged.lng)
//     const result = { ...averaged, distance: avgResult.distance }
//     allProbePoints.push(result)

//     if (result.distance !== -1) {
//       closest = await trilaterationStep({ lat: result.lat, lng: result.lng, user_id }, [
//         central,
//         north,
//         south,
//         east,
//         west,
//         result,
//         ...allProbePoints,
//       ])
//     }

//     return { ...closest, user_id }
//   }

//   await trilaterationStep({ lat, lng, user_id }, [])
//   const grid_distance = await fetchGridDistance(closest.lat, closest.lng, user_id)
//   const pigs_distance = await fetchPigsDistance(closest.lat, closest.lng, user_id)
//   console.log(grid_distance.distance, grid_distance.string, closest.distance, pigs_distance)
//   return closest
// }
