export type EngageType = 'engaged' | 'feedback' | 'vote' | 'comment' | 'submit'

/**
 * Notify the host page that the user engaged with feedback. Powers host-side reward
 * hooks (e.g. MusicAha grants +3 once/24h on engagement).
 *
 * - Inline embed (our default, Shadow DOM): dispatches a `chorala:engaged` CustomEvent.
 * - Iframe embed: also postMessage's the parent ({ source: 'chorala', type }).
 *
 * Back-compat: also emits the legacy `heed:engaged` event + `source: 'heed'` postMessage
 * so existing host listeners (e.g. MusicAha's deployed page) keep granting rewards.
 */
export function emitEngaged(type: EngageType = 'engaged'): void {
  if (typeof window === 'undefined') return
  for (const name of ['chorala:engaged', 'heed:engaged']) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: { type } }))
    } catch {
      /* ignore */
    }
  }
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'chorala', type }, '*')
      window.parent.postMessage({ source: 'heed', type }, '*') // legacy alias
    }
  } catch {
    /* ignore */
  }
}
