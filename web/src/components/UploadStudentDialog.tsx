import { useState, useRef, FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, X, FileText } from 'lucide-react'
import { authStorage } from '@/lib/auth'

interface UploadStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evaluation: {
    id: number
    subject_name: string
    ia: string
    sem: number
  }
  onSuccess: () => void
}

export function UploadStudentDialog({ open, onOpenChange, evaluation, onSuccess }: UploadStudentDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [studentRegNo, setStudentRegNo] = useState('')
  const [studentPdf, setStudentPdf] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.includes('pdf')) {
        setError('Please select a PDF file')
        return
      }
      if (file.size > 50 * 1024 * 1024) {
        setError('File size should be less than 50MB')
        return
      }

      setStudentPdf(file)
      setError('')
    }
  }

  const removeFile = () => {
    setStudentPdf(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!studentRegNo.trim()) {
      setError('Please enter student registration number')
      return
    }

    if (!studentPdf) {
      setError('Please upload student answer sheet PDF')
      return
    }

    setIsLoading(true)

    try {
      const token = authStorage.getToken()
      if (!token) {
        setError('Please log in again')
        return
      }

      const formData = new FormData()
      formData.append('pdf_file', studentPdf)
      formData.append('evaluation_id', evaluation.id.toString())
      formData.append('student_reg_no', studentRegNo.trim())

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/evaluation/upload-pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to upload student PDF')
      }

      setStudentRegNo('')
      setStudentPdf(null)
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload student answer sheet')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader className="mb-2">
          <DialogTitle>Upload Student Answer Sheet</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {evaluation.subject_name} · {evaluation.ia} · Semester {evaluation.sem}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-5">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="student_reg_no">Student Registration Number</Label>
              <Input
                id="student_reg_no"
                type="text"
                placeholder="e.g., 1MS21CS001"
                value={studentRegNo}
                onChange={(e) => setStudentRegNo(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Student Answer Sheet PDF</Label>
              {studentPdf ? (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{studentPdf.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(studentPdf.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed py-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="student-pdf"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    Choose PDF
                  </Button>
                  <p className="mt-1.5 text-xs text-muted-foreground">PDF up to 50MB</p>
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
              disabled={isLoading || !studentRegNo.trim() || !studentPdf}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
