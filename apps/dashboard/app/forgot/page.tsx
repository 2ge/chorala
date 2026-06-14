import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { ForgotForm } from './forgot-form'

export const metadata = { title: 'Reset your password — Chorala' }

export default function ForgotPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="We’ll email you a secure reset link."
      footer={
        <p className="mt-5 text-center text-xs text-ink-faint">
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ForgotForm />
    </AuthShell>
  )
}
