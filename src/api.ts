import type { Grid, OinkGridParams, Profile, ProfileQueryParams } from './types/api.types'

// fetch 50 most recent messages as JSON:
export const fetchMail = async () => {
  const response = await fetch(
    'https://nastykinkpigs.com/api/organized-chat.php?action=inbox&limit=100&filter=all&sort=date_desc',
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
