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
    navigating: false,
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
    g.current.navigating = true
    applyTransform(dir === 1 ? -window.innerWidth : window.innerWidth, 1, 0, 0, true)
    setTimeout(() => {
      g.current.scale = 1
      g.current.offsetX = 0
      g.current.offsetY = 0
      g.current.dragX = 0
      g.current.navigating = false
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
        if (!g.current.navigating && Math.abs(dragX) > 60) {
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
    } else if (ptrs.current.size === 1) {
      const remaining = [...ptrs.current.values()][0]
      g.current.startX = remaining.x
      g.current.startY = remaining.y
      g.current.type = g.current.scale > 1 ? 'pan' : 'swipe'
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (g.current.navigating) return
      if (e.key === 'ArrowLeft' && index > 0) commitAdvance(-1)
      if (e.key === 'ArrowRight' && index < photos.length - 1) commitAdvance(1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [index, onClose])

  const photo = photos[index]

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: lightbox backdrop click-to-close is intentional UX
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard close is handled by the keydown listener above
    <div
      class="nkp-lightbox"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button type="button" class="nkp-lightbox-close" onClick={onClose}>
        ×
      </button>

      <button
        type="button"
        class="nkp-lightbox-arrow prev"
        style={{ opacity: index === 0 ? 0 : 1, pointerEvents: index === 0 ? 'none' : 'auto' }}
        tabIndex={index === 0 ? -1 : 0}
        onClick={() => commitAdvance(-1)}
      >
        ‹
      </button>

      <img
        ref={imgRef}
        src={photo.url}
        alt={`${index + 1} of ${photos.length}`}
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
        tabIndex={index === photos.length - 1 ? -1 : 0}
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
