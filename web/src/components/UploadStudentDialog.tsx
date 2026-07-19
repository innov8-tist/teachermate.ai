import { useState, useRef, FormEvent, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, X, FileText, Brain, Search, ChevronDown, ArrowRight } from 'lucide-react'
import { evaluationAPI, StudentRegno, SearchedStudent, RecentProgress } from '@/lib/evaluation-api'
import { authStorage } from '@/lib/auth'
import { useNavigate } from '@tanstack/react-router'

interface UploadStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evaluation: {
    id: number
    subject_id: number
    subject_name: string
    ia: string
    sem: number
  }
  onSuccess: () => void
}

interface StudentOption {
  reg_no: string
  name: string
  progress_id?: number | null
  upload_method?: string
}

export function UploadStudentDialog({ open, onOpenChange, evaluation, onSuccess }: UploadStudentDialogProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [studentRegNo, setStudentRegNo] = useState('')
  const [studentPdf, setStudentPdf] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [error, setError] = useState('')

  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [recentProgress, setRecentProgress] = useState<RecentProgress[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (open && evaluation.id) {
      loadStudents()
      loadRecentProgress()
    }
  }, [open, evaluation.id])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadRecentProgress = async () => {
    try {
      const token = authStorage.getToken()
      if (!token) return

      const progress = await evaluationAPI.fetchRecentProgress(evaluation.id, token)
      setRecentProgress(progress)
    } catch (err) {
      console.error('Failed to load recent progress:', err)
    }
  }

  const loadStudents = async () => {
    try {
      setLoadingStudents(true)
      const token = authStorage.getToken()
      if (!token) return

      const regnos: StudentRegno[] = await evaluationAPI.fetchStudentsBySubject(evaluation.subject_id, token)

      const studentsWithNames: StudentOption[] = regnos.map(r => ({
        reg_no: r.regno,
        name: '',
      }))

      setAllStudents(studentsWithNames)
    } catch {
      setAllStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const searchStudents = async (query: string) => {
    if (query.length < 2) return

    try {
      const token = authStorage.getToken()
      if (!token) return

      const results: SearchedStudent[] = await evaluationAPI.searchStudents(evaluation.id, query, token)

      if (results.length > 0) {
        setAllStudents(prev => {
          const merged = [...prev]
          for (const s of results) {
            const existing = merged.find(m => m.reg_no === s.student_reg_no)
            if (!existing) {
              merged.push({ 
                reg_no: s.student_reg_no, 
                name: s.student_name,
                progress_id: s.progress_id,
                upload_method: s.upload_method,
              })
            } else {
              existing.name = s.student_name
              existing.progress_id = s.progress_id
              existing.upload_method = s.upload_method
            }
          }
          return merged
        })
      }
    } catch {
      // ignore search errors
    }
  }

  const handleRegNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setStudentRegNo(value)
    setDropdownOpen(true)
    searchStudents(value)
  }

  const handleSelectStudent = (student: StudentOption) => {
    // Check if student already has progress
    if (student.progress_id && student.upload_method) {
      // Navigate directly to results
      onOpenChange(false)
      navigate({ 
        to: `/dashboard/evaluation/${evaluation.id}/results`,
        search: { studentRegNo: student.reg_no }
      })
      return
    }
    
    setStudentRegNo(student.reg_no)
    setDropdownOpen(false)
  }

  const handleRecentClick = (progress: RecentProgress) => {
    // Navigate to results for this student
    onOpenChange(false)
    navigate({ 
      to: `/dashboard/evaluation/${evaluation.id}/results`,
      search: { studentRegNo: progress.student_reg_no }
    })
  }

  const handleFocus = () => {
    setDropdownOpen(true)
  }

  const filteredStudents = allStudents.filter(
    s => s.reg_no.toLowerCase().includes(studentRegNo.toLowerCase()) ||
         s.name.toLowerCase().includes(studentRegNo.toLowerCase())
  )

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
      setError('Please enter or select a student registration number')
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
        setIsLoading(false)
        return
      }

      // Check if student already has been evaluated
      const trimmedRegNo = studentRegNo.trim()
      
      // First check in recent progress
      const existingInRecent = recentProgress.find(
        p => p.student_reg_no.toLowerCase() === trimmedRegNo.toLowerCase()
      )
      
      if (existingInRecent) {
        setIsLoading(false)
        setError(`Student ${trimmedRegNo} has already been evaluated. Redirecting to results...`)
        setTimeout(() => {
          onOpenChange(false)
          navigate({ 
            to: `/dashboard/evaluation/${evaluation.id}/results`,
            search: { studentRegNo: trimmedRegNo }
          })
        }, 1500)
        return
      }

      // Also check in the student list if we have progress info
      const existingInList = allStudents.find(
        s => s.reg_no.toLowerCase() === trimmedRegNo.toLowerCase() && 
             s.progress_id && 
             s.upload_method
      )
      
      if (existingInList) {
        setIsLoading(false)
        setError(`Student ${trimmedRegNo} has already been evaluated. Redirecting to results...`)
        setTimeout(() => {
          onOpenChange(false)
          navigate({ 
            to: `/dashboard/evaluation/${evaluation.id}/results`,
            search: { studentRegNo: trimmedRegNo }
          })
        }, 1500)
        return
      }

      // If not found in local data, do a server check via search
      const searchResults = await evaluationAPI.searchStudents(evaluation.id, trimmedRegNo, token)
      const existingOnServer = searchResults.find(
        s => s.student_reg_no.toLowerCase() === trimmedRegNo.toLowerCase() && 
             s.progress_id && 
             s.upload_method
      )

      if (existingOnServer) {
        setIsLoading(false)
        setError(`Student ${trimmedRegNo} has already been evaluated. Redirecting to results...`)
        setTimeout(() => {
          onOpenChange(false)
          navigate({ 
            to: `/dashboard/evaluation/${evaluation.id}/results`,
            search: { studentRegNo: trimmedRegNo }
          })
        }, 1500)
        return
      }

      // Proceed with upload if no existing evaluation found
      const result = await evaluationAPI.uploadStudentPdf(
        studentPdf,
        evaluation.id,
        trimmedRegNo,
        token,
      )

      if (result.progress_id) {
        setIsEvaluating(true)
        await evaluationAPI.startEvaluation(result.progress_id, token)
      }

      setStudentRegNo('')
      setStudentPdf(null)
      setAllStudents([])
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload student answer sheet')
    } finally {
      setIsLoading(false)
      setIsEvaluating(false)
    }
  }

  const buttonDisabled = isLoading || !studentRegNo.trim() || !studentPdf

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
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

            {/* Recent Evaluations Section */}
            {recentProgress.length > 0 && (
              <div className="space-y-2">
                <Label>Recent Evaluations</Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recentProgress.slice(0, 3).map((progress) => (
                    <button
                      key={progress.id}
                      type="button"
                      onClick={() => handleRecentClick(progress)}
                      className="flex min-w-[140px] flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{progress.student_reg_no}</span>
                        <span className="rounded-md bg-black px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          {progress.upload_method}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(progress.updated_at).toLocaleDateString()}</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="student_reg_no">Student</Label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="student_reg_no"
                    type="text"
                    placeholder="Search by reg no or name..."
                    value={studentRegNo}
                    onChange={handleRegNoChange}
                    onFocus={handleFocus}
                    disabled={isLoading}
                    className="pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {dropdownOpen && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
                    {loadingStudents ? (
                      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading students...
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        {studentRegNo.length >= 2
                          ? 'No students found'
                          : allStudents.length === 0
                            ? 'No students available. Type to search.'
                            : 'Type to filter students'}
                      </div>
                    ) : (
                      filteredStudents.map((student) => (
                        <button
                          key={student.reg_no}
                          type="button"
                          onClick={() => handleSelectStudent(student)}
                          className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{student.reg_no}</span>
                              {student.name && (
                                <span className="ml-2 text-muted-foreground">({student.name})</span>
                              )}
                            </div>
                            {student.progress_id && student.upload_method && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                EVALUATED
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
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
                      disabled={isLoading}
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
              {isEvaluating ? (
                <>
                  <Brain className="mr-2 h-4 w-4 animate-pulse" />
                  Evaluating...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload & Evaluate'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
