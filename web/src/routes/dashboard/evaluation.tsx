import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { authStorage } from '@/lib/auth'
import { evaluationAPI, EvaluationSchema } from '@/lib/evaluation-api'
import { Plus, Trash2, Upload, BarChart3, FileSpreadsheet, Clock } from 'lucide-react'
import { CreateEvaluationDialog } from '@/components/CreateEvaluationDialog'
import { UploadStudentDialog } from '@/components/UploadStudentDialog'

export const Route = createFileRoute('/dashboard/evaluation')({
  component: EvaluationPage,
})

function EvaluationPage() {
  const navigate = useNavigate()
  const [evaluations, setEvaluations] = useState<EvaluationSchema[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationSchema | null>(null)
  const [error, setError] = useState('')

  const loadEvaluations = async () => {
    try {
      setIsLoading(true)
      setError('')
      const token = authStorage.getToken()
      const user = authStorage.getUser()

      if (!token || !user) {
        setError('Please log in again')
        return
      }

      const data = await evaluationAPI.fetchEvaluationSchemas(user.id, token)
      setEvaluations(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load evaluations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEvaluations()
  }, [])

  const handleDelete = async (evaluationId: number) => {
    if (!confirm('Are you sure you want to delete this evaluation?')) {
      return
    }
    try {
      const token = authStorage.getToken()
      if (!token) return
      await evaluationAPI.deleteEvaluationSchema(evaluationId, token)
      await loadEvaluations()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete evaluation')
    }
  }

  const handleUpload = (evaluation: EvaluationSchema) => {
    setSelectedEvaluation(evaluation)
    setUploadDialogOpen(true)
  }

  const handleResults = (evaluationId: number) => {
    navigate({ to: `/dashboard/evaluation/${evaluationId}/results` })
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Evaluation Schemas</h1>
            <p className="mt-1 text-muted-foreground">Manage your evaluation assessments</p>
          </div>
          {evaluations.length > 0 && (
            <Button
              onClick={() => setIsDialogOpen(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Evaluation
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
            <div className="text-lg text-muted-foreground">Loading evaluations...</div>
          </div>
        ) : evaluations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileSpreadsheet className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">No Evaluations Yet</h3>
              <p className="mb-6 text-muted-foreground">
                Create your first evaluation schema to get started
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                size="lg"
                className="gap-2"
              >
                <Plus className="h-5 w-5" />
                Create Evaluation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {evaluations.map((evaluation) => {
              const progressPct = evaluation.total_students > 0
                ? Math.round((evaluation.completed_students / evaluation.total_students) * 100)
                : 0

              return (
                <Card key={evaluation.evaluation_id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      {/* Left: Info */}
                      <div className="flex-1">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold">{evaluation.subject_name}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {evaluation.branch}-{evaluation.semester} &middot; {evaluation.ia}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(evaluation.updated_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-6 text-sm">
                          <div>
                            <span className="text-muted-foreground">Questions: </span>
                            <span className="font-semibold">{evaluation.total_questions}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Students: </span>
                            <span className="font-semibold">{evaluation.completed_students}/{evaluation.total_students}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status: </span>
                            <span className="font-semibold capitalize">{evaluation.status}</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progressPct}%</span>
                          </div>
                          <div className="mt-1 h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpload(evaluation)}
                          className="gap-1.5"
                        >
                          <Upload className="h-4 w-4" />
                          Upload
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResults(evaluation.evaluation_id)}
                          className="gap-1.5"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Results
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(evaluation.evaluation_id)}
                          className="shrink-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <CreateEvaluationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadEvaluations}
      />

      {selectedEvaluation && (
        <UploadStudentDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          evaluation={{
            id: selectedEvaluation.evaluation_id,
            subject_name: selectedEvaluation.subject_name,
            ia: selectedEvaluation.ia,
            sem: parseInt(selectedEvaluation.semester),
          }}
          onSuccess={loadEvaluations}
        />
      )}
    </div>
  )
}
