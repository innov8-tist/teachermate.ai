import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { authStorage } from '@/lib/auth'
import { ArrowLeft, Download, Users, Loader2, Trash2, User, ArrowRight, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/dashboard/evaluation/$evaluationId/results')({
  component: ResultsPage,
  validateSearch: (search: Record<string, unknown>): { studentRegNo?: string } => {
    return {
      studentRegNo: search.studentRegNo as string | undefined,
    }
  },
})

interface StudentResult {
  student_reg_no: string
  student_name?: string
  completed_questions: number
  total_questions: number
  total_marks: number
  max_possible_marks: number
}

interface StudentDetailedResult {
  question_no: string
  mark_score: number
  total_mark: number
  feedback: string[]
}

function ResultsPage() {
  const navigate = useNavigate()
  const { evaluationId } = Route.useParams()
  const { studentRegNo: searchStudentRegNo } = Route.useSearch()
  const [students, setStudents] = useState<StudentResult[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [studentDetails, setStudentDetails] = useState<StudentDetailedResult[]>([])
  const [subjectInfo, setSubjectInfo] = useState<{ name: string; ia: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set())
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

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/evaluation/${evaluationId}/results`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load results')
      }

      const data = await response.json()
      setStudents(data.students || [])
      
      // Get subject info from first student or evaluation
      if (data.students && data.students.length > 0) {
        // Try to fetch evaluation details for subject name
        try {
          const evalResponse = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/evaluation/${evaluationId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          if (evalResponse.ok) {
            const evalData = await evalResponse.json()
            setSubjectInfo({ name: evalData.subject_name, ia: evalData.ia })
          }
        } catch (err) {
          console.error('Failed to fetch subject info:', err)
        }
      }
      
      // Auto-select student from search param if provided
      if (searchStudentRegNo && data.students.some((s: StudentResult) => s.student_reg_no === searchStudentRegNo)) {
        fetchStudentDetails(searchStudentRegNo)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId])

  const fetchStudentDetails = async (studentRegNo: string) => {
    setIsLoadingDetails(true)
    try {
      const token = authStorage.getToken()
      if (!token) return

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/evaluation/${evaluationId}/student/${studentRegNo}/details`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch student details')
      }

      const data = await response.json()
      setStudentDetails(data.results || [])
      setSelectedStudent(studentRegNo)
      setExpandedFeedback(new Set())
    } catch (err) {
      console.error('Error fetching student details:', err)
      setError('Failed to load student details')
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const toggleFeedback = (questionNo: string) => {
    setExpandedFeedback(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionNo)) {
        newSet.delete(questionNo)
      } else {
        newSet.add(questionNo)
      }
      return newSet
    })
  }

  const handleDeleteStudent = async (studentRegNo: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    if (!confirm(`Are you sure you want to delete all evaluation results for ${studentRegNo}?`)) {
      return
    }

    try {
      const token = authStorage.getToken()
      if (!token) return

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/evaluation/${evaluationId}/student/${studentRegNo}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.ok) {
        await loadResults()
        if (selectedStudent === studentRegNo) {
          setSelectedStudent(null)
          setStudentDetails([])
        }
      } else {
        setError('Failed to delete student results')
      }
    } catch (err) {
      setError('Failed to delete student results')
    }
  }

  const handleDownload = () => {
    // TODO: Implement download results as Excel
  }

  const getMarksPercentage = (earned: number, total: number) => {
    if (total === 0) return 0
    return Math.round((earned / total) * 100)
  }

  // Student Detail View
  if (selectedStudent) {
    const student = students.find(s => s.student_reg_no === selectedStudent)
    const totalMarks = student?.total_marks || 0
    const maxMarks = student?.max_possible_marks || 0
    const percentage = getMarksPercentage(totalMarks, maxMarks)

    return (
      <div className="p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <Button
            onClick={() => {
              setSelectedStudent(null)
              setStudentDetails([])
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
                      {student?.student_name || 'Student'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total Marks</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-primary">{totalMarks.toFixed(1)}</span>
                    <span className="text-xl text-muted-foreground">/ {maxMarks}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-muted-foreground">{percentage}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-lg text-muted-foreground">Loading details...</span>
            </div>
          ) : (
            <>
              {/* Marks Table Card */}
              <Card>
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle>Question-wise Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {studentDetails.map((result, index) => {
                      const hasFeedback = result.mark_score < result.total_mark && result.feedback && result.feedback.length > 0
                      const isExpanded = expandedFeedback.has(result.question_no)
                      const marksLost = result.total_mark - result.mark_score

                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-semibold">
                                Q{result.question_no}
                              </div>
                              <span className="text-sm font-medium text-muted-foreground">Question {result.question_no}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Score</div>
                                <span className={`rounded-lg px-4 py-2 text-lg font-bold ${
                                  result.mark_score === result.total_mark 
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {result.mark_score.toFixed(1)}
                                </span>
                              </div>
                              <span className="text-muted-foreground">/</span>
                              <div className="text-center">
                                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Total</div>
                                <span className="text-lg font-semibold text-muted-foreground">
                                  {result.total_mark}
                                </span>
                              </div>
                              {hasFeedback && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleFeedback(result.question_no)}
                                  className={`gap-1 ${isExpanded ? 'text-destructive' : 'text-muted-foreground'}`}
                                >
                                  <AlertCircle className="h-4 w-4" />
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  {marksLost > 0 && (
                                    <span className="text-xs font-semibold">-{marksLost.toFixed(1)}</span>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          {hasFeedback && isExpanded && (
                            <div className="mx-6 mb-4 rounded-lg border-l-4 border-destructive bg-destructive/5 p-4">
                              <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                <span>Where marks were lost:</span>
                              </div>
                              <ul className="space-y-2">
                                {result.feedback.map((feedbackItem, feedbackIndex) => (
                                  <li key={feedbackIndex} className="flex gap-2 text-sm text-destructive/90">
                                    <span className="font-bold">•</span>
                                    <span>{feedbackItem}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Summary Section */}
                  <div className="border-t-2 bg-muted/50 px-6 py-5">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-semibold text-muted-foreground">Questions Completed</div>
                        <div className="mt-1 text-2xl font-bold">
                          {student?.completed_questions}/{student?.total_questions}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-muted-foreground">Total Marks</div>
                        <div className="mt-1 text-2xl font-bold text-primary">
                          {totalMarks.toFixed(1)}/{maxMarks}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-muted-foreground">Percentage</div>
                        <div className="mt-1 text-2xl font-bold">
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    )
  }

  // Students List View
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <Button
          onClick={() => navigate({ to: '/dashboard/evaluation' })}
          variant="outline"
          size="sm"
          className="mb-6 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Evaluations
        </Button>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Evaluation Results</h1>
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
              Download Results
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
              <h3 className="mb-2 text-xl font-semibold">No Results Yet</h3>
              <p className="text-muted-foreground">
                No student evaluations have been completed
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {students.map((student) => {
              const percentage = getMarksPercentage(student.total_marks, student.max_possible_marks)
              
              return (
                <Card
                  key={student.student_reg_no}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                  onClick={() => fetchStudentDetails(student.student_reg_no)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{student.student_reg_no}</div>
                          <div className="text-sm text-muted-foreground">
                            Answered: {student.completed_questions}/{student.total_questions} questions
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-muted-foreground">Total Marks</div>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="rounded-lg bg-muted px-3 py-1 text-lg font-bold">
                              {student.total_marks.toFixed(1)}
                            </span>
                            <span className="text-sm text-muted-foreground">/ {student.max_possible_marks}</span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-muted-foreground">{percentage}%</div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => handleDeleteStudent(student.student_reg_no, e)}
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
