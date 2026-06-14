import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const user = await getSessionUser()
  if (user) redirect('/admin')
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            H
          </div>
          <h1 className="text-xl font-bold">Sign in to Heed</h1>
          <p className="text-sm text-slate-500">Admin dashboard</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
