import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emitEngaged } from '../src/engage.ts'

// emitEngaged is the host-facing wire contract (e.g. MusicAha's reward hook). These
// tests pin the post-rename protocol: `chorala:engaged` CustomEvent + postMessage
// { source: 'chorala' } — and assert no legacy `heed` tokens are emitted.
describe('emitEngaged', () => {
  const events: { type: string; detail: unknown }[] = []
  const messages: unknown[] = []

  beforeEach(() => {
    events.length = 0
    messages.length = 0
    vi.stubGlobal(
      'CustomEvent',
      class {
        type: string
        detail: unknown
        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type
          this.detail = init?.detail
        }
      },
    )
    vi.stubGlobal('window', {
      dispatchEvent: (e: { type: string; detail: unknown }) => events.push(e),
      // a distinct parent object so the iframe postMessage branch runs
      parent: { postMessage: (m: unknown) => messages.push(m) },
    })
    // window.parent must differ from window; set window.parent !== window
    ;(globalThis as { window: { parent: unknown } }).window.parent = {
      postMessage: (m: unknown) => messages.push(m),
    }
  })

  afterEach(() => vi.unstubAllGlobals())

  it('dispatches a chorala:engaged CustomEvent carrying the type', () => {
    emitEngaged('vote')
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('chorala:engaged')
    expect(events[0]?.detail).toEqual({ type: 'vote' })
  })

  it('postMessages the parent with source "chorala"', () => {
    emitEngaged('feedback')
    expect(messages).toContainEqual({ source: 'chorala', type: 'feedback' })
  })

  it('emits no legacy "heed" tokens', () => {
    emitEngaged('comment')
    const serialized = JSON.stringify({ events, messages })
    expect(serialized.toLowerCase()).not.toContain('heed')
  })

  it('defaults the type to "engaged"', () => {
    emitEngaged()
    expect(events[0]?.detail).toEqual({ type: 'engaged' })
  })
})
