# NKP Deshittifier

A bookmarklet that replaces nastykinkpigs.com's broken UI with a clean, functional dashboard. Fire it on any page of the site while logged in.

**Features:** Messages (inbox → thread → reply) · Nearby users (geo grid with filters) · Profile view with photo gallery

**Stack:** Preact + Vite + TypeScript → single IIFE bundle served via GitHub Pages

---

## Install (users)

Visit the install page and follow the instructions for your browser:

> **https://attaris-base.github.io/nkp-deshittifier/**

---

## Development

### Prerequisites
- Node 20+
- A logged-in nastykinkpigs.com session in your browser

### Setup

```bash
npm install
```

### Dev workflow

1. **Build in watch mode** (rebuilds on every save):
   ```bash
   npm run dev
   ```

2. **Serve the built bundle** locally:
   ```bash
   npm run preview
   # → bundle available at http://localhost:5173/bundle.js
   ```

3. **Get the dev bookmarklet URL** (points to localhost):
   ```bash
   node scripts/gen-bookmarklet.mjs --dev
   ```
   Copy the output URL and install it as a bookmark. Fire it on nastykinkpigs.com during development.

4. **Get the production bookmarklet URL** (points to GitHub Pages):
   ```bash
   node scripts/gen-bookmarklet.mjs
   ```

### Production build

```bash
npm run build
# → dist/bundle.js  (target: < 50 KB gzipped)
```

### Deployment

Push to `main` → GitHub Actions builds and deploys `dist/` to the `gh-pages` branch automatically.

---

## Browser support (MVP)

| Browser | Desktop | Mobile |
|---|---|---|
| Chrome | ✓ | ✓ |
| Firefox | ✓ | — |
| Safari | ✓ | ✓ (iOS) |

---

## Architecture

```
Bookmarklet loader (javascript: URL)
  └── loads bundle.js from GitHub Pages
        └── domain check (nastykinkpigs.com only)
              └── replaces page → mounts Preact SPA
                    ├── Messages tab  (useInbox / useThread)
                    ├── Nearby tab    (useGeo / useGrid)
                    └── Profile tab   (useProfile)
```

All API calls use `credentials: 'include'` — the user's existing session cookies handle auth automatically.

---

## Known limitations / TODO

- **New thread compose**: `sendMessage` requires a `thread_id`. The correct `parent_id` value for brand-new conversations needs to be confirmed against the API before the "Message" button on a profile with no existing thread is fully functional.
- **Old HTML endpoints** (`/oink/index.php`): Not implemented. Could be added as fallback if JSON endpoints degrade.
- **Firefox Android**: Not tested in MVP.
