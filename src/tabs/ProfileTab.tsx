import { useState } from 'preact/hooks'
import type { SelectedProfile } from '../App'
import { searchMessages, sendOink } from '../api'
import { Avatar } from '../components/Avatar'
import { DopplerBadge } from '../components/DopplerBadge'
import { ErrorBanner } from '../components/ErrorBanner'
import { Lightbox } from '../components/Lightbox'
import { Spinner } from '../components/Spinner'
import { useInbox } from '../hooks/useInbox'
import { useProfile } from '../hooks/useProfile'
import type { MessageSearch, MessageSearchResult, Photo } from '../types/api.types'

interface Props {
  profile: SelectedProfile | null
  onOpenThread: (threadId: number) => void
}

export function ProfileTab({ profile, onOpenThread }: Props) {
  const { data, loading, error, refresh } = useProfile(profile)
  const inbox = useInbox()
  const [initiating, setInitiating] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!profile) {
    return (
      <div class="nkp-empty">
        <div class="nkp-empty-icon">◉</div>
        <div class="nkp-empty-title">No profile selected</div>
        <div class="nkp-empty-sub">Browse Nearby or tap a sender to view a profile</div>
      </div>
    )
  }

  if (loading) return <Spinner label="Loading profile…" />
  if (error) return <ErrorBanner message={error} onRetry={refresh} />
  if (!data) return null

  // Find existing thread for this user so Message button can open it directly
  const existingThread = inbox.threads.find((t) => t.sender_id === data.id)

  async function handleMessage() {
    if (!data) return
    if (existingThread) {
      onOpenThread(existingThread.thread_id)
      return
    }
    // No existing thread — send an OINK to establish one, then search for it.
    // The OINK message contains "OINK" so searchMessages('oink') will surface the thread.
    setInitiating(true)
    setInitError(null)
    try {
      const sent = await sendOink(String(data.id))
      if (!sent) throw new Error('OINK could not be sent. Please try again.')

      const res = (await searchMessages('oink')) as MessageSearch | null
      const found: MessageSearchResult | undefined =
        res?.results?.find((r: MessageSearchResult) => r.name === data.nick) ?? res?.results?.[0]

      if (!found) throw new Error('Could not locate new conversation. Check your Messages tab.')
      onOpenThread(found.id)
    } catch (e) {
      setInitError((e as Error).message)
    } finally {
      setInitiating(false)
    }
  }

  const ringColor = data.doppler?.hue_oklch ?? undefined

  return (
    <div>
      {/* Hero row */}
      <div class="nkp-profile-hero">
        <Avatar src={data.avatar} name={data.nick} size="lg" ringColor={ringColor} />
        <div class="nkp-profile-details">
          <div class="nkp-profile-nick">
            {data.online && <span class="nkp-online-dot" title="Online now" />}
            {data.nick}
          </div>
          <div class="nkp-profile-sub">
            {[data.age && `${data.age}`, data.city, data.country].filter(Boolean).join(' · ')}
          </div>
          <DopplerBadge doppler={data.doppler} distance={data.distance} />
        </div>
      </div>

      {/* Photo gallery */}
      {data.photos.length > 0 && (
        <div class="nkp-photo-gallery">
          {data.photos.map((p: Photo, i: number) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: gallery thumbnails open a lightbox; keyboard navigation is handled inside the Lightbox component
            <img
              key={i}
              src={p.url}
              alt={`Gallery ${i + 1}`}
              class="nkp-photo-thumb"
              loading="lazy"
              onClick={() => setLightboxIndex(i)}
            />
          ))}
        </div>
      )}

      {/* Bio fields */}
      {data.position && (
        <div class="nkp-profile-section">
          <div class="nkp-profile-label">Position</div>
          <div class="nkp-profile-value">{data.position}</div>
        </div>
      )}
      {data.about && (
        <div class="nkp-profile-section">
          <div class="nkp-profile-label">About</div>
          <div class="nkp-profile-value">{data.about}</div>
        </div>
      )}
      {data.looking && (
        <div class="nkp-profile-section">
          <div class="nkp-profile-label">Looking for</div>
          <div class="nkp-profile-value">{data.looking}</div>
        </div>
      )}
      {data.here_for && (
        <div class="nkp-profile-section">
          <div class="nkp-profile-label">Here for</div>
          <div class="nkp-profile-value">{data.here_for}</div>
        </div>
      )}
      {data.status && (
        <div class="nkp-profile-section">
          <div class="nkp-profile-label">Status</div>
          <div class="nkp-profile-value">{data.status}</div>
        </div>
      )}

      {/* Message button */}
      {!data.is_me && (
        <div class="nkp-msg-btn-wrap">
          {initError && (
            <div class="nkp-error" style={{ marginBottom: '10px' }}>
              <span class="nkp-error-text">{initError}</span>
            </div>
          )}
          <button
            type="button"
            class="nkp-btn nkp-btn-primary nkp-btn-full"
            onClick={handleMessage}
            disabled={initiating}
          >
            {initiating ? 'Contacting…' : `✉ Message ${data.nick}`}
          </button>
        </div>
      )}
      {lightboxIndex !== null && (
        <Lightbox
          photos={data.photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
