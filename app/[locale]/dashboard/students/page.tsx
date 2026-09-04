"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Mail, Plus, Search, Pencil, Trash2 } from "lucide-react"
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
import { api } from "@/lib/api"

function StudentsContent() {
  const t = useTranslations()
  const { hasPermission } = usePermissions()
  const { page, search, setSearch, setPage } = usePageSearch()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isSending, setIsSending] = useState(false)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<any>(null)

  const { students, isLoading, next, previous, totalCount, mutate } = useStudents(page, search)

  const handleCreate = async (data: any) => {
    try {
      await createStudent(data)
      toast.success(t('students.createSuccess'))
      mutate()
    } catch (error) {
      toast.error(t('students.createError'))
      console.error(error)
    }
  }

  const downloadRegistrationForm = async (studentId: number, user?: { first_name?: string, last_name?: string }) => {
    try {
      const response = await api.get(`/users/students/${studentId}/registration-form/`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `fiche-inscription-${user?.last_name || studentId}-${user?.first_name || ''}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      toast.error("La fiche d'inscription n'a pas pu être téléchargée.")
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

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!students) return
    const allIds = students.map((s: any) => s.id)
    const allSelected = allIds.every((id: number) => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(allIds))
  }

  const handleSendSchedules = async (ids?: number[]) => {
    setIsSending(true)
    try {
      const result = await api.notifications.sendStudentSchedules(ids)
      const skipped = result.skipped?.length ?? 0
      if (skipped > 0) {
        toast.success(t('students.scheduleSentPartial', { count: result.queued, skipped }))
      } else {
        toast.success(t('students.scheduleSentSuccess', { count: result.queued }))
      }
      setSelectedIds(new Set())
    } catch {
      toast.error(t('students.scheduleSentError'))
    } finally {
      setIsSending(false)
    }
  }

  const allOnPageSelected = students?.length > 0 && students?.every((s: any) => selectedIds.has(s.id))

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
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('students.search')}
                className="h-9"
                defaultValue={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSending}
                  onClick={() => handleSendSchedules(Array.from(selectedIds))}
                >
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  {t('students.sendSelected', { count: selectedIds.size })}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={isSending}
                onClick={() => handleSendSchedules()}
              >
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {t('students.sendToAll')}
              </Button>
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all on page"
                    />
                  </TableHead>
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
                    <TableCell colSpan={7} className="text-center h-24">{t('common.loading')}</TableCell>
                  </TableRow>
                ) : students?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">{t('students.noStudents')}</TableCell>
                  </TableRow>
                ) : (
                  students?.map((student: any) => (
                    <TableRow key={student.id} data-state={selectedIds.has(student.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(student.id)}
                          onCheckedChange={() => toggleSelect(student.id)}
                          aria-label={`Select ${student.user.first_name}`}
                        />
                      </TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          title={student.registration_form_ready ? t('students.downloadRegistrationForm') : t('students.registrationFormNotReady')}
                          disabled={!student.registration_form_ready}
                          onClick={() => downloadRegistrationForm(student.id, student.user)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
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
                  {t('common.page', { current: page, total: Math.ceil(totalCount / 50) })} ({totalCount} {t('common.items')})
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
