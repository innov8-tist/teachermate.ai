import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authAPI, APIError } from '@/lib/api'
import { authStorage } from '@/lib/auth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { AnimatedBackground } from '@/components/AnimatedBackground'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (authStorage.isAuthenticated()) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)

    try {
      const response = await authAPI.login({ email, password })
      authStorage.saveAuth(response)
      navigate({ to: '/dashboard' })
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      <Card className="w-full max-w-md shadow-2xl border-white/30 backdrop-blur-xl bg-white/10 relative z-10">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto w-20 h-20 flex items-center justify-center">
            <img src="/logo.svg" alt="TeacherMate AI" className="w-full h-full drop-shadow-lg" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-white drop-shadow-lg">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base mt-2 text-white/90 drop-shadow">
              Sign in to your teacher account
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-300/50 text-red-100 px-4 py-3 rounded-lg text-base" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="teacher@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-12 text-base bg-white/30 backdrop-blur-md border-white/40 text-gray-900 placeholder:text-gray-600 focus:border-white/60 focus:ring-white/40 font-medium"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-12 text-base pr-12 bg-white/30 backdrop-blur-md border-white/40 text-gray-900 placeholder:text-gray-600 focus:border-white/60 focus:ring-white/40 font-medium"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-base text-white/80 drop-shadow">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-white font-semibold hover:text-white/90 hover:underline focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 rounded"
              >
                Create Account
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
