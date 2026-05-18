# Testing Patterns

**Analysis Date:** 2026-05-18

## Test Framework

**Runner:** None installed.

No test runner, assertion library, or test configuration file is present in this project. There are no `jest.config.*`, `vitest.config.*`, or equivalent files. No `*.test.*` or `*.spec.*` files exist anywhere in the repository. The `package.json` `scripts` block has no `test` entry.

**Dependencies:** No `vitest`, `jest`, `@testing-library/*`, or similar packages in `devDependencies`.

## Test File Organization

**Location:** Not applicable — no tests exist.

**Naming:** Not applicable.

## Test Structure

No test patterns exist to document.

## Mocking

No mocking framework or patterns exist.

## Fixtures and Factories

No test fixtures or factories exist.

## Coverage

**Requirements:** None enforced.

**Coverage tooling:** Not configured.

## Test Types

**Unit Tests:** Not present.

**Integration Tests:** Not present.

**E2E Tests:** Not present.

## What Would Need to be Tested (If Tests Were Added)

If a test suite were introduced, the highest-value targets would be:

**Hook logic (`src/hooks/`):**
- `useThread.ts` — CSRF retry path (`result.error.includes('csrf')` branch in `send()`), send success/failure returns
- `useInbox.ts` — logged-out detection (shape validation on API response), `visibilitychange` re-fetch
- `useGrid.ts` — pagination (`loadMore`), `applyFilters` resetting pages to `[]`
- `useProfile.ts` — `json?.ok === false` guard path
- `useGeo.ts` — module-scope `cached` variable persistence, permission denied branch

**Pure utility functions (`src/tabs/MessagesTab.tsx`):**
- `fmtDate` — same-day, within-7-days, and older-than-7-days branches

**API module (`src/api.ts`):**
- `fetchOinkGrid` — `response.ok` error throw path
- `fetchProfileData` — `response.ok` error throw path

**Framework Recommendation:**
Vitest is the natural fit given the Vite build setup. Add with:
```bash
npm install -D vitest @testing-library/preact jsdom
```

Vitest config would co-locate with `vite.config.ts` or use a separate `vitest.config.ts`. Hook tests need a DOM environment (`jsdom`) and `@testing-library/preact` for rendering.

**Suggested test file locations:**
- Hook tests: `src/hooks/__tests__/useInbox.test.ts`
- Utility tests: `src/tabs/__tests__/fmtDate.test.ts` (extract `fmtDate` to a shared util first)
- API tests: `src/api.test.ts` (mock `fetch` via `vi.stubGlobal`)

---

*Testing analysis: 2026-05-18*
