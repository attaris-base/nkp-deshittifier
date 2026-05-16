/**
 * Generates a bookmarklet URL pointing to the given bundle.
 * Usage:
 *   node scripts/gen-bookmarklet.mjs                   # production (GitHub Pages)
 *   node scripts/gen-bookmarklet.mjs --dev             # localhost:5173 (vite preview)
 */
import { execSync } from 'node:child_process'

const isDev = process.argv.includes('--dev')

const PROD_URL = 'https://attaris-base.github.io/nkp-deshittifier/bundle.js'
const DEV_URL = 'http://localhost:5173/bundle.js'
const url = isDev ? DEV_URL : PROD_URL

const bookmarklet =
  `javascript:(function(){` +
  `var s=document.createElement('script');` +
  `s.src='${url}?t='+Date.now();` +
  `s.onerror=function(){alert('NKP Deshittifier failed to load — check your connection')};` +
  `document.head.appendChild(s)` +
  `})();`

let sha = 'dev'
try {
  sha = execSync('git rev-parse --short HEAD').toString().trim()
} catch {}

console.log()
console.log(`NKP Deshittifier bookmarklet (${isDev ? 'DEV' : 'PROD'}, build: ${sha})`)
console.log('─'.repeat(60))
console.log()
console.log('Paste as a bookmark URL:')
console.log()
console.log(bookmarklet)
console.log()
console.log('─'.repeat(60))
console.log('Install page: https://attaris-base.github.io/nkp-deshittifier/')
console.log()
