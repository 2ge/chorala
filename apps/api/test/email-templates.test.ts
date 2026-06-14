import { magicLinkEmail, notificationEmail, resetPasswordEmail, verifyEmail } from '@chorala/email'
import { describe, expect, it } from 'vitest'

// The transactional emails powering registration + password reset (via Resend).
describe('email templates', () => {
  const url = 'https://chorala.com/reset?token=abc123'

  it('resetPasswordEmail embeds the link and is Chorala-branded', () => {
    const e = resetPasswordEmail(url)
    expect(e.subject).toMatch(/reset/i)
    expect(e.subject).toContain('Chorala')
    expect(e.html).toContain(url)
    expect(e.text).toContain(url)
    expect(e.html).toContain('Powered by Chorala')
  })

  it('verifyEmail embeds the verification link', () => {
    const v = 'https://chorala.com/api/v1/auth/verify-email?token=xyz'
    const e = verifyEmail(v)
    expect(e.subject).toMatch(/verify/i)
    expect(e.html).toContain(v)
    expect(e.text).toContain(v)
  })

  it('magic-link + notification templates render', () => {
    expect(magicLinkEmail(url).html).toContain(url)
    const n = notificationEmail({ title: 'Hi', message: 'Body', url })
    expect(n.subject).toBe('Hi')
    expect(n.html).toContain('Body')
  })

  it('no template leaks the legacy brand token', () => {
    const all = [resetPasswordEmail(url), verifyEmail(url), magicLinkEmail(url)]
      .map((e) => `${e.subject}${e.html}${e.text}`)
      .join('')
    expect(all.toLowerCase()).not.toContain(['h', 'e', 'e', 'd'].join(''))
  })
})
