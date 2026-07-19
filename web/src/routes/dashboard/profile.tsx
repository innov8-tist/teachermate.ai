import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { authStorage } from '@/lib/auth'
import { User, Mail, Building2, UserCircle, Edit2, Camera, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/dashboard/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const user = authStorage.getUser()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fullName, setFullName] = useState(user?.teacher_name || '')
  const [institution, setInstitution] = useState(user?.institution || '')
  const [profileImage, setProfileImage] = useState(user?.pfp_url || '')
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) {
    return null
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.includes('image')) {
        alert('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB')
        return
      }

      setNewImageFile(file)
      setProfileImage(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    if (!fullName.trim()) {
      alert('Full name is required')
      return
    }

    setIsLoading(true)
    try {
      const token = authStorage.getToken()
      if (!token) {
        alert('Please log in again')
        return
      }

      const formData = new FormData()
      
      // Always send teacher_name (backend expects it as teacher_name)
      formData.append('teacher_name', fullName.trim())
      
      // Always send institution (can be empty string)
      formData.append('institution', institution.trim())
      
      if (newImageFile) {
        formData.append('pfp', newImageFile)
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/auth/me`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to update profile')
      }

      const updatedTeacher = await response.json()
      
      // Update local storage with the correct structure
      authStorage.setUser({
        id: updatedTeacher.id,
        teacher_name: updatedTeacher.teacher_name,
        email: updatedTeacher.email,
        institution: updatedTeacher.institution,
        pfp_url: updatedTeacher.pfp_url,
      })
      
      alert('Profile updated successfully!')
      setIsEditModalOpen(false)
      
      // Reload to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = () => {
    setFullName(user.teacher_name)
    setInstitution(user.institution || '')
    setProfileImage(user.pfp_url || '')
    setNewImageFile(null)
    setIsEditModalOpen(true)
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
          <Card className="border-blue-100 relative">
            <Button
              onClick={handleEditClick}
              size="icon"
              variant="outline"
              className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-white hover:bg-gray-50"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
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

        {/* Edit Profile Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogClose onClose={() => setIsEditModalOpen(false)} />
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>

            <DialogBody className="space-y-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-gray-200">
                      <UserCircle className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 border-2 border-white hover:bg-primary/90"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <p className="mt-2 text-sm text-muted-foreground">Click camera icon to change picture</p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="pl-9 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              {/* Institution */}
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Enter your institution"
                    className="pl-9"
                  />
                </div>
              </div>
            </DialogBody>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
