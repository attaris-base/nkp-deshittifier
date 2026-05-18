// Response JSON from fetchMail request
export interface CurrentMail {
  threads: Thread[]
  next_cursor: string
  filter: string
  csrf: string
  viewer_tier: string
  free_mode: boolean
}

export interface Thread {
  thread_id: number
  last_date: Date
  last_id: number
  sender_id: number
  sender_name: string
  sender_photo: string
  subject: string
  preview: string
  total: number
  unread: number
  distance: Distance | null
  pinned: boolean
}

export interface Distance {
  label: string
  slug: Slug
  distance: string
  raw: number
  doppler: Doppler
}

export interface Doppler {
  band: number
  term: Term
  hue_oklch: HueOklch
  p: number
  numeric: string
  meters_raw: number
  age_sec_raw: number
}

export enum HueOklch {
  Oklch55012230 = 'oklch(55% 0.12 230)',
  Oklch58014220 = 'oklch(58% 0.14 220)',
  Oklch58016250 = 'oklch(58% 0.16 250)',
  Oklch60018285 = 'oklch(60% 0.18 285)',
  Oklch62022320 = 'oklch(62% 0.22 320)',
  Oklch6002815 = 'oklch(60% 0.28 15)',
  Oklch65024345 = 'oklch(65% 0.24 345)',
}

export enum Term {
  BlueBalls = 'Blue Balls',
  DifferentPasture = 'Different Pasture',
  OnTheTrail = 'On the Trail',
  SameHerd = 'Same Herd',
  Scenting = 'Scenting',
  SniffingRange = 'Sniffing Range',
  Nuzzle = 'Nuzzle',
}

export enum Slug {
  Miles = 'miles',
}

// Response JSON from fetchThread request:
export interface ThreadDetails {
  thread_id: number
  other_id: number
  other_name: string
  other_photo: string
  other_tz: string
  distance: Distance
  messages: Message[]
  csrf: string
  viewer_tier: string
  free_mode: boolean
}

export interface Message {
  id: number
  date: Date
  sender_id: number
  sender_name: string
  sender_photo: string
  text: string
  subject: string
  is_me: boolean
  unread: boolean
}

// Grid request:
export interface OinkGridParams {
  lat: number
  lng: number
  radius?: number
  window?: string
  position?: string
  page?: number
  page_size?: number
  action?: string
}

// Response JSON from Grid request:
export interface Grid {
  ok: boolean
  pigs: Pig[]
  page: number
  page_size: number
  has_more: boolean
  filters: Filters
  ts: number
}

export interface Filters {
  radius_mi: number
  window: string
  has_photo: boolean
  position: string
}

export interface Pig {
  id: number
  name: string
  age: number | null
  position: Position
  sex: Sex
  avatar: null | string
  gps_age_sec: number
  heat: Heat
  distance_mi: number
  distance_str: string
  doppler: Doppler
  lat: number
  lng: number
  profile_url: string
  mine: boolean
  is_ghost: boolean
  ring_hue: null
  ring_chroma: null
  ring_lightness: null
  ring_sat: null
  ring_stage: null
  loc_source: LOCSource
  pin_label: string
  unread_count: number
}

export enum Heat {
  Idle = 'idle',
  Live = 'live',
  Stale = 'stale',
  Warm = 'warm',
}

export enum LOCSource {
  DropsHeartbeat = 'drops-heartbeat',
  Geopig2Merge = 'geopig2-merge',
  OinkSignal = 'oink-signal',
  Unknown = 'unknown',
  UserPin = 'user-pin',
}

export enum Position {
  Angrytop = 'angrytop',
  Anythinggoes = 'anythinggoes',
  Empty = '',
  Hungryhole = 'hungryhole',
  Veryversatile = 'veryversatile',
}

export enum Sex {
  Male = 'male',
}

// Profile Request:
/**
 * Interface defining the expected query parameters
 */
export interface ProfileQueryParams {
  id: string | number
  lat: number
  lng: number
  action?: string // Optional because we default to 'profile'
}
//Response JSON to profile request:
export interface Profile {
  ok: boolean
  id: number
  nick: string
  age: number
  city: string
  country: string
  position: string
  about: string
  looking: string
  here_for: string
  status: string
  avatar: string
  photos: Photo[]
  distance: string
  doppler: Doppler
  online: boolean
  is_me: boolean
  ring_hue: null
  ring_chroma: null
  ring_lightness: null
  ring_sat: null
  ring_stage: null
  drop: null
  pulse: null
}

// export interface Doppler {
//     band:        number;
//     term:        string;
//     hue_oklch:   string;
//     p:           number;
//     numeric:     string;
//     meters_raw:  number;
//     age_sec_raw: number;
// }

export interface Photo {
  url: string
  type: string
}


// message search response JSON:
export interface MessageSearch {
  results: Result[];
  csrf:    string;
}

export interface Result {
  id:      number;
  date:    Date;
  name:    string;
  photoPath:  string;
  subject: string;
  preview: string;
}
