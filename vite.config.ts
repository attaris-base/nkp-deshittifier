import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { execSync } from 'child_process'

const gitSha = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() }
  catch { return 'dev' }
})()

const GITHUB_USER = 'attaris-base'
const REPO_NAME = 'nkp-deshittifier'
const BUNDLE_URL = `https://${GITHUB_USER}.github.io/${REPO_NAME}/bundle.js`

export default defineConfig({
  plugins: [preact()],

  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
    __BUNDLE_URL__: JSON.stringify(BUNDLE_URL),
  },

  // Dev server for local harness page
  server: {
    port: 5173,
  },

  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'NKPDeshittifier',
      fileName: () => 'bundle.js',
      formats: ['iife'],
    },
    // Do not split CSS — we inject styles manually as a string
    cssCodeSplit: false,
    // Emit a single JS file; CSS gets extracted to bundle.css by Vite
    // but we're using JS-string styles to avoid this entirely
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    // Target modern browsers (Chrome/FF/Safari last 2 years)
    target: ['chrome108', 'firefox110', 'safari16'],
  },
})
