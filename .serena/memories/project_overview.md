# NKP Deshittifier — Project Overview

## Purpose
A bookmarklet that replaces nastykinkpigs.com's broken UI with a clean, self-contained tabbed SPA.
The user fires it on any NKP page while logged in. It wipes the page and mounts a Preact app that
talks directly to the site's JSON API using the browser's existing session cookies.

Hosted on GitHub Pages. Bundle is a single IIFE JS file loaded by the bookmarklet.

## Tech Stack
- **Preact 10.x** — lightweight React-compatible UI library
- **Vite 6.x** with `@preact/preset-vite` — build tooling, IIFE lib mode
- **TypeScript 5.8** — strict mode, ES2020 target, ESNext modules
- No testing framework, no linting/formatting config

## Path Aliases (tsconfig.json)
- `@api` → `./src/api.ts`
- `@types/*` → `./src/types/*`

## Deployment
Push to `main` → GitHub Actions builds and deploys `dist/` to `gh-pages` branch automatically.
Bundle size target: < 50 KB gzipped.
