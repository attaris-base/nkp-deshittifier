import { render } from 'preact'
import { App } from './App'
import { STYLES } from './styles'

declare const __GIT_SHA__: string

const ALLOWED_HOSTS = new Set(['nastykinkpigs.com', 'localhost', '127.0.0.1'])

function boot() {
  const { hostname } = window.location

  if (!ALLOWED_HOSTS.has(hostname)) {
    showWrongDomainToast()
    return
  }

  // Replace entire page content
  document.documentElement.innerHTML =
    '<head><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"></head><body></body>'

  // Inject styles
  const styleEl = document.createElement('style')
  styleEl.id = 'nkp-styles'
  styleEl.textContent = STYLES
  document.head.appendChild(styleEl)

  // Mount root
  const root = document.createElement('div')
  root.id = 'nkp-root'
  document.body.appendChild(root)

  console.info(`[NKP Deshittifier] booting — build ${typeof __GIT_SHA__ !== 'undefined' ? __GIT_SHA__ : 'dev'}`)
  render(<App />, root)
}

function showWrongDomainToast() {
  const s = [
    'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
    'background:#16161f', 'color:#f0f0f0', 'border:1px solid #1e1e2e',
    'padding:12px 20px', 'border-radius:8px', 'font-family:system-ui,sans-serif',
    'font-size:14px', 'z-index:2147483647', 'box-shadow:0 4px 20px rgba(0,0,0,.6)',
    'white-space:nowrap', 'pointer-events:none',
  ].join(';')
  const toast = document.createElement('div')
  toast.style.cssText = s
  toast.textContent = '⚠️  NKP Deshittifier only works on nastykinkpigs.com'
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

boot()
