# Suggested Commands

## Development
```powershell
npm install                              # first-time setup
npm run dev                              # build in watch mode (rebuilds on save)
npm run preview                          # serve dist/ at http://localhost:5173
npm run build                            # production build → dist/bundle.js
node scripts/gen-bookmarklet.mjs         # print production bookmarklet URL
node scripts/gen-bookmarklet.mjs --dev   # print localhost:5173 bookmarklet URL
```

## Typical Dev Workflow
1. `npm run dev` in one terminal
2. `npm run preview` in another
3. Grab the dev bookmarklet URL and install as a browser bookmark
4. Fire it on nastykinkpigs.com to test

## Linting & formatting (Biome)
```powershell
npm run check    # lint + format in one pass — writes all safe fixes (run before committing)
npm run lint     # lint only (no writes)
npm run format   # format only (writes)
```
Config: `biome.json` at repo root. No test suite configured.

## System (Windows/PowerShell)
- File listing: `Get-ChildItem` or `ls`
- File content: `Get-Content` or `cat`
- Find files: `Get-ChildItem -Recurse -Filter *.ts`
- Search content: use Grep tool or `Select-String`
- Git: standard `git` commands work in PowerShell
