"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Plus, Search, Pencil, Trash2 } from "lucide-react"
import { useStudents, createStudent, updateStudent, deleteStudent } from "@/hooks/useStudents"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { StudentDialog } from "@/components/students/student-dialog"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function StudentsPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<any>(null)

  const page = Number(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ""

  const { students, isLoading, next, previous, totalCount, mutate } = useStudents(page, search)

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('search', term)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    replace(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    replace(`${pathname}?${params.toString()}`)
  }

  const handleCreate = async (data: any) => {
    try {
      await createStudent(data)
      toast.success("Student created successfully")
      mutate() // Refresh list
    } catch (error) {
      toast.error("Failed to create student")
      console.error(error)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!selectedStudent) return
    try {
      await updateStudent(selectedStudent.id, data)
      toast.success("Student updated successfully")
      mutate()
    } catch (error) {
      toast.error("Failed to update student")
      console.error(error)
    }
  }

  const handleDelete = async () => {
    if (!studentToDelete) return
    try {
      await deleteStudent(studentToDelete.id)
      toast.success("Student deleted successfully")
      mutate()
    } catch (error) {
      toast.error("Failed to delete student")
      console.error(error)
    } finally {
      setIsDeleteDialogOpen(false)
      setStudentToDelete(null)
    }
  }

  const openCreateDialog = () => {
    setSelectedStudent(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (student: any) => {
    setSelectedStudent(student)
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (student: any) => {
    setStudentToDelete(student)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des étudiants</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel étudiant
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Étudiants</CardTitle>
          <CardDescription>Gérez les profils des étudiants, leurs inscriptions et leurs paiements.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un étudiant..."
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
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cours</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Paiements</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">Chargement...</TableCell>
                  </TableRow>
                ) : students?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">Aucun étudiant trouvé.</TableCell>
                  </TableRow>
                ) : (
                  students?.map((student: any) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.user.first_name} {student.user.last_name}
                      </TableCell>
                      <TableCell>{student.user.email}</TableCell>
                      <TableCell>{student.courses || "Aucun"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${student.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                        >
                          {student.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                          À jour
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(student)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
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

      <StudentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        student={selectedStudent}
        onSubmit={selectedStudent ? handleUpdate : handleCreate}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
