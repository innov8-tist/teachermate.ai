import { createFileRoute, redirect } from '@tanstack/react-router'
import { authStorage } from '@/lib/auth'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (authStorage.isAuthenticated()) {
      throw redirect({ to: '/dashboard' })
    } else {
      throw redirect({ to: '/login' })
    }
  },
})
