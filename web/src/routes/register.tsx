import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState, FormEvent, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authAPI, APIError } from '@/lib/api'
import { authStorage } from '@/lib/auth'
import { Eye, EyeOff, Loader2, Upload, X } from 'lucide-react'
import { AnimatedBackground } from '@/components/AnimatedBackground'

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (authStorage.isAuthenticated()) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    teacher_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    institution: '',
  })
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB')
        return
      }
      
      setProfilePicture(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeProfilePicture = () => {
    setProfilePicture(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    if (!formData.teacher_name.trim()) {
      setError('Please enter your full name')
      return false
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await authAPI.signup({
        teacher_name: formData.teacher_name,
        email: formData.email,
        password: formData.password,
        institution: formData.institution || undefined,
        pfp: profilePicture || undefined,
      })
      
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
    <div className="min-h-screen flex items-center justify-center p-4 py-8 relative overflow-hidden">
      <AnimatedBackground />
      <Card className="w-full max-w-md shadow-2xl border-white/30 backdrop-blur-xl bg-white/10 relative z-10">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto w-20 h-20 flex items-center justify-center">
            <img src="/logo.svg" alt="TeacherMate AI" className="w-full h-full drop-shadow-lg" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-white drop-shadow-lg">
              Create Account
            </CardTitle>
            <CardDescription className="text-base mt-2 text-white/90 drop-shadow">
              Join our teaching platform today
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
              <Label className="text-base text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Profile Picture (Optional)
              </Label>
              <div className="flex items-center gap-4">
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Profile preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-white/40"
                    />
                    <button
                      type="button"
                      onClick={removeProfilePicture}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-white/40">
                    <Upload className="w-8 h-8 text-white/90" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="profile-picture"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full h-11 text-base bg-white/30 backdrop-blur-md border-white/40 text-gray-900 hover:bg-white/40 font-medium"
                  >
                    Choose Photo
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher_name" className="text-base text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Full Name
              </Label>
              <Input
                id="teacher_name"
                name="teacher_name"
                type="text"
                placeholder="John Smith"
                value={formData.teacher_name}
                onChange={handleInputChange}
                disabled={isLoading}
                className="h-12 text-base bg-white/30 backdrop-blur-md border-white/40 text-gray-900 placeholder:text-gray-600 focus:border-white/60 focus:ring-white/40 font-medium"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="teacher@school.edu"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className="h-12 text-base bg-white/30 backdrop-blur-md border-white/40 text-gray-900 placeholder:text-gray-600 focus:border-white/60 focus:ring-white/40 font-medium"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution" className="text-base text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Institution (Optional)
              </Label>
              <Input
                id="institution"
                name="institution"
                type="text"
                placeholder="School or University Name"
                value={formData.institution}
                onChange={handleInputChange}
                disabled={isLoading}
                className="h-12 text-base bg-white/30 backdrop-blur-md border-white/40 text-gray-900 placeholder:text-gray-600 focus:border-white/60 focus:ring-white/40 font-medium"
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="h-12 text-base pr-12 bg-white/30 backdrop-blur-md border-white/40 text-gray-900 placeholder:text-gray-600 focus:border-white/60 focus:ring-white/40 font-medium"
                  autoComplete="new-password"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="h-12 text-base pr-12 bg-white/30 backdrop-blur-md border-white/40 text-gray-900 placeholder:text-gray-600 focus:border-white/60 focus:ring-white/40 font-medium"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
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
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-base text-white/80 drop-shadow">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-white font-semibold hover:text-white/90 hover:underline focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 rounded"
              >
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
