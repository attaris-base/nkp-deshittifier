# Code Style and Conventions

## TypeScript
- Strict mode: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- Target: ES2020, module: ESNext
- JSX: `react-jsx` runtime with `jsxImportSource: "preact"`
- No class components — functional components only
- All types live in `src/types/api.types.ts` — never redefine types elsewhere
- Path aliases: `@api` for api.ts, `@types/*` for type files

## Naming
- `camelCase` for variables and functions
- `PascalCase` for types, interfaces, enums, and React/Preact components
- `SCREAMING_SNAKE_CASE` for module-level constants (e.g., `STYLES`)
- Hook files: `use<Name>.ts` pattern

## CRITICAL: CSS must be a JS string
- Vite extracts CSS into a separate file in lib/IIFE mode — a bookmarklet can only load one file
- ALL styles live in `src/styles/index.ts` as the exported string constant `STYLES`
- `main.tsx` injects it via `document.createElement('style')`
- **Never add `.css` files to `src/`** — they will silently break the build

## CRITICAL: API functions
- All API calls are in `src/api.ts` — do not duplicate or re-implement them elsewhere
- All calls use `credentials: 'include'` for session cookie auth

## Visual Theme
Dark/neon. CSS custom properties:
```
--bg: #09090f
--bg-2: #0d0d1a
--bg-card: #16161f
--border: #1e1e2e
--accent: #e040fb      (electric magenta — primary)
--accent-2: #7c4dff    (electric purple — secondary)
--text: #f0f0f0
--text-muted: #888
--radius: 8px
```
Tab bar is at the bottom (mobile-first). All interactive elements use `--accent`.

## Formatter / Linter: Biome 2.x
- Tool: `@biomejs/biome` (exact pin). Config in `biome.json`.
- Style: 2-space indent, LF endings, 100-char line width, single quotes, **no semicolons** (`asNeeded`), trailing commas.
- Key rules: `noUnusedVariables/Imports` (error), `noDebugger` (error), `useConst` (error), `useButtonType` a11y (error), `useSemanticElements` a11y (error).
- All `<button>` elements must have an explicit `type=` attribute (`type="button"` for non-submit buttons).
- Use `<button>` elements instead of `<div role="button">`.
- Run `npm run check` before committing — it reformats and applies safe fixes automatically.

## No comments by default
Only add a comment when the WHY is non-obvious. No multi-line comment blocks or docstrings.

## Browser support
Chrome 108+, Firefox 110+, Safari 16+ (desktop + iOS). Defined in `vite.config.ts` `build.target`.
