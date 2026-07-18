import { useState, useRef, FormEvent, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, X } from 'lucide-react'
import { coAPI, Subject } from '@/lib/co-api'
import { authStorage } from '@/lib/auth'

interface CreateCODialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]

export function CreateCODialog({ open, onOpenChange, onSuccess }: CreateCODialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    semester: '',
    subject_name: '',
    ia_number: '',
    student_count: '',
  })
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [coImage, setCoImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchSubjects = async (semester: number) => {
    try {
      setLoadingSubjects(true)
      const token = authStorage.getToken()
      if (!token) return

      const fetchedSubjects = await coAPI.fetchSubjects(semester, token)
      setSubjects(fetchedSubjects)
    } catch (err) {
      console.error('Failed to fetch subjects:', err)
      setSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }

  useEffect(() => {
    if (formData.semester) {
      fetchSubjects(parseInt(formData.semester)).catch(() => {})
    }
  }, [formData.semester])

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
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB')
        return
      }

      setCoImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const removeImage = () => {
    setCoImage(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    if (!formData.semester) {
      setError('Please select a semester')
      return false
    }
    if (!formData.subject_name.trim()) {
      setError('Please select a subject')
      return false
    }
    if (!formData.ia_number) {
      setError('Please select IA type (IA1 or IA2)')
      return false
    }
    if (!formData.student_count || parseInt(formData.student_count) < 1) {
      setError('Please enter a valid student count')
      return false
    }
    if (!coImage) {
      setError('Please upload a CO mapping image')
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
      const token = authStorage.getToken()
      if (!token) {
        setError('Please log in again')
        return
      }

      await coAPI.createCO(
        {
          subject_name: formData.subject_name,
          sem: parseInt(formData.semester),
          ia_number: parseInt(formData.ia_number),
          student_count: parseInt(formData.student_count),
          co_image: coImage!,
        },
        token
      )

      setFormData({
        semester: '',
        subject_name: '',
        ia_number: '',
        student_count: '',
      })
      setSubjects([])
      setCoImage(null)
      setPreviewUrl(null)
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create CO mapping')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[95vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader className="mb-2">
          <DialogTitle>Create CO Mapping</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-5">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            {/* Semester Selection */}
            <div className="space-y-2">
              <Label>Semester</Label>
              <div className="grid grid-cols-4 gap-2">
                {SEMESTERS.map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, semester: sem.toString(), subject_name: '' }))}
                    disabled={isLoading}
                    className={`h-10 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.semester === sem.toString()
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    Sem {sem}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Selection */}
            <div className="space-y-2">
              <Label>Subject</Label>
              {loadingSubjects ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading subjects...</span>
                </div>
              ) : !formData.semester ? (
                <div className="rounded-lg border border-dashed py-6 text-center">
                  <p className="text-sm text-muted-foreground">Select a semester first</p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="rounded-lg border border-dashed py-6 text-center">
                  <p className="text-sm text-muted-foreground">No subjects found for Semester {formData.semester}</p>
                  <Input
                    name="subject_name"
                    type="text"
                    placeholder="Enter subject name manually"
                    value={formData.subject_name}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="mx-auto mt-3 max-w-xs"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {subjects.map((subject, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, subject_name: subject.name }))}
                      className={`rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                        formData.subject_name === subject.name
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {subject.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Student Count & IA Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student_count">Number of Students</Label>
                <Input
                  id="student_count"
                  name="student_count"
                  type="number"
                  placeholder="e.g. 60"
                  min="1"
                  value={formData.student_count}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Assessment</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['1', '2'].map((ia) => (
                    <button
                      key={ia}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, ia_number: ia }))}
                      disabled={isLoading}
                      className={`h-10 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.ia_number === ia
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      IA{ia}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>CO Mapping Image</Label>
              {previewUrl ? (
                <div className="relative overflow-hidden rounded-lg border">
                  <img
                    src={previewUrl}
                    alt="CO mapping preview"
                    className="max-h-48 w-full object-contain bg-muted"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-lg hover:bg-destructive/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed py-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="co-image"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    Choose Image
                  </Button>
                  <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
          </DialogBody>

          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create CO Mapping'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
