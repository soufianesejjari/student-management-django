"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Plus, Search, Pencil, Trash2, Eye } from "lucide-react"
import { useTeachers, createTeacher, updateTeacher, deleteTeacher } from "@/hooks/useTeachers"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { TeacherDialog } from "@/components/teachers/teacher-dialog"
import { toast } from "sonner"
import Link from "next/link"
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

export default function TeachersPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<any>(null)

  const page = Number(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ""

  const { teachers, isLoading, next, previous, totalCount, mutate } = useTeachers(page, search)

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

  const handleCreate = async (data: any) => {
    try {
      await createTeacher(data)
      toast.success("Teacher created successfully")
      mutate() // Refresh list
    } catch (error) {
      toast.error("Failed to create teacher")
      console.error(error)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!selectedTeacher) return
    try {
      await updateTeacher(selectedTeacher.id, data)
      toast.success("Teacher updated successfully")
      mutate()
    } catch (error) {
      toast.error("Failed to update teacher")
      console.error(error)
    }
  }

  const handleDelete = async () => {
    if (!teacherToDelete) return
    try {
      await deleteTeacher(teacherToDelete.id)
      toast.success("Teacher deleted successfully")
      mutate()
    } catch (error) {
      toast.error("Failed to delete teacher")
      console.error(error)
    } finally {
      setIsDeleteDialogOpen(false)
      setTeacherToDelete(null)
    }
  }

  const openCreateDialog = () => {
    setSelectedTeacher(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (teacher: any) => {
    setSelectedTeacher(teacher)
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (teacher: any) => {
    setTeacherToDelete(teacher)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des professeurs</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau professeur
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Professeurs</CardTitle>
          <CardDescription>Gérez les profils des professeurs, leurs spécialités et leurs plannings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un professeur..."
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
                  <TableHead>Spécialité</TableHead>
                  <TableHead>Étudiants</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">Chargement...</TableCell>
                  </TableRow>
                ) : teachers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">Aucun professeur trouvé.</TableCell>
                  </TableRow>
                ) : (
                  teachers?.map((teacher: any) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        {teacher.user.first_name} {teacher.user.last_name}
                      </TableCell>
                      <TableCell>{teacher.user.email}</TableCell>
                      <TableCell>{teacher.speciality}</TableCell>
                      <TableCell>{teacher.student_count}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${teacher.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            }`}
                        >
                          {teacher.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        <Link href={`/dashboard/teachers/${teacher.id}`}>
                          <Button variant="ghost" size="icon" title="View Profile">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(teacher)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(teacher)}>
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

      <TeacherDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        teacher={selectedTeacher}
        onSubmit={selectedTeacher ? handleUpdate : handleCreate}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the teacher account.
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
