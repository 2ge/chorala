'use client'

import { type FormEvent, useState } from 'react'
import { Button, Card, Input, Label } from '@/components/ui'

export function ForgotForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    // Always show success (avoid leaking which emails exist).
    await fetch('/api/v1/auth/request-password-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, redirectTo: '/reset' }),
    }).catch(() => {})
    setSent(true)
    setBusy(false)
  }

  if (sent) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-ink-soft">
          If an account exists for <span className="font-medium text-ink">{email}</span>, a password
          reset link is on its way. Check your inbox.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </Card>
  )
}
