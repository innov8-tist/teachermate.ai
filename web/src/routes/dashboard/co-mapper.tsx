import { createFileRoute, useNavigate, Outlet, useMatches } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreateCODialog } from '@/components/CreateCODialog'
import { UploadCOStudentDialog } from '@/components/UploadCOStudentDialog'
import { coAPI, CO, CODetail } from '@/lib/co-api'
import { authStorage } from '@/lib/auth'
import { Plus, Trash2, Upload, BarChart3, FileSpreadsheet, Clock, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'

interface COWithDetails extends CO {
  questionCount?: number
  coCount?: number
  completedStudents?: number
  totalStudents?: number
  coDetails?: CODetail[]
}

export const Route = createFileRoute('/dashboard/co-mapper')({
  component: COMapperPage,
})

function COMapperPage() {
  const navigate = useNavigate()
  const matches = useMatches()
  const [coMappings, setCoMappings] = useState<COWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedCO, setSelectedCO] = useState<COWithDetails | null>(null)
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false)
  const [selectedCOForMapping, setSelectedCOForMapping] = useState<COWithDetails | null>(null)
  const [error, setError] = useState('')

  // Check if we're on a child route (results page)
  const isOnChildRoute = matches.some(match => 
    match.routeId.includes('/$coId/results')
  )

  const loadCOs = async () => {
    try {
      setIsLoading(true)
      setError('')
      const token = authStorage.getToken()
      const user = authStorage.getUser()
      
      if (!token || !user) {
        setError('Please log in again')
        return
      }

      const cos = await coAPI.fetchMyCOs(user.id, token)
      
      // Fetch additional details for each CO
      const cosWithDetails = await Promise.all(
        cos.map(async (co) => {
          try {
            // Fetch CO details (questions and COs)
            const details = await coAPI.fetchCODetails(co.id, token)
            const uniqueCOs = [...new Set(details.map((d: CODetail) => d.co_no))].length
            
            // Fetch completed students
            const students = await coAPI.fetchStudentsBySubject(co.id, token)
            
            // Fetch subject info for total students
            const info = await coAPI.fetchSubjectInfo(co.id, token)
            
            return {
              ...co,
              questionCount: details.length,
              coCount: uniqueCOs,
              completedStudents: students.length,
              totalStudents: info.student_count || 0,
              coDetails: details,
            }
          } catch (error) {
            console.error(`Error fetching details for CO ${co.id}:`, error)
            return {
              ...co,
              questionCount: 0,
              coCount: 0,
              completedStudents: 0,
              totalStudents: 0,
              coDetails: [],
            }
          }
        })
      )
      
      setCoMappings(cosWithDetails)
    } catch (err: any) {
      setError(err.message || 'Failed to load CO mappings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isOnChildRoute) {
      loadCOs()
    }
  }, [isOnChildRoute])

  const handleDelete = async (coId: number) => {
    if (!confirm('Are you sure you want to delete this CO mapping?')) {
      return
    }

    try {
      const token = authStorage.getToken()
      if (!token) {
        setError('Please log in again')
        return
      }

      await coAPI.deleteCO(coId, token)
      await loadCOs()
    } catch (err: any) {
      setError(err.message || 'Failed to delete CO mapping')
    }
  }

  const handleUpload = (co: COWithDetails) => {
    setSelectedCO(co)
    setUploadDialogOpen(true)
  }

  const handleResults = (coId: number) => {
    navigate({ to: `/dashboard/co-mapper/${coId}/results` })
  }

  const handleShowMapping = (co: COWithDetails) => {
    setSelectedCOForMapping(co)
    setMappingDialogOpen(true)
  }

  // If on child route, just render the outlet
  if (isOnChildRoute) {
    return <Outlet />
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">CO Mappings</h1>
            <p className="mt-1 text-muted-foreground">Manage your course outcome mappings</p>
          </div>
          {coMappings.length > 0 && (
            <Button
              onClick={() => setIsDialogOpen(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Create CO Mapping
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
            <div className="text-lg text-muted-foreground">Loading CO mappings...</div>
          </div>
        ) : coMappings.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileSpreadsheet className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">No CO Mappings Yet</h3>
              <p className="mb-6 text-muted-foreground">
                Create your first CO mapping to get started
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                size="lg"
                className="gap-2"
              >
                <Plus className="h-5 w-5" />
                Create CO Mapping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {coMappings.map((co) => {
              const progressPct = co.totalStudents && co.totalStudents > 0
                ? Math.round((co.completedStudents! / co.totalStudents) * 100)
                : 0

              return (
                <Card key={co.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      {/* Left: Info */}
                      <div className="flex-1">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold">{co.name}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {co.branch} &middot; Semester {co.sem} &middot; {co.ia}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            Today
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Questions: </span>
                            <span className="font-semibold">{co.questionCount || 0}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleShowMapping(co)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </div>
                          <div>
                            <span className="text-muted-foreground">COs: </span>
                            <span className="font-semibold">{co.coCount || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Students: </span>
                            <span className="font-semibold">{co.completedStudents || 0}/{co.totalStudents || 0}</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Evaluation Progress</span>
                            <span className="font-medium">{progressPct}% done</span>
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
                          onClick={() => handleUpload(co)}
                          className="gap-1.5"
                        >
                          <Upload className="h-4 w-4" />
                          Upload
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResults(co.id)}
                          className="gap-1.5"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Results
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(co.id)}
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

      <CreateCODialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadCOs}
      />

      {selectedCO && (
        <UploadCOStudentDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          co={{
            id: selectedCO.id,
            subject_id: selectedCO.id,
            subject_name: selectedCO.name,
            ia: selectedCO.ia,
            sem: selectedCO.sem,
          }}
          onSuccess={loadCOs}
        />
      )}

      {/* Question-to-CO Mapping Modal */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogClose onClose={() => setMappingDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Question-to-CO Mapping</DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedCOForMapping?.name}</p>
          </DialogHeader>
          <div className="mt-4">
            {selectedCOForMapping?.coDetails && selectedCOForMapping.coDetails.length > 0 ? (
              <div className="space-y-2">
                {selectedCOForMapping.coDetails.map((detail, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4"
                  >
                    <div className="flex-1 text-center">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Question</div>
                      <div className="mt-1 text-lg font-bold">{detail.q_no}</div>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div className="flex-1 text-center">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">CO</div>
                      <div className="mt-1 text-lg font-bold">{detail.co_no}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No mappings available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
