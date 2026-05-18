import type { Grid, OinkGridParams, Profile, ProfileQueryParams } from './types/api.types'

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
