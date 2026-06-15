import { describe, expect, test } from 'vitest'
import { scoreFields, segments } from '../src/index.ts'

const { computeScore } = scoreFields
const { renderVars } = segments

const recip = (over: Partial<Parameters<typeof renderVars>[1]> = {}) => ({
  id: 'eu_1',
  email: 'sam@acme.com',
  name: 'Sam Carter',
  locale: 'en',
  companyName: 'Acme',
  plan: 'pro',
  ...over,
})

describe('computeScore (weighted prioritization)', () => {
  const W = [
    { key: 'reach', weight: 1 },
    { key: 'effort', weight: -1 },
  ]

  test('no fields / no weights → 0', () => {
    expect(computeScore({}, [])).toBe(0)
    expect(computeScore({ reach: 9 }, [])).toBe(0)
    expect(computeScore({}, W)).toBe(0)
  })

  test('additive weighting with a negative (cost) weight', () => {
    expect(computeScore({ reach: 10, effort: 3 }, W)).toBe(7)
    expect(computeScore({ reach: 2, effort: 5 }, W)).toBe(-3)
  })

  test('missing and non-finite values are ignored', () => {
    expect(computeScore({ reach: 4 }, W)).toBe(4) // effort absent
    expect(computeScore({ reach: Number.NaN, effort: 2 }, W)).toBe(-2)
    expect(computeScore({ reach: Number.POSITIVE_INFINITY }, W)).toBe(0)
  })

  test('fractional weights round to two decimals', () => {
    expect(computeScore({ x: 1 }, [{ key: 'x', weight: 0.3333 }])).toBe(0.33)
    expect(computeScore({ x: 3 }, [{ key: 'x', weight: 2.5 }])).toBe(7.5)
  })

  test('extra fields with no matching weight do not count', () => {
    expect(computeScore({ reach: 1, ghost: 999 }, W)).toBe(1)
  })
})

describe('renderVars (changelog personalization)', () => {
  test('substitutes every supported variable', () => {
    const out = renderVars('{{first_name}} {{name}} {{email}} {{company}} {{plan}}', recip())
    expect(out).toBe('Sam Sam Carter sam@acme.com Acme pro')
  })

  test('first_name is the first token of the name', () => {
    expect(renderVars('Hi {{first_name}}', recip({ name: 'María García' }))).toBe('Hi María')
  })

  test('missing attributes render as empty, not the literal', () => {
    const out = renderVars(
      '[{{first_name}}|{{company}}|{{plan}}]',
      recip({ name: null, companyName: null, plan: null }),
    )
    expect(out).toBe('[||]')
  })

  test('unknown variables are left untouched', () => {
    expect(renderVars('Hello {{nope}}', recip())).toBe('Hello {{nope}}')
  })

  test('whitespace inside the braces is tolerated', () => {
    expect(renderVars('{{  plan  }}', recip())).toBe('pro')
  })

  test('text with no variables is returned unchanged', () => {
    expect(renderVars('Just shipped a thing!', recip())).toBe('Just shipped a thing!')
  })
})
