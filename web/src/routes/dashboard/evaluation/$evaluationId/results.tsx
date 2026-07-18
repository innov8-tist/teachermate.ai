import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Users, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/dashboard/evaluation/$evaluationId/results')({
  component: ResultsPage,
})

interface StudentResult {
  student_reg_no: string
  student_name: string
  total_marks: number
  max_possible_marks: number
  questions_evaluated: number
  total_questions: number
}

function ResultsPage() {
  const navigate = useNavigate()
  const { evaluationId } = Route.useParams()
  const [results, setResults] = useState<StudentResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadResults = async () => {
    try {
      setIsLoading(true)
      setError('')
      const token = authStorage.getToken()
      if (!token) return

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
      setResults(data.students || [])
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

  const handleDownload = () => {
    // TODO: Implement download results as Excel
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Button
            onClick={() => navigate({ to: '/dashboard/evaluation' })}
            variant="outline"
            size="sm"
            className="mb-4 gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Evaluations
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Evaluation Results</h1>
              <p className="mt-1 text-muted-foreground">
                Evaluation #{evaluationId}
              </p>
            </div>
            <Button
              onClick={handleDownload}
              size="lg"
              className="gap-2"
            >
              <Download className="h-5 w-5" />
              Download Results
            </Button>
          </div>
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
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">No Results Yet</h3>
              <p className="text-muted-foreground">
                Upload student answer sheets to see results
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Student Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Reg. No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Marks</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.student_reg_no} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{result.student_reg_no}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{result.student_name}</td>
                        <td className="px-4 py-3 text-center text-sm font-bold">
                          {result.total_marks}/{result.max_possible_marks}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                          {result.questions_evaluated}/{result.total_questions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
