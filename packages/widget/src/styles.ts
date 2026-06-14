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
  --chorala-primary: ${primary};
  --chorala-bg: ${bg};
  --chorala-fg: ${fg};
  --chorala-muted: ${muted};
  --chorala-border: ${border};
  --chorala-surface: ${surface};
  all: initial;
}
*, *::before, *::after { box-sizing: border-box; }
.chorala-root {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--chorala-fg);
  font-size: 14px;
  line-height: 1.45;
}
button { font-family: inherit; cursor: pointer; }

/* Floating launcher */
.chorala-launcher {
  position: fixed; bottom: 20px; ${left ? 'left' : 'right'}: 20px;
  z-index: 2147483000;
  background: var(--chorala-primary); color: #fff; border: none;
  border-radius: 9999px; padding: 12px 18px; font-size: 14px; font-weight: 600;
  box-shadow: 0 6px 24px rgba(0,0,0,.18); display: inline-flex; gap: 8px; align-items: center;
}
.chorala-launcher:hover { filter: brightness(1.05); }

/* Panel */
.chorala-overlay {
  position: fixed; inset: 0; z-index: 2147483001;
  background: rgba(15,23,42,.35);
  display: flex; align-items: stretch; justify-content: ${left ? 'flex-start' : 'flex-end'};
}
.chorala-panel {
  background: var(--chorala-bg); width: 420px; max-width: 100vw; height: 100%;
  display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0,0,0,.25);
  animation: chorala-slide .18s ease-out;
}
.chorala-inline .chorala-panel { height: 600px; max-height: 80vh; width: 100%; border: 1px solid var(--chorala-border); border-radius: 12px; }
@keyframes chorala-slide { from { transform: translateX(${left ? '-' : ''}24px); opacity: .4 } to { transform: none; opacity: 1 } }

.chorala-header { padding: 14px 16px; border-bottom: 1px solid var(--chorala-border); display: flex; align-items: center; gap: 8px; }
.chorala-header h1 { font-size: 16px; margin: 0; font-weight: 700; flex: 1; }
.chorala-x { background: none; border: none; color: var(--chorala-muted); font-size: 20px; line-height: 1; padding: 4px; }

.chorala-tabs { display: flex; gap: 4px; padding: 8px 12px; border-bottom: 1px solid var(--chorala-border); }
.chorala-tab { background: none; border: none; padding: 6px 12px; border-radius: 8px; color: var(--chorala-muted); font-weight: 600; font-size: 13px; }
.chorala-tab.active { background: var(--chorala-surface); color: var(--chorala-fg); }

.chorala-body { flex: 1; overflow-y: auto; padding: 12px; }
.chorala-footer { padding: 8px 12px; border-top: 1px solid var(--chorala-border); display: flex; align-items: center; justify-content: space-between; }
.chorala-credit { font-size: 11px; color: var(--chorala-muted); text-decoration: none; }

/* Buttons */
.chorala-btn { background: var(--chorala-primary); color: #fff; border: none; border-radius: 8px; padding: 9px 14px; font-weight: 600; font-size: 13px; }
.chorala-btn.secondary { background: var(--chorala-surface); color: var(--chorala-fg); }
.chorala-btn:disabled { opacity: .6; cursor: default; }

/* Post list */
.chorala-post { display: flex; gap: 10px; padding: 12px; border: 1px solid var(--chorala-border); border-radius: 10px; margin-bottom: 8px; background: var(--chorala-bg); }
.chorala-post:hover { border-color: var(--chorala-primary); }
.chorala-votebtn { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 44px;
  border: 1px solid var(--chorala-border); border-radius: 8px; padding: 6px 4px; background: var(--chorala-bg); color: var(--chorala-fg); font-weight: 700; }
.chorala-votebtn.voted { background: var(--chorala-primary); color: #fff; border-color: var(--chorala-primary); }
.chorala-votebtn .arrow { font-size: 12px; }
.chorala-post-main { flex: 1; min-width: 0; text-align: left; }
.chorala-post-title { font-weight: 600; margin: 0 0 2px; }
.chorala-post-meta { font-size: 12px; color: var(--chorala-muted); }
.chorala-post-body { color: var(--chorala-muted); font-size: 13px; margin: 4px 0 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.chorala-postbtn { all: unset; cursor: pointer; flex: 1; }

/* Forms */
.chorala-field { margin-bottom: 10px; }
.chorala-field label { display: block; }
.chorala-field label > span { display: block; font-size: 12px; font-weight: 600; color: var(--chorala-muted); margin-bottom: 4px; }
.chorala-input, .chorala-textarea {
  width: 100%; padding: 9px 10px; border: 1px solid var(--chorala-border); border-radius: 8px;
  background: var(--chorala-bg); color: var(--chorala-fg); font-size: 14px; font-family: inherit;
}
.chorala-textarea { min-height: 90px; resize: vertical; }
.chorala-row { display: flex; gap: 8px; }

/* Roadmap */
.chorala-col-title { font-weight: 700; font-size: 13px; margin: 6px 2px; display: flex; align-items: center; gap: 6px; }
.chorala-dot { width: 8px; height: 8px; border-radius: 9999px; display: inline-block; }

/* Changelog */
.chorala-cl { padding: 12px 0; border-bottom: 1px solid var(--chorala-border); }
.chorala-cl h3 { margin: 0 0 4px; font-size: 15px; }
.chorala-cl .date { font-size: 12px; color: var(--chorala-muted); }
.chorala-labels { display: flex; gap: 4px; margin: 4px 0; }
.chorala-label { font-size: 11px; background: var(--chorala-surface); padding: 1px 8px; border-radius: 9999px; color: var(--chorala-muted); }

.chorala-empty { text-align: center; color: var(--chorala-muted); padding: 32px 12px; }
.chorala-error { color: #ef4444; font-size: 13px; padding: 8px 0; }
.chorala-comment { padding: 8px 0; border-top: 1px solid var(--chorala-border); font-size: 13px; }
`
}
