# Technology Stack

**Analysis Date:** 2026-05-18

## Languages

**Primary:**
- TypeScript 5.8.3 - All application source code under `src/`
- TSX (TypeScript + JSX) - Component files (`src/main.tsx`, `src/App.tsx`, `src/tabs/*.tsx`, `src/components/*.tsx`)

**Secondary:**
- JavaScript (ESM) - Build scripts (`scripts/gen-bookmarklet.mjs`)
- HTML - Static install page (`install/index.html`)

## Runtime

**Environment:**
- Browser (Chrome 108+, Firefox 110+, Safari 16+) — the bundle runs as a bookmarklet injected into the user's browser tab

**Node.js (build-time only):**
- Node.js 20 (pinned in `deploy.yml` via `actions/setup-node@v4`)
- No `.nvmrc` or `.node-version` file in repo; version constraint is CI-only

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (CI uses `npm ci`)

## Frameworks

**Core:**
- Preact 10.25.4 - UI rendering; chosen for minimal bundle size vs React

**Build/Dev:**
- Vite 6.3.5 - Build tool; configured as IIFE lib build outputting `dist/bundle.js`
- `@preact/preset-vite` 2.10.1 - Preact JSX transform + HMR integration for Vite

**Testing:**
- Not configured — no test runner present

## Key Dependencies

**Critical:**
- `preact` ^10.25.4 - Only runtime dependency; provides `render`, `h`, hooks (`useState`, `useEffect`, `useCallback`, `useRef`)

**Dev / Build:**
- `@biomejs/biome` 2.4.15 - Linting and formatting (replaces ESLint + Prettier)
- `typescript` ^5.8.3 - Type checking; `noEmit: true` (Vite handles transpilation)
- `vite` ^6.3.5 - IIFE bundle build; single output file required by bookmarklet constraint
- `@preact/preset-vite` ^2.10.1 - JSX factory wiring + Preact-specific Babel transforms

## Configuration

**TypeScript:**
- `tsconfig.json` — `target: ES2020`, `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- JSX: `"jsx": "react-jsx"` with `"jsxImportSource": "preact"`
- Path aliases: `@api` → `src/api.ts`, `@types/*` → `src/types/*`

**Build:**
- `vite.config.ts` — lib mode, IIFE format, single entry `src/main.tsx`, output `dist/bundle.js`
- CSS extraction disabled (`cssCodeSplit: false`); all styles live in `src/styles/index.ts` as a JS string constant
- Defines `__GIT_SHA__` and `__BUNDLE_URL__` as compile-time constants
- `publicDir: 'install'` copies `install/` contents into `dist/` (GitHub Pages install page)
- Browser targets: `['chrome108', 'firefox110', 'safari16']`

**Linting/Formatting:**
- `biome.json` — Biome 2.x; 2-space indent, LF, 100-char line width, single quotes in JS/TS, no semicolons, trailing commas

**Environment:**
- No `.env` files; no runtime environment variables — all configuration is hardcoded or injected at build time via Vite `define`
- The only sensitive context is the user's browser session cookie, which is passed automatically via `credentials: 'include'` on all fetch calls

## Platform Requirements

**Development:**
- Node.js 20+, npm
- Run `npm run dev` (Vite watch build) + `npm run preview` (serve `dist/`)
- Bookmarklet URL from `node scripts/gen-bookmarklet.mjs --dev` installed in browser

**Production:**
- GitHub Pages hosting at `https://attaris-base.github.io/nkp-deshittifier/`
- Output: single file `dist/bundle.js` (IIFE)
- Bundle size target: < 50 KB gzipped (enforced by CI check in `deploy.yml`)
- Deploy: push to `main` → GitHub Actions (`deploy.yml`) → `peaceiris/actions-gh-pages@v4` publishes `dist/` to `gh-pages` branch

---

*Stack analysis: 2026-05-18*
