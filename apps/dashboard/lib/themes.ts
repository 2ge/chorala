export type Theme = { id: string; name: string; paper: string; accent: string; ink: string }

export const THEMES: Theme[] = [
  { id: 'paper', name: 'Paper', paper: '#f7f3ec', accent: '#d9512a', ink: '#1c1815' },
  { id: 'midnight', name: 'Midnight', paper: '#14120d', accent: '#f0a63a', ink: '#f4ede0' },
  { id: 'forest', name: 'Forest', paper: '#eef2e9', accent: '#2f7d4f', ink: '#1b241b' },
  { id: 'cobalt', name: 'Cobalt', paper: '#eef1f7', accent: '#2f5fe0', ink: '#141a2b' },
  { id: 'mono', name: 'Mono', paper: '#f3f3f1', accent: '#111110', ink: '#0a0a0a' },
]

export const THEME_IDS = THEMES.map((t) => t.id)
export const DEFAULT_THEME = THEMES[0] as Theme
