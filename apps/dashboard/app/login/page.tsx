import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const user = await getSessionUser()
  if (user) redirect('/admin')

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* oversized decorative wordmark */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-0 select-none font-display text-[34vw] leading-none text-ink/[0.035]"
      >
        Heed
      </span>

      <div className="relative w-full max-w-sm rise">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent font-display text-2xl text-white shadow-[0_12px_28px_-10px_rgba(217,81,42,0.9)]">
            H
          </div>
          <h1 className="font-display text-[26px] tracking-[-0.02em]">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">Sign in to triage your feedback.</p>
        </div>
        <LoginForm />
        <p className="mt-5 text-center text-xs text-ink-faint">
          Demo: <span className="font-medium text-ink-soft">admin@heed.dev</span> ·{' '}
          <span className="font-medium text-ink-soft">heedadmin123</span>
        </p>
      </div>
    </main>
  )
}
