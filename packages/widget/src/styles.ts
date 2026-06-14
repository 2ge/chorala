import type { WidgetSettings } from './types.ts'

/**
 * All widget CSS, scoped inside the Shadow DOM root. Because it lives in a shadow tree,
 * nothing here leaks to the host page and host styles cannot leak in. Everything is
 * driven by CSS custom properties so themes/primary color are a variable swap.
 */
export function buildStyles(settings: WidgetSettings): string {
  const primary = settings.primaryColor || '#6366f1'
  const dark = settings.theme === 'dark'
  const bg = dark ? '#0f172a' : '#ffffff'
  const fg = dark ? '#e2e8f0' : '#0f172a'
  const muted = dark ? '#94a3b8' : '#64748b'
  const border = dark ? '#1e293b' : '#e2e8f0'
  const surface = dark ? '#1e293b' : '#f8fafc'
  const left = settings.position === 'bottom-left'

  return `
:host {
  --heed-primary: ${primary};
  --heed-bg: ${bg};
  --heed-fg: ${fg};
  --heed-muted: ${muted};
  --heed-border: ${border};
  --heed-surface: ${surface};
  all: initial;
}
*, *::before, *::after { box-sizing: border-box; }
.heed-root {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--heed-fg);
  font-size: 14px;
  line-height: 1.45;
}
button { font-family: inherit; cursor: pointer; }

/* Floating launcher */
.heed-launcher {
  position: fixed; bottom: 20px; ${left ? 'left' : 'right'}: 20px;
  z-index: 2147483000;
  background: var(--heed-primary); color: #fff; border: none;
  border-radius: 9999px; padding: 12px 18px; font-size: 14px; font-weight: 600;
  box-shadow: 0 6px 24px rgba(0,0,0,.18); display: inline-flex; gap: 8px; align-items: center;
}
.heed-launcher:hover { filter: brightness(1.05); }

/* Panel */
.heed-overlay {
  position: fixed; inset: 0; z-index: 2147483001;
  background: rgba(15,23,42,.35);
  display: flex; align-items: stretch; justify-content: ${left ? 'flex-start' : 'flex-end'};
}
.heed-panel {
  background: var(--heed-bg); width: 420px; max-width: 100vw; height: 100%;
  display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0,0,0,.25);
  animation: heed-slide .18s ease-out;
}
.heed-inline .heed-panel { height: 600px; max-height: 80vh; width: 100%; border: 1px solid var(--heed-border); border-radius: 12px; }
@keyframes heed-slide { from { transform: translateX(${left ? '-' : ''}24px); opacity: .4 } to { transform: none; opacity: 1 } }

.heed-header { padding: 14px 16px; border-bottom: 1px solid var(--heed-border); display: flex; align-items: center; gap: 8px; }
.heed-header h1 { font-size: 16px; margin: 0; font-weight: 700; flex: 1; }
.heed-x { background: none; border: none; color: var(--heed-muted); font-size: 20px; line-height: 1; padding: 4px; }

.heed-tabs { display: flex; gap: 4px; padding: 8px 12px; border-bottom: 1px solid var(--heed-border); }
.heed-tab { background: none; border: none; padding: 6px 12px; border-radius: 8px; color: var(--heed-muted); font-weight: 600; font-size: 13px; }
.heed-tab.active { background: var(--heed-surface); color: var(--heed-fg); }

.heed-body { flex: 1; overflow-y: auto; padding: 12px; }
.heed-footer { padding: 8px 12px; border-top: 1px solid var(--heed-border); display: flex; align-items: center; justify-content: space-between; }
.heed-credit { font-size: 11px; color: var(--heed-muted); text-decoration: none; }

/* Buttons */
.heed-btn { background: var(--heed-primary); color: #fff; border: none; border-radius: 8px; padding: 9px 14px; font-weight: 600; font-size: 13px; }
.heed-btn.secondary { background: var(--heed-surface); color: var(--heed-fg); }
.heed-btn:disabled { opacity: .6; cursor: default; }

/* Post list */
.heed-post { display: flex; gap: 10px; padding: 12px; border: 1px solid var(--heed-border); border-radius: 10px; margin-bottom: 8px; background: var(--heed-bg); }
.heed-post:hover { border-color: var(--heed-primary); }
.heed-votebtn { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 44px;
  border: 1px solid var(--heed-border); border-radius: 8px; padding: 6px 4px; background: var(--heed-bg); color: var(--heed-fg); font-weight: 700; }
.heed-votebtn.voted { background: var(--heed-primary); color: #fff; border-color: var(--heed-primary); }
.heed-votebtn .arrow { font-size: 12px; }
.heed-post-main { flex: 1; min-width: 0; text-align: left; }
.heed-post-title { font-weight: 600; margin: 0 0 2px; }
.heed-post-meta { font-size: 12px; color: var(--heed-muted); }
.heed-post-body { color: var(--heed-muted); font-size: 13px; margin: 4px 0 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.heed-postbtn { all: unset; cursor: pointer; flex: 1; }

/* Forms */
.heed-field { margin-bottom: 10px; }
.heed-field label { display: block; }
.heed-field label > span { display: block; font-size: 12px; font-weight: 600; color: var(--heed-muted); margin-bottom: 4px; }
.heed-input, .heed-textarea {
  width: 100%; padding: 9px 10px; border: 1px solid var(--heed-border); border-radius: 8px;
  background: var(--heed-bg); color: var(--heed-fg); font-size: 14px; font-family: inherit;
}
.heed-textarea { min-height: 90px; resize: vertical; }
.heed-row { display: flex; gap: 8px; }

/* Roadmap */
.heed-col-title { font-weight: 700; font-size: 13px; margin: 6px 2px; display: flex; align-items: center; gap: 6px; }
.heed-dot { width: 8px; height: 8px; border-radius: 9999px; display: inline-block; }

/* Changelog */
.heed-cl { padding: 12px 0; border-bottom: 1px solid var(--heed-border); }
.heed-cl h3 { margin: 0 0 4px; font-size: 15px; }
.heed-cl .date { font-size: 12px; color: var(--heed-muted); }
.heed-labels { display: flex; gap: 4px; margin: 4px 0; }
.heed-label { font-size: 11px; background: var(--heed-surface); padding: 1px 8px; border-radius: 9999px; color: var(--heed-muted); }

.heed-empty { text-align: center; color: var(--heed-muted); padding: 32px 12px; }
.heed-error { color: #ef4444; font-size: 13px; padding: 8px 0; }
.heed-comment { padding: 8px 0; border-top: 1px solid var(--heed-border); font-size: 13px; }
`
}
