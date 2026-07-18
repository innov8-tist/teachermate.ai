import { createFileRoute, useNavigate, Link, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { authStorage } from '@/lib/auth'
import { LogOut } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const navigate = useNavigate()
  const user = authStorage.getUser()

  useEffect(() => {
    if (!authStorage.isAuthenticated()) {
      navigate({ to: '/login' })
    }
  }, [navigate])

  const handleLogout = () => {
    authStorage.clearAuth()
    navigate({ to: '/login' })
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Sidebar - Professional */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Header */}
        <div className="px-8 py-8 border-b border-gray-100">
          <div className="flex flex-col items-center text-center">
            <img 
              src="/logo.svg" 
              alt="TeacherMate AI" 
              className="w-24 h-24 mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900">TeacherMate AI</h1>
            <p className="text-sm text-gray-500 mt-1">Smart Evaluation, Simplified</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 py-8">
          <ul className="space-y-2">
            <li>
              <Link
                to="/dashboard/co-mapper"
                className="flex items-center justify-center px-5 py-4 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-600 [&.active]:font-semibold"
              >
                <span className="text-base">CO Mapper</span>
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/evaluation"
                className="flex items-center justify-center px-5 py-4 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-600 [&.active]:font-semibold"
              >
                <span className="text-base">Evaluation</span>
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/profile"
                className="flex items-center justify-center px-5 py-4 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-600 [&.active]:font-semibold"
              >
                <span className="text-base">Profile</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="px-6 py-6 border-t border-gray-100 bg-gray-50">
          <div className="mb-4 px-2">
            <p className="text-sm font-bold text-gray-900 truncate">{user.teacher_name}</p>
            <p className="text-xs text-gray-500 truncate mt-1">{user.email}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-11 text-sm font-semibold border-gray-300 text-gray-700 hover:bg-white hover:border-red-300 hover:text-red-600 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30">
        <Outlet />
      </main>
    </div>
  )
}
