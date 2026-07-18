import { useState, useRef, FormEvent, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, X, FileText, BookOpen } from 'lucide-react'
import { evaluationAPI } from '@/lib/evaluation-api'
import { coAPI, CO } from '@/lib/co-api'
import { authStorage } from '@/lib/auth'

interface CreateEvaluationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateEvaluationDialog({ open, onOpenChange, onSuccess }: CreateEvaluationDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [coTemplates, setCoTemplates] = useState<CO[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const token = authStorage.getToken()
      const user = authStorage.getUser()
      if (!token || !user) return

      const cos = await coAPI.fetchMyCOs(user.id, token)
      setCoTemplates(cos)
    } catch (err) {
      console.error('Failed to fetch CO templates:', err)
      setCoTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open])

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

      setAnswerKeyFile(file)
      setError('')
    }
  }

  const removeFile = () => {
    setAnswerKeyFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedTemplateId) {
      setError('Please select a CO template')
      return
    }

    if (!answerKeyFile) {
      setError('Please upload an answer key PDF')
      return
    }

    setIsLoading(true)

    try {
      const token = authStorage.getToken()
      if (!token) {
        setError('Please log in again')
        return
      }

      await evaluationAPI.uploadAnswerKey(selectedTemplateId, answerKeyFile, token)

      setSelectedTemplateId(null)
      setAnswerKeyFile(null)
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create evaluation')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Create Evaluation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-5">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            {/* CO Template Selection */}
            <div className="space-y-2">
              <Label>Select CO Template</Label>
              {loadingTemplates ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed py-8">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading templates...</span>
                </div>
              ) : coTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center">
                  <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No CO templates available. Create a CO mapping first.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                  {coTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                        selectedTemplateId === template.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <span className="font-semibold">{template.name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {template.ia} &middot; Sem {template.sem}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload Answer Key PDF</Label>
              {answerKeyFile ? (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{answerKeyFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(answerKeyFile.size / 1024 / 1024).toFixed(2)} MB
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
                <div className="rounded-lg border border-dashed py-8 text-center hover:border-muted-foreground/50 transition-colors">
                  <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="answer-key-pdf"
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
              disabled={isLoading || !selectedTemplateId || !answerKeyFile}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Evaluation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
