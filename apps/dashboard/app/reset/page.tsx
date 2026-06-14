import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { ResetForm } from './reset-form'

export const metadata = { title: 'Set a new password — Chorala' }

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong new password for your account."
      footer={
        <p className="mt-5 text-center text-xs text-ink-faint">
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ResetForm token={token ?? ''} />
    </AuthShell>
  )
}
