import type { SelectedProfile } from '../App'
import { useProfile } from '../hooks/useProfile'
import { useInbox } from '../hooks/useInbox'
import { Avatar } from '../components/Avatar'
import { DopplerBadge } from '../components/DopplerBadge'
import { Spinner } from '../components/Spinner'
import { ErrorBanner } from '../components/ErrorBanner'
import type { Photo } from '../types/api.types'

interface Props {
  profile: SelectedProfile | null
  onOpenThread: (threadId: number) => void
}

export function ProfileTab({ profile, onOpenThread }: Props) {
  const { data, loading, error, refresh } = useProfile(profile)
  const inbox = useInbox()

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

  // Find existing thread for this user so Message button can open it
  const existingThread = inbox.data?.threads.find(t => t.sender_id === data.id)

  function handleMessage() {
    if (existingThread) {
      onOpenThread(existingThread.thread_id)
    } else {
      // No existing thread — navigate to Messages tab where compose will open
      // with recipient pre-filled (thread_id "0" = new message)
      onOpenThread(0)
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
            <img
              key={i}
              src={p.url}
              alt={`Photo ${i + 1}`}
              class="nkp-photo-thumb"
              loading="lazy"
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
          <button class="nkp-btn nkp-btn-primary nkp-btn-full" onClick={handleMessage}>
            ✉ Message {data.nick}
          </button>
        </div>
      )}
    </div>
  )
}
