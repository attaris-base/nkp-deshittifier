/** All SPA styles as an injected string — avoids Vite CSS extraction in lib/IIFE mode */
export const STYLES = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

#nkp-root{
  --bg:#09090f;--bg-2:#0d0d1a;--bg-3:#111118;--bg-card:#16161f;
  --border:#1e1e2e;--accent:#e040fb;--accent-2:#7c4dff;
  --text:#f0f0f0;--text-muted:#888;--text-dim:#555;
  --radius:8px;--radius-sm:6px;--tab-h:56px;
  position:fixed;inset:0;z-index:2147483646;
  background:var(--bg);color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  font-size:14px;line-height:1.5;
  -webkit-font-smoothing:antialiased;
}

/* Layout */
#nkp-app{display:flex;flex-direction:column;height:100%}
#nkp-content{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:var(--tab-h)}
#nkp-root ::-webkit-scrollbar{width:4px}
#nkp-root ::-webkit-scrollbar-track{background:transparent}
#nkp-root ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}

/* TabBar */
.nkp-tabbar{
  position:fixed;bottom:0;left:0;right:0;height:var(--tab-h);
  display:flex;background:var(--bg-2);border-top:1px solid var(--border);z-index:10;
}
.nkp-tab{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  border:none;background:transparent;cursor:pointer;padding:0;
  border-top:2px solid transparent;transition:color .15s,border-color .15s;
  color:var(--text-dim);font-family:inherit;position:relative;
}
.nkp-tab.active{color:var(--accent);border-top-color:var(--accent)}
.nkp-tab-icon{font-size:18px;line-height:1}
.nkp-tab-label{font-size:9px;font-weight:600;letter-spacing:.8px;text-transform:uppercase}
.nkp-tab-badge{
  position:absolute;top:6px;right:calc(50% - 18px);
  background:var(--accent);color:#fff;font-size:9px;font-weight:700;
  min-width:16px;height:16px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;padding:0 4px;
}

/* Header */
.nkp-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 16px;background:var(--bg-2);border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:5;
}
.nkp-header-title{font-size:15px;font-weight:700;color:var(--text)}
.nkp-header-back{
  background:transparent;border:none;color:var(--accent);
  font-size:22px;cursor:pointer;padding:0 8px 0 0;line-height:1;
}
.nkp-header-action{
  background:transparent;border:none;color:var(--accent);
  font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;padding:4px 0;
}

/* Avatar */
.nkp-avatar{
  width:40px;height:40px;border-radius:50%;
  background:var(--bg-3);flex-shrink:0;overflow:hidden;
  border:2px solid transparent;position:relative;
}
.nkp-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.nkp-avatar.lg{width:80px;height:80px;border-width:3px}
.nkp-avatar-placeholder{
  width:100%;height:100%;display:flex;align-items:center;justify-content:center;
  font-size:16px;color:var(--text-dim)
}
.nkp-avatar .nkp-badge{
  position:absolute;top:-2px;right:-2px;min-width:14px;height:14px;
  border-radius:7px;font-size:8px;padding:0 3px;
}

/* Badge */
.nkp-badge{
  background:var(--accent);color:#fff;font-size:10px;font-weight:700;
  min-width:18px;height:18px;border-radius:9px;
  display:inline-flex;align-items:center;justify-content:center;padding:0 5px;flex-shrink:0;
}

/* Doppler badge */
.nkp-doppler{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:500}
.nkp-doppler-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}

/* Spinner / Loading */
.nkp-spinner{
  width:24px;height:24px;border:2px solid var(--border);
  border-top-color:var(--accent);border-radius:50%;
  animation:nkp-spin .7s linear infinite;margin:0 auto;
}
@keyframes nkp-spin{to{transform:rotate(360deg)}}
.nkp-loading{
  display:flex;align-items:center;justify-content:center;
  padding:48px 16px;gap:12px;color:var(--text-muted);font-size:13px;
}

/* Error banner */
.nkp-error{
  margin:12px 16px;padding:12px 14px;
  background:rgba(224,64,251,.08);border:1px solid rgba(224,64,251,.2);
  border-radius:var(--radius-sm);display:flex;align-items:center;gap:10px;
  font-size:13px;color:var(--text-muted);
}
.nkp-error-text{flex:1}
.nkp-retry-btn{
  background:transparent;border:1px solid var(--accent);color:var(--accent);
  font-size:11px;font-weight:600;padding:4px 10px;border-radius:var(--radius-sm);
  cursor:pointer;font-family:inherit;white-space:nowrap;
}

/* Empty state */
.nkp-empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:64px 24px;text-align:center;gap:8px;color:var(--text-dim);
}
.nkp-empty-icon{font-size:32px;margin-bottom:8px}
.nkp-empty-title{font-size:15px;font-weight:600;color:var(--text-muted)}
.nkp-empty-sub{font-size:13px}

/* Buttons */
.nkp-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  padding:10px 18px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;
  font-family:inherit;cursor:pointer;border:none;transition:opacity .15s;
}
.nkp-btn:active{opacity:.8}
.nkp-btn-primary{background:var(--accent);color:#fff}
.nkp-btn-outline{background:transparent;border:1px solid var(--border);color:var(--text-muted)}
.nkp-btn-full{width:100%}
.nkp-btn-reset{background:none;border:none;padding:0;cursor:pointer;color:inherit;font:inherit}

/* Inbox list item */
.nkp-thread-row{
  display:flex;align-items:center;gap:12px;
  padding:12px 16px;border-bottom:1px solid var(--border);
}
.nkp-avatar-btn{background:none;border:none;padding:0;cursor:pointer;flex-shrink:0;line-height:0}
.nkp-thread-content{
  flex:1;min-width:0;display:flex;align-items:center;gap:12px;
  background:none;border:none;cursor:pointer;text-align:left;color:inherit;
  font:inherit;padding:0;
}
.nkp-thread-content:active,.nkp-avatar-btn:active{opacity:.7}
.nkp-thread-row.unread .nkp-thread-sender{font-weight:700;color:var(--text)}
.nkp-thread-body{flex:1;min-width:0}
.nkp-thread-sender{font-size:14px;font-weight:500;color:var(--text)}
.nkp-thread-preview{
  font-size:12px;color:var(--text-dim);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;
}
.nkp-thread-meta{
  display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;
}
.nkp-thread-time{font-size:10px;color:var(--text-dim)}

/* Thread bubble view */
.nkp-thread-scroll{padding:12px 16px;display:flex;flex-direction:column;gap:8px}
.nkp-bubble-row{display:flex;gap:8px;align-items:flex-end}
.nkp-bubble-row.me{flex-direction:row-reverse}
.nkp-bubble{
  max-width:72%;padding:9px 13px;border-radius:16px;
  font-size:14px;line-height:1.45;word-break:break-word;
}
.nkp-bubble-row.them .nkp-bubble{
  background:var(--bg-card);color:var(--text);border-bottom-left-radius:4px;
}
.nkp-bubble-row.me .nkp-bubble{
  background:var(--accent);color:#fff;border-bottom-right-radius:4px;
}
.nkp-bubble-time{font-size:10px;color:var(--text-dim);margin-bottom:2px;flex-shrink:0}

/* Compose bar */
.nkp-compose{
  display:flex;gap:8px;padding:10px 12px;
  background:var(--bg-2);border-top:1px solid var(--border);
  position:sticky;bottom:var(--tab-h);
}
.nkp-compose-input{
  flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;
  padding:8px 14px;color:var(--text);font-size:14px;font-family:inherit;
  outline:none;resize:none;min-height:38px;max-height:100px;overflow-y:auto;
}
.nkp-compose-input::placeholder{color:var(--text-dim)}
.nkp-compose-input:focus{border-color:var(--accent)}
.nkp-compose-send{
  width:38px;height:38px;border-radius:50%;background:var(--accent);border:none;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  font-size:16px;flex-shrink:0;align-self:flex-end;
}
.nkp-compose-send:disabled{opacity:.4;cursor:not-allowed}

/* Nearby filter bar */
.nkp-filters{
  display:flex;gap:8px;padding:10px 14px;
  background:var(--bg-2);border-bottom:1px solid var(--border);
  overflow-x:auto;-webkit-overflow-scrolling:touch;
}
.nkp-filters::-webkit-scrollbar{display:none}
.nkp-filter-select{
  background:var(--bg-card);border:1px solid var(--border);color:var(--text);
  font-size:12px;font-family:inherit;padding:5px 10px;border-radius:20px;
  outline:none;cursor:pointer;white-space:nowrap;flex-shrink:0;
}
.nkp-filter-select:focus{border-color:var(--accent)}

/* User card (Nearby) */
.nkp-user-card{
  display:flex;align-items:center;gap:12px;
  padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;
  background-color: var(--bg-card);
  width: 100%;
}
.nkp-user-card:active{background:var(--bg-3)}
.nkp-user-info{flex:1;min-width:0}
.nkp-user-name{font-size:14px;font-weight:600;color:var(--text)}
.nkp-user-meta{display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap}
.nkp-user-detail{font-size:11px;color:var(--text-dim)}
.nkp-heat-live{color:#4caf50;font-size:10px;font-weight:600;animation:nkp-pulse 1.5s infinite}
.nkp-heat-warm{color:#ff9800;font-size:10px;font-weight:600}
.nkp-heat-stale{color:var(--text-dim);font-size:10px}
.nkp-load-more{
  width:100%;padding:14px;background:transparent;border:none;border-top:1px solid var(--border);
  color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;
}
@keyframes nkp-pulse{0%,100%{opacity:1}50%{opacity:.5}}

/* Profile */
.nkp-profile-hero{
  display:flex;align-items:center;gap:16px;
  padding:20px 16px 16px;background:var(--bg-2);border-bottom:1px solid var(--border);
}
.nkp-profile-details{flex:1;min-width:0}
.nkp-profile-nick{font-size:18px;font-weight:700;color:var(--text)}
.nkp-profile-sub{font-size:12px;color:var(--text-muted);margin-top:3px}
.nkp-online-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#4caf50;margin-right:4px;vertical-align:middle}
.nkp-profile-section{padding:14px 16px;border-bottom:1px solid var(--border)}
.nkp-profile-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text-dim);margin-bottom:6px}
.nkp-profile-value{font-size:14px;color:var(--text);line-height:1.5}
.nkp-photo-gallery{display:flex;gap:6px;overflow-x:auto;padding:14px 16px;-webkit-overflow-scrolling:touch}
.nkp-photo-gallery::-webkit-scrollbar{display:none}
.nkp-photo-thumb{width:100px;height:100px;border-radius:var(--radius-sm);object-fit:cover;flex-shrink:0;background:var(--bg-card)}
.nkp-msg-btn-wrap{
  padding:16px;position:sticky;bottom:var(--tab-h);
  background:var(--bg);border-top:1px solid var(--border);
}

/* Not-logged-in overlay */
.nkp-overlay{
  position:fixed;inset:0;background:var(--bg);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:16px;z-index:100;padding:32px;text-align:center;
}
.nkp-overlay-icon{font-size:40px}
.nkp-overlay-title{font-size:18px;font-weight:700;color:var(--text)}
.nkp-overlay-sub{font-size:14px;color:var(--text-muted)}
.nkp-overlay a{color:var(--accent);text-decoration:none}

/* ── Map Tab (remove this section to disable map feature) ──────────────────── */
.nkp-map-tab{display:flex;flex-direction:column;height:100%;overflow:hidden}
.nkp-map-container{flex:1;min-height:0}

.nkp-map-pin{
  width:40px;height:40px;border-radius:50%;
  border:2.5px solid var(--accent);overflow:hidden;
  background:var(--bg-card);box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:pointer;
}
.nkp-map-pin-img{width:100%;height:100%;object-fit:cover;display:block}
.nkp-map-pin--discover{
  width:24px;height:24px;border-radius:50%;
  background:var(--accent-2);border:3px solid var(--accent);
  box-shadow:0 0 10px var(--accent);cursor:pointer;
}
.nkp-map-pin--init{
  display:flex;align-items:center;justify-content:center;
  font-size:16px;font-weight:700;color:var(--accent);
}

.nkp-map-avatar{display:block;border-radius:50%;object-fit:cover;border:2px solid var(--accent)}
.nkp-map-avatar--lg{width:60px;height:60px;margin:0 auto 8px}
.nkp-map-avatar--init{
  display:flex;align-items:center;justify-content:center;
  background:var(--bg-card);color:var(--accent);font-weight:700;
}
.nkp-map-avatar--lg.nkp-map-avatar--init{font-size:20px}

.nkp-map-popup{position:relative;text-align:center;min-width:160px;padding:8px 4px;transition:padding-bottom .25s ease}
.nkp-map-popup-name{font-weight:700;color:var(--text);font-size:15px;margin-bottom:4px}
.nkp-map-popup-meta{color:var(--text-muted);font-size:11px;margin-bottom:8px}
.nkp-map-popup-btn{padding:8px 14px;font-size:12px;transition:padding-top .25s ease,padding-bottom .25s ease}
.nkp-map-corner-tl,.nkp-map-corner-br{position:absolute;width:44px;height:44px;z-index:10}
.nkp-map-corner-tl{top:0;left:0}
.nkp-map-corner-br{bottom:0;right:0}
.nkp-map-discover-menu{position:absolute;inset:0;z-index:20;background:var(--bg-card);display:flex;flex-direction:column;gap:8px;padding:10px 8px;border-radius:4px;justify-content:center}
.nkp-map-discover-label{font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
.nkp-map-discover-note{border-top:1px solid var(--border);margin-top:6px;padding-top:6px;text-align:center;word-break:break-word}
.nkp-map-discover-place{font-size:10px;color:var(--text-muted);line-height:1.3;margin-bottom:4px}
.nkp-map-discover-dist{font-size:11px;color:var(--text);margin-bottom:6px}
.nkp-map-discover-gmaps{display:inline-block;font-size:10px;color:var(--accent);text-decoration:none}
.nkp-map-discover-gmaps:hover{text-decoration:underline}

.nkp-map-leaflet-popup .leaflet-popup-content-wrapper{
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:var(--radius);color:var(--text);
  box-shadow:0 4px 20px rgba(0,0,0,.6);padding:12px 14px;
}
.leaflet-popup-content-wrapper.nkp-popup-armed{border-color:hsl(0,100%,65%);animation:nkp-hue-cycle 1.5s linear infinite}
@keyframes nkp-hue-cycle{0%{border-color:hsl(0,100%,65%)}16%{border-color:hsl(60,100%,65%)}33%{border-color:hsl(120,100%,65%)}50%{border-color:hsl(180,100%,65%)}66%{border-color:hsl(240,100%,65%)}83%{border-color:hsl(300,100%,65%)}100%{border-color:hsl(360,100%,65%)}}
.nkp-map-leaflet-popup .leaflet-popup-content{margin:0}
.nkp-map-leaflet-popup .leaflet-popup-tip{background:var(--bg-card)}
.nkp-map-leaflet-popup .leaflet-popup-close-button{color:var(--text-muted)!important;right:8px!important;top:8px!important}
.nkp-map-leaflet-popup .leaflet-popup-close-button:hover{color:var(--text)!important}

/* Fade basemap tiles so user pins pop against the dark background */
.nkp-map-tiles{filter:brightness(0.45) saturate(0.25) hue-rotate(220deg)}

/* "Search here" floating button — shown when user pans the map */
.nkp-map-search-here{
  position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:1000;
  background:var(--accent);color:#fff;border:none;border-radius:20px;
  padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;
  box-shadow:0 2px 10px rgba(0,0,0,.5);white-space:nowrap;
}
.nkp-map-search-here:active{opacity:.85}
/* ─────────────────────────────────────────────────────────────────────────── */

/* Load older messages button — sits at the top of the inbox thread list */
.nkp-inbox-load-more{
  width:100%;padding:12px;
  background:transparent;border:none;border-bottom:1px solid var(--border);
  color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;
}
.nkp-inbox-load-more:disabled{opacity:.5;cursor:default}

/* Inline search input shown in the Messages header when search mode is active */
.nkp-search-input{
  flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;
  padding:6px 14px;color:var(--text);font-size:13px;font-family:inherit;
  outline:none;min-width:0;
}
.nkp-search-input:focus{border-color:var(--accent)}
.nkp-search-input::placeholder{color:var(--text-dim)}
`
