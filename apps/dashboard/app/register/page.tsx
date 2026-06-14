import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { RegisterForm } from './register-form'

export const metadata = { title: 'Create your account — Chorala' }

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start collecting feedback in minutes."
      footer={
        <p className="mt-5 text-center text-xs text-ink-faint">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
