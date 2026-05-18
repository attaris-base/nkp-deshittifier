# Task Completion Checklist

When a coding task is complete, do the following:

1. **Build check**: Run `npm run build` to ensure the production build succeeds with no TypeScript errors.
   - TypeScript errors will cause the build to fail (strict mode enabled)
   - Watch for unused locals/parameters (`noUnusedLocals`, `noUnusedParameters`)

2. **CSS check**: Confirm no new `.css` files were added to `src/` — all styles must be string literals in `src/styles/index.ts`.

3. **API check**: Confirm no API functions were duplicated — all calls go through `src/api.ts`.

4. **Bundle size**: Keep bundle under 50 KB gzipped. Check with `npm run build` output.

5. **No tests or linting** to run — the project has no test suite or linter configured.

6. **Dev preview** (for UI changes): Run `npm run dev` + `npm run preview` and test via bookmarklet on the actual site.

## No automatic deploy needed
Deploying is done by pushing to `main` — GitHub Actions handles the rest. Don't push unless the user asks.
