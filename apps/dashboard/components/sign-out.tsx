'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

export function SignOut() {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await fetch('/api/v1/auth/sign-out', { method: 'POST', credentials: 'include' })
        router.push('/login')
        router.refresh()
      }}
    >
      Sign out
    </Button>
  )
}
