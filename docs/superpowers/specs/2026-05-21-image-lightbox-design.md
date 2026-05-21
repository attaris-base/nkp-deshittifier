# Image Lightbox — Design Spec

**Date:** 2026-05-21
**Status:** Approved

## Overview

Add a tap-to-open lightbox to the profile photo gallery. Tapping any thumbnail opens a full-screen overlay showing that image. The user can swipe horizontally between all photos, pinch-to-zoom the current image, and pan while zoomed. Prev/next arrow buttons provide an alternative to swiping. Tapping the backdrop, the × button, or pressing Escape closes the lightbox.

## Architecture

### New component: `src/components/Lightbox.tsx`

Self-contained Preact component (~100 lines). Owns all gesture logic and animation. ProfileTab renders it conditionally and passes only what it needs.

**Props:**
```ts
interface LightboxProps {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
}
```

**Internal state:**
```ts
index: number           // currently visible photo
scale: number           // zoom level (1.0 = natural size)
offsetX: number         // pan offset X while zoomed
offsetY: number         // pan offset Y while zoomed
dragX: number           // live horizontal delta during swipe
dragging: boolean       // true while any pointer is active
pointers: Map<id, {x,y}>  // active pointer positions (for pinch)
pinchStartDist: number  // finger distance at pinch start (for scale calc)
```

### Changes to `src/tabs/ProfileTab.tsx`

- Add `lightboxIndex: number | null` state (null = closed)
- Each `<img>` in the gallery gets `onClick={() => setLightboxIndex(i)}` and `cursor: pointer` style
- Render `<Lightbox photos={data.photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />` when `lightboxIndex !== null`

### Changes to `src/styles/index.ts`

~15 lines of new CSS for: overlay, image, close button, prev/next arrows, counter.

## Visual Chrome

**Layout (Option B — arrows):**
- `×` close button: top-right, 36×36px translucent circle (`rgba(255,255,255,0.12)`)
- `‹` / `›` arrows: vertically centered on left/right edges, same translucent circle style; `opacity: 0` (not hidden) when at first/last photo to preserve layout
- Counter `2 / 5`: bottom-center, `--text-muted` color
- Overlay background: `rgba(0,0,0,0.95)`
- z-index: `2147483647` (one above the SPA root)

**Closing:**
- `×` button click
- Backdrop click (pointer event on the overlay itself, not the image)
- `Escape` keydown event

## Gesture Model

Uses the **Pointer Events API** (`onPointerDown`, `onPointerMove`, `onPointerUp`) on the image element. `setPointerCapture` called on each `pointerdown` so events track even if the finger drifts outside the element. `touch-action: none` on the image disables browser-native pinch/scroll.

### Single pointer, scale = 1 → swipe navigation
- `dragX` updates in real-time → `transform: translateX(dragX)` on the image for live follow
- On `pointerup`: if `|dragX| > 60px`, commit advance/retreat with 200ms `ease-out` CSS transition, then update `index` and reset `dragX`, `scale`, `offsetX/Y`
- If below threshold: snap back to `translateX(0)` with same transition

### Two pointers → pinch zoom
- On second `pointerdown`: record `pinchStartDist` (distance between the two pointer positions)
- On `pointermove` with 2 active pointers: `scale = clamp(newDist / pinchStartDist * scaleAtPinchStart, 1, 5)`
- Min scale: 1× (cannot zoom below natural size). Max scale: 5×.

### Single pointer, scale > 1 → pan
- Swipe navigation is disabled while `scale > 1`
- `offsetX/Y` updated by pointer delta
- Pinching back to 1× resets `offsetX/Y` to 0 and re-enables swipe

### Changing photo (swipe commit or arrow tap)
- Always resets `scale` to 1, `offsetX/Y` to 0, `dragX` to 0

## CSS additions (all in `src/styles/index.ts`)

```css
.nkp-lightbox { position:fixed; inset:0; z-index:2147483647; background:rgba(0,0,0,.95); display:flex; align-items:center; justify-content:center; }
.nkp-lightbox-img { max-width:100%; max-height:100%; object-fit:contain; touch-action:none; will-change:transform; user-select:none; }
.nkp-lightbox-close { position:absolute; top:16px; right:16px; width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,.12); border:none; color:var(--text); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.nkp-lightbox-arrow { position:absolute; top:50%; transform:translateY(-50%); width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,.12); border:none; color:var(--text); font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:opacity .15s; }
.nkp-lightbox-arrow.prev { left:12px; }
.nkp-lightbox-arrow.next { right:12px; }
.nkp-lightbox-counter { position:absolute; bottom:20px; left:0; right:0; text-align:center; color:var(--text-muted); font-size:12px; letter-spacing:.5px; }
```

## Files Changed

| File | Change |
|---|---|
| `src/components/Lightbox.tsx` | New file — all gesture logic and overlay rendering |
| `src/tabs/ProfileTab.tsx` | `lightboxIndex` state, `onClick` on thumbs, render `<Lightbox>` |
| `src/styles/index.ts` | ~15 lines of new lightbox CSS appended to `STYLES` |

No new dependencies. No changes to `api.ts`, `types/`, hooks, or other tabs.
