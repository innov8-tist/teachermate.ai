import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { authStorage } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn, UserPlus } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (authStorage.isAuthenticated()) {
      navigate({ to: '/dashboard' })
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-6">
          <div className="mx-auto w-32 h-32 flex items-center justify-center">
            <img src="/logo.svg" alt="TeacherMate AI" className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-3">
              TeacherMate AI
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Smart Evaluation, Simplified
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Card className="border-gray-200 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate({ to: '/login' })}>
            <CardHeader>
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <LogIn className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription className="text-base">
                Access your existing account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate({ to: '/login' })}
              >
                Sign In
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate({ to: '/register' })}>
            <CardHeader>
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Create Account</CardTitle>
              <CardDescription className="text-base">
                Join our teaching platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                onClick={() => navigate({ to: '/register' })}
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
