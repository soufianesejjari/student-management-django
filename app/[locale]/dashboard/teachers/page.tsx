"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarCheck, ChevronLeft, ChevronRight, Mail, Plus, Search, Pencil, Trash2, Eye, Loader2 } from "lucide-react"
import { useTeachers, createTeacher, updateTeacher, deleteTeacher } from "@/hooks/useTeachers"
import { validateMonthlyTeacherPayrolls } from "@/hooks/useTeacherSessions"
import { useState } from "react"
import { usePageSearch } from "@/hooks/usePageSearch"
import { PageHeader } from "@/components/layout/page-header"
import { TeacherDialog } from "@/components/teachers/teacher-dialog"
import { toast } from "sonner"
import Link from "next/link"
import { useTranslations } from "next-intl"
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
import { api } from "@/lib/api"

export default function TeachersPage() {
  const t = useTranslations()
  const { page, search, setSearch, setPage } = usePageSearch()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)
  const [payrollBatchLoading, setPayrollBatchLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isSending, setIsSending] = useState(false)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<any>(null)

  const { teachers, isLoading, next, previous, totalCount, mutate } = useTeachers(page, search)

  const handleCreate = async (data: any) => {
    try {
      await createTeacher(data)
      toast.success(t('teachers.createSuccess'))
      mutate()
    } catch (error) {
      toast.error(t('teachers.createError'))
      console.error(error)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!selectedTeacher) return
    try {
      await updateTeacher(selectedTeacher.id, data)
      toast.success(t('teachers.updateSuccess'))
      mutate()
    } catch (error) {
      toast.error(t('teachers.updateError'))
      console.error(error)
    }
  }

  const handleDelete = async () => {
    if (!teacherToDelete) return
    try {
      await deleteTeacher(teacherToDelete.id)
      toast.success(t('teachers.deleteSuccess'))
      mutate()
    } catch (error) {
      toast.error(t('teachers.deleteError'))
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

  const handleValidateMonthlyPayrolls = async () => {
    const now = new Date()
    if (now.getDate() < 28) {
      const confirmed = window.confirm(t('teachers.beforeValidationDayConfirm', { day: 28 }))
      if (!confirmed) return
    }

    setPayrollBatchLoading(true)
    try {
      const response = await validateMonthlyTeacherPayrolls(now.getFullYear(), now.getMonth() + 1)
      const data = response.data
      toast.success(t('teachers.batchPayrollSuccess', { count: data.validated_count || 0 }))
    } catch (error) {
      console.error(error)
      toast.error(t('teachers.batchPayrollFailed'))
    } finally {
      setPayrollBatchLoading(false)
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!teachers) return
    const allIds = teachers.map((t: any) => t.id)
    const allSelected = allIds.every((id: number) => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(allIds))
  }

  const handleSendSchedules = async (ids?: number[]) => {
    setIsSending(true)
    try {
      const result = await api.notifications.sendTeacherSchedules(ids)
      const skipped = result.skipped?.length ?? 0
      if (skipped > 0) {
        toast.success(t('teachers.scheduleSentPartial', { count: result.queued, skipped }))
      } else {
        toast.success(t('teachers.scheduleSentSuccess', { count: result.queued }))
      }
      setSelectedIds(new Set())
    } catch {
      toast.error(t('teachers.scheduleSentError'))
    } finally {
      setIsSending(false)
    }
  }

  const allOnPageSelected = teachers?.length > 0 && teachers?.every((t: any) => selectedIds.has(t.id))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('teachers.title')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleValidateMonthlyPayrolls} disabled={payrollBatchLoading}>
              {payrollBatchLoading ? <CalendarCheck className="mr-2 h-4 w-4 animate-pulse" /> : <CalendarCheck className="mr-2 h-4 w-4" />}
              {t('teachers.generateMonthlyPayrolls')}
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t('teachers.addTeacher')}
            </Button>
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardDescription>{t('teachers.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('teachers.search')}
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
                  {t('teachers.sendSelected', { count: selectedIds.size })}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={isSending}
                onClick={() => handleSendSchedules()}
              >
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {t('teachers.sendToAll')}
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
                  <TableHead>{t('teachers.name')}</TableHead>
                  <TableHead>{t('teachers.email')}</TableHead>
                  <TableHead>{t('teachers.specialty')}</TableHead>
                  <TableHead>{t('teachers.students')}</TableHead>
                  <TableHead>{t('teachers.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">{t('common.loading')}</TableCell>
                  </TableRow>
                ) : teachers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">{t('teachers.noTeachers')}</TableCell>
                  </TableRow>
                ) : (
                  teachers?.map((teacher: any) => (
                    <TableRow key={teacher.id} data-state={selectedIds.has(teacher.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(teacher.id)}
                          onCheckedChange={() => toggleSelect(teacher.id)}
                          aria-label={`Select ${teacher.user.first_name}`}
                        />
                      </TableCell>
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
                          <Button variant="ghost" size="icon" title={t('teachers.view')}>
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

      <TeacherDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        teacher={selectedTeacher}
        onSubmit={selectedTeacher ? handleUpdate : handleCreate}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('teachers.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('teachers.deleteConfirmDescription')}
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
