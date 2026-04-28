"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Plus, Search, Pencil, Trash2 } from "lucide-react"
import { useStudents, createStudent, updateStudent, deleteStudent } from "@/hooks/useStudents"
import { useState } from "react"
import { usePageSearch } from "@/hooks/usePageSearch"
import { PageHeader } from "@/components/layout/page-header"
import Link from "next/link"
import { StudentDialog } from "@/components/students/student-dialog"
import { toast } from "sonner"
 import { usePermissions } from "@/hooks/usePermissions"
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

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

function StudentsContent() {
  const t = useTranslations()
  const { hasPermission } = usePermissions()
  const { page, search, setSearch, setPage } = usePageSearch()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<any>(null)

  const { students, isLoading, next, previous, totalCount, mutate } = useStudents(page, search)

  const handleCreate = async (data: any) => {
    try {
      await createStudent(data)
      toast.success(t('students.createSuccess'))
      mutate() // Refresh list
    } catch (error) {
      toast.error(t('students.createError'))
      console.error(error)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!selectedStudent) return
    try {
      await updateStudent(selectedStudent.id, data)
      toast.success(t('students.updateSuccess'))
      mutate()
    } catch (error) {
      toast.error(t('students.updateError'))
      console.error(error)
    }
  }

  const handleDelete = async () => {
    if (!studentToDelete) return
    try {
      await deleteStudent(studentToDelete.id)
      toast.success(t('students.deleteSuccess'))
      mutate()
    } catch (error) {
      toast.error(t('students.deleteError'))
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
      <PageHeader
        title={t('students.title')}
        action={
          hasPermission("users.add_studentprofile") ? (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t('students.addStudent')}
            </Button>
          ) : undefined
        }
      />
      <Card>
        <CardHeader>
          <CardDescription>{t('students.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('students.search')}
                className="h-9"
                defaultValue={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              {t('common.export')}
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('students.fullName')}</TableHead>
                  <TableHead>{t('students.phoneNumber')}</TableHead>
                  <TableHead>{t('students.courses')}</TableHead>
                  <TableHead>{t('students.status')}</TableHead>
                  <TableHead>{t('students.finances')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">{t('common.loading')}</TableCell>
                  </TableRow>
                ) : students?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">{t('students.noStudents')}</TableCell>
                  </TableRow>
                ) : (
                  students?.map((student: any) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/students/${student.id}`} className="hover:underline text-primary">
                          {student.user.first_name} {student.user.last_name}
                        </Link>
                      </TableCell>
                      <TableCell>{student.phone || '-'}</TableCell>
                      <TableCell>{student.courses || t('common.none')}</TableCell>
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
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${student.payment_status === 'PAID'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : student.payment_status === 'OVERDUE'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              : student.payment_status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                        >
                          {student.payment_status === 'PAID'
                            ? t('students.financePaid')
                            : student.payment_status === 'OVERDUE'
                              ? t('students.financeOverdue')
                              : student.payment_status === 'PENDING'
                                ? t('students.financePending')
                                : t('students.financeUnknown')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        {hasPermission("users.change_studentprofile") && (
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission("users.delete_studentprofile") && (
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(student)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
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
                  {t('common.page', { current: page, total: Math.ceil(totalCount / 10) })} ({totalCount} {t('common.items')})
                </>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!previous || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('common.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!next || isLoading}
            >
              {t('common.next')}
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
            <AlertDialogTitle>{t('students.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StudentsPageContent() {
  const t = useTranslations()
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    }>
      <StudentsContent />
    </Suspense>
  )
}

export default function StudentsPage() {
  return <StudentsPageContent />
}
