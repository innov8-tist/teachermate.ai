import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Users, Loader2, Trash2, User, ArrowRight } from 'lucide-react'
import { coAPI, Student } from '@/lib/co-api'
import { authStorage } from '@/lib/auth'

export const Route = createFileRoute('/dashboard/co-mapper/$coId/results')({
  component: ResultsPage,
})

interface StudentWithMarks extends Student {
  totalMarks?: number
}

interface StudentMark {
  question_no: string
  mark: string
  ia_id: number
}

function ResultsPage() {
  const navigate = useNavigate()
  const { coId } = Route.useParams()
  const [students, setStudents] = useState<StudentWithMarks[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([])
  const [subjectInfo, setSubjectInfo] = useState<{ name: string; ia: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadResults = async () => {
    try {
      setIsLoading(true)
      setError('')
      const token = authStorage.getToken()
      if (!token) {
        setError('Please log in again')
        return
      }

      // Fetch students
      const studentsData = await coAPI.fetchStudentsBySubject(parseInt(coId), token)

      // Fetch subject info
      const info = await coAPI.fetchSubjectInfo(parseInt(coId), token)
      setSubjectInfo({ name: info.name, ia: info.ia })

      // Fetch marks for each student
      const studentsWithMarks = await Promise.all(
        studentsData.map(async (student) => {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/student_marks/${coId}/${student.regno}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            )
            const marks = await response.json()
            const total = marks.reduce((sum: number, mark: StudentMark) => sum + parseFloat(mark.mark || '0'), 0)
            return { ...student, totalMarks: total }
          } catch {
            return { ...student, totalMarks: 0 }
          }
        })
      )

      setStudents(studentsWithMarks)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coId])

  const handleStudentClick = async (regno: string) => {
    try {
      const token = authStorage.getToken()
      if (!token) return

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/student_marks/${coId}/${regno}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const marks = await response.json()
      setStudentMarks(marks)
      setSelectedStudent(regno)
    } catch (err) {
      console.error('Error fetching student marks:', err)
    }
  }

  const handleDeleteStudent = async (regno: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (!confirm(`Are you sure you want to delete all marks for ${regno}?`)) {
      return
    }

    try {
      const token = authStorage.getToken()
      if (!token) return

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/student_marks/${coId}/${regno}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const result = await response.json()

      if (result.status === 'success') {
        // Refresh results
        await loadResults()
        if (selectedStudent === regno) {
          setSelectedStudent(null)
          setStudentMarks([])
        }
      } else {
        setError(result.message || 'Failed to delete student marks')
      }
    } catch (err) {
      setError('Failed to delete student marks')
    }
  }

  const handleDownload = async () => {
    try {
      const token = authStorage.getToken()
      if (!token) return

      const blob = await coAPI.downloadExcel(parseInt(coId), token)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${subjectInfo?.name || 'CO'}_${subjectInfo?.ia || 'Results'}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to download Excel file')
    }
  }

  // Student Detail View
  if (selectedStudent) {
    const totalMarks = studentMarks.reduce((sum, mark) => sum + parseFloat(mark.mark || '0'), 0)

    return (
      <div className="p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <Button
            onClick={() => {
              setSelectedStudent(null)
              setStudentMarks([])
            }}
            variant="outline"
            size="sm"
            className="mb-6 gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Students
          </Button>

          {/* Student Header Card */}
          <Card className="mb-6 border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">{selectedStudent}</h1>
                    <p className="text-sm text-muted-foreground">
                      {subjectInfo?.name} · {subjectInfo?.ia}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total Marks</div>
                  <div className="mt-1 text-4xl font-bold text-primary">{totalMarks.toFixed(1)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marks Table Card */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle>Question-wise Marks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {studentMarks.map((mark, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-semibold">
                        {mark.question_no}
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Question {mark.question_no}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-primary px-4 py-2 text-lg font-bold text-primary-foreground">
                        {mark.mark}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Section */}
              <div className="border-t-2 bg-muted/50 px-6 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold uppercase tracking-wide">Total Marks</span>
                  <span className="rounded-lg bg-primary px-6 py-3 text-2xl font-bold text-primary-foreground">
                    {totalMarks.toFixed(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Students List View
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <Button
          onClick={() => navigate({ to: '/dashboard/co-mapper' })}
          variant="outline"
          size="sm"
          className="mb-6 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to CO Mappings
        </Button>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Completed Students</h1>
            <p className="mt-1 text-muted-foreground">
              {subjectInfo?.name} · {subjectInfo?.ia}
            </p>
          </div>
          {students.length > 0 && (
            <Button
              onClick={handleDownload}
              size="lg"
              className="gap-2"
            >
              <Download className="h-5 w-5" />
              Download Excel Report
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-lg text-muted-foreground">Loading results...</span>
          </div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <Users className="mx-auto mb-4 h-20 w-20 text-muted-foreground/50" />
              <h3 className="mb-2 text-xl font-semibold">No Submissions Yet</h3>
              <p className="text-muted-foreground">
                No student answer sheets submitted
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <Card
                key={student.regno}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => handleStudentClick(student.regno)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{student.regno}</div>
                        <div className="text-sm text-muted-foreground">Registration Number</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">Total Marks</div>
                        <div className="mt-1 rounded-lg bg-muted px-4 py-1.5 text-lg font-bold">
                          {student.totalMarks?.toFixed(1) || '0.0'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => handleDeleteStudent(student.regno, e)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                        >
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
