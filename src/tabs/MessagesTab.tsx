import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import type { SelectedProfile } from '../App'
import { useInbox } from '../hooks/useInbox'
import { useThread } from '../hooks/useThread'
import { Avatar } from '../components/Avatar'
import { DopplerBadge } from '../components/DopplerBadge'
import { Spinner } from '../components/Spinner'
import { ErrorBanner } from '../components/ErrorBanner'
import type { Thread, Message } from '../types/api.types'

interface Props {
  onViewProfile: (p: SelectedProfile) => void
  pendingThreadId: number | null
  onThreadOpened: () => void
  onUnreadChange: (n: number) => void
}

/** Format a date for display: today → time, else → short date */
function fmtDate(raw: Date | string): string {
  const d = new Date(raw)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const diff = now.getTime() - d.getTime()
  if (diff < 7 * 86400_000)
    return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ─── InboxView ────────────────────────────────────────────────────────────────

interface InboxProps {
  threads: Thread[]
  onSelect: (t: Thread) => void
  onRefresh: () => void
}

function InboxView({ threads, onSelect, onRefresh }: InboxProps) {
  if (threads.length === 0) {
    return (
      <div class="nkp-empty">
        <div class="nkp-empty-icon">✉</div>
        <div class="nkp-empty-title">No messages yet</div>
        <div class="nkp-empty-sub">New messages will appear here</div>
      </div>
    )
  }

  return (
    <div class="nkp-list">
      {threads.map(t => (
        <div
          key={t.thread_id}
          class={`nkp-thread-row${t.unread > 0 ? ' unread' : ''}`}
          onClick={() => onSelect(t)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onSelect(t)}
        >
          <Avatar
            src={t.sender_photo}
            name={t.sender_name}
            badge={t.unread > 0 ? t.unread : undefined}
          />
          <div class="nkp-thread-body">
            <div class="nkp-thread-sender">{t.sender_name}</div>
            <div class="nkp-thread-preview">{t.preview}</div>
            {t.distance && (
              <DopplerBadge
                doppler={t.distance.doppler}
                distance={t.distance.distance}
              />
            )}
          </div>
          <div class="nkp-thread-meta">
            <span class="nkp-thread-time">{fmtDate(t.last_date)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── ThreadView ───────────────────────────────────────────────────────────────

interface ThreadProps {
  threadId: number
  onBack: () => void
  onViewProfile: (p: SelectedProfile) => void
  geo: { lat: number; lng: number }
}

function ThreadView({ threadId, onBack, onViewProfile, geo }: ThreadProps) {
  const { data, loading, error, sending, refresh, send } = useThread(threadId)
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  // Swipe-right to go back
  const touchStartX = useRef(0)
  const handleTouchStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: TouchEvent) => {
    if (e.changedTouches[0].clientX - touchStartX.current > 80) onBack()
  }

  const handleSend = async () => {
    const msg = text.trim()
    if (!msg || sending) return
    setText('')
    await send(msg)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) return <Spinner label="Loading conversation…" />
  if (error) return <ErrorBanner message={error} onRetry={refresh} />
  if (!data) return null

  const { other_name, other_photo, other_id, messages, distance } = data

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div class="nkp-header">
        <button class="nkp-header-back" onClick={onBack} aria-label="Back to inbox">‹</button>
        <button
          class="nkp-header-title"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
          onClick={() => onViewProfile({ id: other_id, lat: geo.lat, lng: geo.lng })}
        >
          {other_name}
        </button>
        {distance && <DopplerBadge doppler={distance.doppler} distance={distance.distance} />}
        <button class="nkp-header-action" onClick={refresh} aria-label="Refresh">↻</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        <div class="nkp-thread-scroll">
          {messages.map((m: Message) => (
            <div key={m.id} class={`nkp-bubble-row${m.is_me ? ' me' : ' them'}`}>
              {!m.is_me && (
                <Avatar src={other_photo} name={other_name} size="sm" />
              )}
              <div>
                <div class="nkp-bubble-time">{fmtDate(m.date)}</div>
                <div class="nkp-bubble">{m.text}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div class="nkp-compose">
        <textarea
          class="nkp-compose-input"
          placeholder="Write a message…"
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
        />
        <button
          class="nkp-compose-send"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          aria-label="Send message"
        >
          {sending ? <div class="nkp-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : '↑'}
        </button>
      </div>
    </div>
  )
}

// ─── MessagesTab ──────────────────────────────────────────────────────────────

/** Cached geolocation for "message from profile" context */
const geoCache = { lat: 0, lng: 0 }
if (typeof navigator !== 'undefined' && navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    p => { geoCache.lat = p.coords.latitude; geoCache.lng = p.coords.longitude },
    () => { /* use 0,0 fallback */ },
    { maximumAge: 300_000 },
  )
}

export function MessagesTab({ onViewProfile, pendingThreadId, onThreadOpened, onUnreadChange }: Props) {
  const inbox = useInbox()
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null)

  // Propagate unread count upward
  useEffect(() => { onUnreadChange(inbox.unreadCount) }, [inbox.unreadCount, onUnreadChange])

  // Open a specific thread if requested from Profile tab
  // pendingThreadId === 0 means "new thread" (API parent_id TBD) — just open inbox for now
  useEffect(() => {
    if (pendingThreadId != null && pendingThreadId > 0) {
      setActiveThreadId(pendingThreadId)
      onThreadOpened()
    } else if (pendingThreadId === 0) {
      // TODO: open new-message compose once API parent_id for new threads is confirmed
      onThreadOpened()
    }
  }, [pendingThreadId, onThreadOpened])

  if (inbox.error === 'not-logged-in') {
    return (
      <div class="nkp-overlay">
        <div class="nkp-overlay-icon">🔒</div>
        <div class="nkp-overlay-title">Not logged in</div>
        <div class="nkp-overlay-sub">
          <a href="https://nastykinkpigs.com/login" target="_self">Log in to nastykinkpigs.com</a>
        </div>
      </div>
    )
  }

  if (activeThreadId != null) {
    return (
      <ThreadView
        threadId={activeThreadId}
        onBack={() => { setActiveThreadId(null); inbox.refresh() }}
        onViewProfile={onViewProfile}
        geo={geoCache}
      />
    )
  }

  return (
    <div>
      <div class="nkp-header">
        <span class="nkp-header-title">Messages</span>
        <button class="nkp-header-action" onClick={inbox.refresh} aria-label="Refresh inbox">↻</button>
      </div>
      {inbox.loading && <Spinner label="Loading messages…" />}
      {inbox.error && !inbox.loading && (
        <ErrorBanner message={inbox.error} onRetry={inbox.refresh} />
      )}
      {inbox.data && !inbox.loading && (
        <InboxView
          threads={inbox.data.threads}
          onSelect={t => setActiveThreadId(t.thread_id)}
          onRefresh={inbox.refresh}
        />
      )}
    </div>
  )
}
