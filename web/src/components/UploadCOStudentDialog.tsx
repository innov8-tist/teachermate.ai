import { useState, useRef, FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, X, FileImage, Camera, Image as ImageIcon } from 'lucide-react'
import { coAPI } from '@/lib/co-api'
import { authStorage } from '@/lib/auth'

interface UploadCOStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  co: {
    id: number
    subject_id: number
    subject_name: string
    ia: string
    sem: number
  }
  onSuccess: () => void
}

export function UploadCOStudentDialog({ open, onOpenChange, co, onSuccess }: UploadCOStudentDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [studentImage, setStudentImage] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState('')
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.includes('image')) {
        setError('Please select an image file (JPG, PNG)')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size should be less than 10MB')
        return
      }

      setStudentImage(file)
      setError('')
    }
  }

  const removeFile = () => {
    setStudentImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!studentImage) {
      setError('Please upload student answer sheet image')
      return
    }

    setIsLoading(true)
    setIsAnalyzing(true)

    try {
      const token = authStorage.getToken()
      if (!token) {
        setError('Please log in again')
        return
      }

      setAnalysisStep('Uploading image...')
      await new Promise(resolve => setTimeout(resolve, 500))

      setAnalysisStep('Processing image...')
      await new Promise(resolve => setTimeout(resolve, 500))

      setAnalysisStep('Extracting data...')
      const result = await coAPI.uploadStudentSheet(co.id, studentImage, token)

      if (result.status === 'success') {
        setAnalysisStep('Saving to database...')
        await new Promise(resolve => setTimeout(resolve, 500))

        setStudentImage(null)
        onSuccess()
        onOpenChange(false)
      } else {
        setError(result.message || 'Failed to analyze answer sheet')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload student answer sheet')
    } finally {
      setIsLoading(false)
      setIsAnalyzing(false)
      setAnalysisStep('')
    }
  }

  const buttonDisabled = isLoading || !studentImage

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Upload Student Answer Sheet</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {co.subject_name} · {co.ia} · Semester {co.sem}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-5">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            {isAnalyzing && (
              <div className="rounded-lg border bg-muted/50 p-6">
                <div className="flex flex-col items-center text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="font-semibold mb-1">Analyzing Answer Sheet</p>
                  <p className="text-sm text-muted-foreground mb-4">{analysisStep}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      <span>Upload</span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      <span>Segment</span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center gap-1">
                      <FileImage className="h-3 w-3" />
                      <span>Map COs</span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      <span>Save</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic mt-4">This may take 30-60 seconds</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Student Answer Sheet Image</Label>
              {studentImage ? (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={URL.createObjectURL(studentImage)}
                        alt="Answer sheet preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{studentImage.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(studentImage.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {studentImage.type}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed py-8 text-center hover:border-muted-foreground/50 transition-colors">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="student-image"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Choose Image
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    💡 Tip: Crop the image to show only the answer sheet
                  </p>
                </div>
              )}
            </div>
          </DialogBody>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={buttonDisabled}
            >
              {isAnalyzing ? (
                <>
                  <FileImage className="mr-2 h-4 w-4 animate-pulse" />
                  Analyzing...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Analyze
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
