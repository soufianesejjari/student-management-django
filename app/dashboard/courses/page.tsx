"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react"
import { useCourses } from "@/hooks/useCourses"
import { useSearchParams, usePathname, useRouter } from "next/navigation"

export default function CoursesPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const page = Number(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ""

  const { courses, isLoading, next, previous, totalCount } = useCourses(page, search)

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('search', term)
    } else {
      params.delete('search')
    }
    params.set('page', '1') // Reset to page 1 on search
    replace(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des cours</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau cours
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cours</CardTitle>
          <CardDescription>Gérez les cours, les horaires et les affectations des professeurs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un cours..."
                className="h-9"
                defaultValue={search}
                onChange={(e) => {
                  handleSearch(e.target.value)
                }}
              />
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du cours</TableHead>
                  <TableHead>Professeur</TableHead>
                  <TableHead>Étudiants</TableHead>
                  <TableHead>Horaire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">Chargement...</TableCell>
                  </TableRow>
                ) : courses?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">Aucun cours trouvé.</TableCell>
                  </TableRow>
                ) : (
                  courses?.map((course: any) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell>{course.teacher_name}</TableCell>
                      <TableCell>{course.enrollment_count}</TableCell>
                      <TableCell>{course.schedule_summary}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${course.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                        >
                          {course.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {totalCount > 0 ? (
                <>
                  Page {page} of {Math.ceil(totalCount / 10)} ({totalCount} items)
                </>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={!previous || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={!next || isLoading}
            >
              Suivant
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
