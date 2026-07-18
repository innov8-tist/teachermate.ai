import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreateCODialog } from '@/components/CreateCODialog'
import { coAPI, CO } from '@/lib/co-api'
import { authStorage } from '@/lib/auth'
import { Plus, Trash2, Download, FileSpreadsheet } from 'lucide-react'

export const Route = createFileRoute('/dashboard/co-mapper')({
  component: COMapperPage,
})

function COMapperPage() {
  const [coMappings, setCoMappings] = useState<CO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState('')

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
      setCoMappings(cos)
    } catch (err: any) {
      setError(err.message || 'Failed to load CO mappings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCOs()
  }, [])

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

  const handleDownload = async (subjectId: number, subjectName: string, ia: string) => {
    try {
      const token = authStorage.getToken()
      if (!token) {
        setError('Please log in again')
        return
      }

      const blob = await coAPI.downloadExcel(subjectId, token)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${subjectName}_${ia}_CO_Mapping.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message || 'Failed to download Excel')
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">CO Mappings</h2>
            <p className="text-lg text-gray-600">Manage your course outcome mappings</p>
          </div>
          {coMappings.length > 0 && (
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="h-12 text-base bg-blue-600 hover:bg-blue-700 px-6"
            >
              <Plus className="w-5 h-5" />
              Create CO Mapping
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-base" role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-gray-600">Loading CO mappings...</div>
          </div>
        ) : coMappings.length === 0 ? (
          <Card className="border-blue-100">
            <CardContent className="py-12 text-center">
              <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No CO Mappings Yet</h3>
              <p className="text-base text-gray-600 mb-6">
                Create your first CO mapping to get started
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="h-12 text-base bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                Create CO Mapping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coMappings.map((co) => (
              <Card key={co.id} className="border-blue-100 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{co.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <span className="font-semibold">Assessment:</span>
                    <span>{co.ia}</span>
                  </div>
                  <div className="text-sm text-gray-600">Semester {co.sem}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(co.id, co.name, co.ia)}
                      className="flex-1 h-11 text-base border-green-300 text-green-600 hover:bg-green-50"
                    >
                      <Download className="w-5 h-5" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDelete(co.id)}
                      className="h-11 text-base border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateCODialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadCOs}
      />
    </div>
  )
}
