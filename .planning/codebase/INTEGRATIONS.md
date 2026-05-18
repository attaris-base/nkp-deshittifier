# External Integrations

**Analysis Date:** 2026-05-18

## APIs & External Services

**nastykinkpigs.com JSON API (primary target):**
- `GET /api/organized-chat.php?action=inbox` — Inbox thread list
  - Client function: `fetchMail()` in `src/api.ts`
  - Auth: browser session cookie via `credentials: 'include'`
- `GET /api/organized-chat.php?action=thread&thread_id=<id>` — Single thread messages + CSRF token
  - Client function: `fetchThread(thread_id)` in `src/api.ts`
  - Auth: browser session cookie
- `POST /api/organized-chat.php` — Send a message (form-encoded body)
  - Client function: `sendMessage(csrf, recipient_id, text, thread_id)` in `src/api.ts`
  - Auth: browser session cookie + `_csrf` token from `fetchThread` response
  - Retry logic: `useThread.ts` re-fetches CSRF and retries once on `403` or `ok: false`
- `GET /mobile/oink/index.php?action=grid` — Nearby users grid (lat/lng + filters)
  - Client function: `fetchOinkGrid(params)` in `src/api.ts`
  - Auth: browser session cookie
- `GET /mobile/oink/index.php?action=profile` — Individual user profile
  - Client function: `fetchProfileData(params)` in `src/api.ts`
  - Auth: browser session cookie

**No SDK used** — all calls are raw `fetch()` with manually crafted headers to spoof the site's own mobile client UA. Headers include spoofed `sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform` to match the site's expected mobile request signature.

## Data Storage

**Databases:**
- None — no database. The bookmarklet is a pure client-side SPA; all data is fetched on demand from the target site API and held in component/hook state only.

**File Storage:**
- None

**Caching:**
- Module-scope in-memory cache for geolocation: `src/hooks/useGeo.ts` (variable `cached`)
- No localStorage, sessionStorage, or IndexedDB usage

## Authentication & Identity

**Auth Provider:**
- None managed by this app. Authentication is entirely delegated to the user's existing nastykinkpigs.com browser session.
- The user must already be logged in to nastykinkpigs.com before firing the bookmarklet.
- All API calls use `credentials: 'include'` — no tokens, no OAuth flow, no login UI.
- CSRF tokens are short-lived strings returned in API responses (`fetchThread`, `fetchMail`); `useThread.ts` handles CSRF expiry by re-fetching and retrying.

## Browser APIs Used

**Geolocation:**
- `navigator.geolocation.getCurrentPosition()` — `src/hooks/useGeo.ts`
- Required for the Nearby tab (`src/tabs/NearbyTab.tsx`)
- Timeout: 10 seconds; max age: 5 minutes
- Graceful degradation: denied/unsupported states handled

**Visibility API:**
- `document.addEventListener('visibilitychange')` — `src/hooks/useInbox.ts`
- Re-fetches inbox when tab regains focus

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, or similar service

**Logs:**
- `console.info('[NKP Deshittifier] booting — build <sha>')` on startup (`src/main.tsx`)
- No structured logging

## CI/CD & Deployment

**Hosting:**
- GitHub Pages at `https://attaris-base.github.io/nkp-deshittifier/`
- Serves: `dist/bundle.js` (the SPA bundle) and `dist/index.html` (the bookmarklet install page)

**CI Pipeline:**
- GitHub Actions — `.github/workflows/deploy.yml`
- Trigger: push or PR to `main`
- Steps: checkout → Node 20 setup → `npm ci` → `npm run build` → gzip size check (warns if > 51,200 bytes) → deploy via `peaceiris/actions-gh-pages@v4` (only on `main` branch push)
- Secret used: `GITHUB_TOKEN` (automatic, no custom secrets required)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Environment Configuration

**Required env vars:**
- None at runtime or build time
- `GITHUB_TOKEN` is the only secret, provided automatically by GitHub Actions for the Pages deploy step

**Secrets location:**
- No application secrets. The only secret is the user's nastykinkpigs.com session cookie, which lives entirely in the browser and is never touched by this codebase.

---

*Integration audit: 2026-05-18*
