export type EngageType = 'engaged' | 'feedback' | 'vote' | 'comment' | 'submit'

/**
 * Notify the host page that the user engaged with feedback. Powers host-side reward
 * hooks (e.g. MusicAha grants +3 once/24h on `heed:engaged`).
 *
 * - Inline embed (our default, Shadow DOM): dispatches a `heed:engaged` CustomEvent.
 * - Iframe embed: also postMessage's the parent ({ source: 'heed', type }).
 */
export function emitEngaged(type: EngageType = 'engaged'): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('heed:engaged', { detail: { type } }))
  } catch {
    /* ignore */
  }
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'heed', type }, '*')
    }
  } catch {
    /* ignore */
  }
}
