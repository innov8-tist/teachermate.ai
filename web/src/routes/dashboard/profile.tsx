import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authStorage } from '@/lib/auth'
import { User, Mail, Building2, UserCircle } from 'lucide-react'

export const Route = createFileRoute('/dashboard/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const user = authStorage.getUser()

  if (!user) {
    return null
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile</h2>
          <p className="text-lg text-gray-600">Your account information</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Picture */}
          <Card className="border-blue-100">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              {user.pfp_url ? (
                <img
                  src={user.pfp_url}
                  alt={user.teacher_name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 mb-4"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center border-4 border-blue-200 mb-4">
                  <UserCircle className="w-24 h-24 text-blue-600" />
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 text-center">{user.teacher_name}</h3>
              <p className="text-sm text-gray-500 text-center mt-1">Teacher</p>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card className="border-blue-100 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="w-6 h-6 text-blue-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <p className="text-sm text-gray-500 font-semibold">Full Name</p>
                  </div>
                  <p className="text-base text-gray-900 pl-7">{user.teacher_name}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <p className="text-sm text-gray-500 font-semibold">Email Address</p>
                  </div>
                  <p className="text-base text-gray-900 pl-7">{user.email}</p>
                </div>

                {user.institution && (
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <p className="text-sm text-gray-500 font-semibold">Institution</p>
                    </div>
                    <p className="text-base text-gray-900 pl-7">{user.institution}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
