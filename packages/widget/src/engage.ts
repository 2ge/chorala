export type EngageType = 'engaged' | 'feedback' | 'vote' | 'comment' | 'submit'

/**
 * Notify the host page that the user engaged with feedback. Powers host-side reward
 * hooks (e.g. MusicAha grants +3 once/24h on engagement).
 *
 * - Inline embed (our default, Shadow DOM): dispatches a `chorala:engaged` CustomEvent.
 * - Iframe embed: also postMessage's the parent ({ source: 'chorala', type }).
 */
export function emitEngaged(type: EngageType = 'engaged'): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('chorala:engaged', { detail: { type } }))
  } catch {
    /* ignore */
  }
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'chorala', type }, '*')
    }
  } catch {
    /* ignore */
  }
}
