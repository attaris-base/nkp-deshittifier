# Image Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tap any profile photo thumbnail to open a full-screen lightbox with swipe navigation between photos and pinch-to-zoom.

**Architecture:** A new self-contained `Lightbox` component owns all gesture logic using the Pointer Events API with direct DOM transform manipulation (no state on every frame). `ProfileTab` adds one `number | null` state value and conditionally renders `<Lightbox>`. All CSS is appended to the `STYLES` string in `src/styles/index.ts`.

**Tech Stack:** Preact, TypeScript, Biome (lint/format via `npm run check`), Vite IIFE build

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/styles/index.ts` | Modify | Append lightbox CSS; add `cursor:pointer` to `.nkp-photo-thumb` |
| `src/components/Lightbox.tsx` | Create | Full lightbox — gesture engine, overlay, arrows, counter |
| `src/tabs/ProfileTab.tsx` | Modify | `lightboxIndex` state, `onClick` on thumbs, render `<Lightbox>` |

---

## Task 1: CSS additions

**Files:**
- Modify: `src/styles/index.ts`

- [ ] **Step 1.1: Add `cursor:pointer` to `.nkp-photo-thumb`**

  In `src/styles/index.ts`, find line 245:
  ```
  .nkp-photo-thumb{width:100px;height:100px;border-radius:var(--radius-sm);object-fit:cover;flex-shrink:0;background:var(--bg-card)}
  ```
  Replace with:
  ```
  .nkp-photo-thumb{width:100px;height:100px;border-radius:var(--radius-sm);object-fit:cover;flex-shrink:0;background:var(--bg-card);cursor:pointer}
  ```

- [ ] **Step 1.2: Append lightbox CSS before the closing backtick**

  In `src/styles/index.ts`, find the last line of CSS (line 345):
  ```
  .nkp-search-input::placeholder{color:var(--text-dim)}
  ```
  Replace with:
  ```
  .nkp-search-input::placeholder{color:var(--text-dim)}

  /* Lightbox */
  .nkp-lightbox{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center}
  .nkp-lightbox-img{max-width:100%;max-height:100%;object-fit:contain;touch-action:none;will-change:transform;user-select:none;-webkit-user-drag:none}
  .nkp-lightbox-close{position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.12);border:none;color:var(--text);font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
  .nkp-lightbox-arrow{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.12);border:none;color:var(--text);font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .15s;line-height:1}
  .nkp-lightbox-arrow.prev{left:12px}
  .nkp-lightbox-arrow.next{right:12px}
  .nkp-lightbox-counter{position:absolute;bottom:20px;left:0;right:0;text-align:center;color:var(--text-muted);font-size:12px;letter-spacing:.5px;pointer-events:none}
  ```

- [ ] **Step 1.3: Verify build passes**

  Run:
  ```
  npm run build
  ```
  Expected: exits 0, `dist/bundle.js` written, no TypeScript or Vite errors.

---

## Task 2: Create Lightbox component

**Files:**
- Create: `src/components/Lightbox.tsx`

- [ ] **Step 2.1: Create the file**

  Create `src/components/Lightbox.tsx` with this content:

  ```tsx
  import { useEffect, useRef, useState } from 'preact/hooks'
  import type { Photo } from '../types/api.types'

  interface Props {
    photos: Photo[]
    initialIndex: number
    onClose: () => void
  }

  type GestureType = 'none' | 'swipe' | 'pinch' | 'pan'

  export function Lightbox({ photos, initialIndex, onClose }: Props) {
    const [index, setIndex] = useState(initialIndex)
    const imgRef = useRef<HTMLImageElement>(null)
    const ptrs = useRef(new Map<number, { x: number; y: number }>())
    const g = useRef({
      type: 'none' as GestureType,
      dragX: 0,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      pinchStartDist: 0,
      scaleAtPinchStart: 1,
      startX: 0,
      startY: 0,
    })

    function applyTransform(tx: number, sc: number, ox: number, oy: number, animated = false) {
      const img = imgRef.current
      if (!img) return
      img.style.transition = animated ? 'transform 0.2s ease-out' : 'none'
      img.style.transform = `translate(${tx + ox}px,${oy}px) scale(${sc})`
    }

    function commitAdvance(dir: 1 | -1) {
      const next = index + dir
      if (next < 0 || next >= photos.length) {
        applyTransform(0, 1, g.current.offsetX, g.current.offsetY, true)
        return
      }
      applyTransform(dir === 1 ? -window.innerWidth : window.innerWidth, 1, 0, 0, true)
      setTimeout(() => {
        g.current.scale = 1
        g.current.offsetX = 0
        g.current.offsetY = 0
        g.current.dragX = 0
        setIndex(next)
        const img = imgRef.current
        if (img) {
          img.style.transition = 'none'
          img.style.transform = 'translate(0,0) scale(1)'
        }
      }, 200)
    }

    function onPointerDown(e: PointerEvent) {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (ptrs.current.size === 1) {
        g.current.startX = e.clientX
        g.current.startY = e.clientY
        g.current.type = g.current.scale > 1 ? 'pan' : 'swipe'
      } else if (ptrs.current.size === 2) {
        g.current.type = 'pinch'
        const [p1, p2] = [...ptrs.current.values()]
        g.current.pinchStartDist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
        g.current.scaleAtPinchStart = g.current.scale
      }
    }

    function onPointerMove(e: PointerEvent) {
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const { type, scale, offsetX, offsetY, startX, startY, pinchStartDist, scaleAtPinchStart } =
        g.current
      if (type === 'swipe') {
        const dx = e.clientX - startX
        g.current.dragX = dx
        applyTransform(dx, 1, 0, 0)
      } else if (type === 'pan') {
        applyTransform(0, scale, offsetX + (e.clientX - startX), offsetY + (e.clientY - startY))
      } else if (type === 'pinch' && ptrs.current.size === 2) {
        const [p1, p2] = [...ptrs.current.values()]
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
        const newScale = Math.min(5, Math.max(1, (dist / pinchStartDist) * scaleAtPinchStart))
        g.current.scale = newScale
        applyTransform(0, newScale, offsetX, offsetY)
      }
    }

    function onPointerUp(e: PointerEvent) {
      ptrs.current.delete(e.pointerId)
      const { type, dragX, scale, offsetX, offsetY, startX, startY } = g.current

      if (ptrs.current.size === 0) {
        if (type === 'swipe') {
          if (Math.abs(dragX) > 60) {
            commitAdvance(dragX < 0 ? 1 : -1)
          } else {
            applyTransform(0, 1, 0, 0, true)
            g.current.dragX = 0
          }
        } else if (type === 'pan') {
          if (scale <= 1) {
            g.current.scale = 1
            g.current.offsetX = 0
            g.current.offsetY = 0
            applyTransform(0, 1, 0, 0)
          } else {
            g.current.offsetX = offsetX + (e.clientX - startX)
            g.current.offsetY = offsetY + (e.clientY - startY)
          }
        } else if (type === 'pinch') {
          if (scale <= 1) {
            g.current.scale = 1
            g.current.offsetX = 0
            g.current.offsetY = 0
            applyTransform(0, 1, 0, 0, true)
          }
        }
        g.current.type = 'none'
      } else if (ptrs.current.size === 1 && type === 'pinch') {
        const remaining = [...ptrs.current.values()][0]
        g.current.startX = remaining.x
        g.current.startY = remaining.y
        g.current.type = g.current.scale > 1 ? 'pan' : 'swipe'
      }
    }

    function onPointerCancel(e: PointerEvent) {
      ptrs.current.delete(e.pointerId)
      if (ptrs.current.size === 0) {
        g.current.type = 'none'
        applyTransform(0, g.current.scale, g.current.offsetX, g.current.offsetY, true)
      }
    }

    useEffect(() => {
      function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
          onClose()
          return
        }
        if (e.key === 'ArrowLeft' && index > 0) commitAdvance(-1)
        if (e.key === 'ArrowRight' && index < photos.length - 1) commitAdvance(1)
      }
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }, [index, onClose])

    const photo = photos[index]

    return (
      <div class="nkp-lightbox" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <button type="button" class="nkp-lightbox-close" onClick={onClose}>
          ×
        </button>

        <button
          type="button"
          class="nkp-lightbox-arrow prev"
          style={{ opacity: index === 0 ? 0 : 1, pointerEvents: index === 0 ? 'none' : 'auto' }}
          onClick={() => commitAdvance(-1)}
        >
          ‹
        </button>

        <img
          ref={imgRef}
          src={photo.url}
          alt={`Photo ${index + 1}`}
          class="nkp-lightbox-img"
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        />

        <button
          type="button"
          class="nkp-lightbox-arrow next"
          style={{
            opacity: index === photos.length - 1 ? 0 : 1,
            pointerEvents: index === photos.length - 1 ? 'none' : 'auto',
          }}
          onClick={() => commitAdvance(1)}
        >
          ›
        </button>

        {photos.length > 1 && (
          <div class="nkp-lightbox-counter">
            {index + 1} / {photos.length}
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2.2: Lint and build**

  Run:
  ```
  npm run check
  ```
  Expected: exits 0, Biome reports no errors, auto-fixes applied if any formatting drift. If it exits non-zero, read the error and fix before continuing.

  Then run:
  ```
  npm run build
  ```
  Expected: exits 0.

---

## Task 3: Wire Lightbox into ProfileTab

**Files:**
- Modify: `src/tabs/ProfileTab.tsx`

- [ ] **Step 3.1: Add the Lightbox import**

  In `src/tabs/ProfileTab.tsx`, after the existing component imports add:
  ```tsx
  import { Lightbox } from '../components/Lightbox'
  ```
  The import block should now read:
  ```tsx
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
  ```

- [ ] **Step 3.2: Add `lightboxIndex` state**

  In `ProfileTab`, after the existing `useState` declarations (lines 20–21):
  ```tsx
  const [initiating, setInitiating] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  ```
  Add:
  ```tsx
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  ```

- [ ] **Step 3.3: Make thumbnails tappable**

  In `ProfileTab`, replace the photo gallery block (lines 87–99):
  ```tsx
  {/* Photo gallery */}
  {data.photos.length > 0 && (
    <div class="nkp-photo-gallery">
      {data.photos.map((p: Photo, i: number) => (
        <img
          key={i}
          src={p.url}
          alt={`Gallery ${i + 1}`}
          class="nkp-photo-thumb"
          loading="lazy"
        />
      ))}
    </div>
  )}
  ```
  With:
  ```tsx
  {/* Photo gallery */}
  {data.photos.length > 0 && (
    <div class="nkp-photo-gallery">
      {data.photos.map((p: Photo, i: number) => (
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
  ```

- [ ] **Step 3.4: Render the Lightbox**

  In `ProfileTab`, find the closing `</div>` of the outer return (line 151):
  ```tsx
      </div>
    )
  }
  ```
  Replace with:
  ```tsx
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
  ```

- [ ] **Step 3.5: Final lint + build check**

  Run:
  ```
  npm run check
  ```
  Expected: exits 0.

  Then run:
  ```
  npm run build
  ```
  Expected: exits 0. Check bundle size is still under 50 KB gzipped:
  ```
  npm run build 2>&1 | Select-String "kB"
  ```
  (On bash: `npm run build 2>&1 | grep kB`)

- [ ] **Step 3.6: Manual smoke test**

  Run `npm run dev` in one terminal and `npm run preview` in another. Fire the dev bookmarklet on nastykinkpigs.com and open a profile with multiple photos. Verify:
  - Tapping a thumbnail opens the overlay
  - `×` button closes it
  - Tapping the dark backdrop closes it
  - `‹` / `›` arrows navigate between photos (invisible when at the first/last)
  - Counter reads "N / total" correctly
  - Swiping left/right navigates between photos with snap animation
  - Pinch opens zoom; single-finger pan works while zoomed; pinching back to 1× resets

- [ ] **Step 3.7: Commit**

  ```
  git add src/styles/index.ts src/components/Lightbox.tsx src/tabs/ProfileTab.tsx
  git commit -m "feat(profile): add photo lightbox with swipe and pinch-to-zoom"
  ```
