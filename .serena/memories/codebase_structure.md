# Codebase Structure

```
src/
  main.tsx              Entry point: domain check, page wipe, style injection, render(<App />)
  App.tsx               Root component: tab state, profile routing, unread badge count
  api.ts                ALL API calls (fetchMail, fetchThread, sendMessage, fetchOinkGrid, fetchProfileData)
  types/api.types.ts    ALL TypeScript types — never redefine elsewhere
  styles/index.ts       ALL CSS as exported string constant STYLES — never add .css files
  hooks/
    useInbox.ts         Wraps fetchMail(), re-fetches on visibilitychange
    useThread.ts        Fetches thread by ID, sends messages, CSRF retry on 403
    useGeo.ts           navigator.geolocation with module-scope cache
    useGrid.ts          Wraps fetchOinkGrid(), filter state, pagination
    useProfile.ts       Wraps fetchProfileData(), keyed by selected profile ID
  tabs/
    MessagesTab.tsx     InboxView + ThreadView, compose bar
    NearbyTab.tsx       Filter bar, user cards with heat badges, load-more
    ProfileTab.tsx      Profile detail, photo gallery, Message button
  components/
    TabBar.tsx
    Avatar.tsx
    DopplerBadge.tsx
    Spinner.tsx
    ErrorBanner.tsx
install/
  index.html            Standalone GitHub Pages install page (no Vite, no framework)
scripts/
  gen-bookmarklet.mjs   Prints bookmarklet URL to terminal
.github/workflows/
  deploy.yml            CI/CD: build on push, deploy dist/ to gh-pages on main
vite.config.ts          IIFE lib build, publicDir: 'install', defines __GIT_SHA__ and __BUNDLE_URL__
package.json
tsconfig.json
```

## API Endpoints (all implemented in src/api.ts)
| Feature | Function | Endpoint |
|---|---|---|
| Inbox | `fetchMail()` | `GET /api/organized-chat.php?action=inbox` |
| Thread | `fetchThread(thread_id)` | `GET /api/organized-chat.php?action=thread&thread_id=` |
| Send message | `sendMessage(csrf, recipient_id, text, thread_id)` | `POST /api/organized-chat.php` |
| Nearby grid | `fetchOinkGrid({...})` | `GET /mobile/oink/index.php?action=grid` |
| Profile | `fetchProfileData({id, lat, lng})` | `GET /mobile/oink/index.php?action=profile` |

All API calls use `credentials: 'include'` — session cookies handle auth automatically.
