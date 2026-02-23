"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react"
import { useCourses } from "@/hooks/useCourses"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { CourseDialog } from "@/components/courses/course-dialog"
import api from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { useTranslations } from "next-intl"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"

function CoursesContent() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const page = Number(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ""

  const { courses, isLoading, next, previous, totalCount, mutate } = useCourses(page, search)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<any>(null)

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

  const handleOpenDialog = (course?: any) => {
    setSelectedCourse(course)
    setIsDialogOpen(true)
  }

  const handleCourseSubmit = async (data: any) => {
    try {
      let courseId;
      if (selectedCourse) {
        // Edit 
        await api.put(`/academics/courses/${selectedCourse.id}/`, data)
        toast.success(t('courses.updateSuccess'))
      } else {
        // Create
        // 1. Create Course
        const courseRes = await api.post("/academics/courses/", {
          name: data.name,
          subject: data.subject,
          default_teacher: data.default_teacher,
          level: data.level,
          price: data.price,
          status: data.status
        })
        courseId = courseRes.data.id;
        toast.success(t('courses.createSuccess'))

        // 2. Create Schedule (if requested)
        if (data.create_schedule) {
          try {
            // Determine start date (e.g. Next occurrence of that day)
            // For simplicity, let's just use Today/Tomorrow logic or a default
            // Ideally we should ask for start_date in the form too, but let's assume "Next applicable day" logic 
            // in a real app, but for now we'll send a fixed date or today. 
            // However, backend requires start_date.

            // Let's default start_date to "Next occurrence of Day X"
            // ...Simpler: Default to today.
            const today = new Date();

            await api.post("/planning/sessions/", {
              course: courseId,
              teacher: data.default_teacher, // Use course teacher
              room: data.room,
              day_of_week: parseInt(data.day_of_week),
              start_time: data.start_time,
              end_time: data.end_time,
              start_date: format(today, "yyyy-MM-dd"), // Default to starting now
              end_date: null // Indefinite
            })
            toast.success(t('courses.scheduleCreated'))
          } catch (scheduleError: any) {
            console.error(scheduleError)
            toast.warning(t('courses.scheduleWarning'))
          }
        }
      }
      mutate()
      setIsDialogOpen(false)
    } catch (error) {
      console.error(error)
      toast.error(t('common.error'))
    }
  }

  return (
    <div className="flex flex-col gap-4" suppressHydrationWarning>
      <div className="flex items-center justify-between" suppressHydrationWarning>
        <h1 className="text-3xl font-bold tracking-tight">{t('courses.title')}</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('courses.addCourse')}
        </Button>
      </div>

      <CourseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        course={selectedCourse}
        onSubmit={handleCourseSubmit}
      />

      <Card suppressHydrationWarning>
        <CardHeader>
          <CardTitle>{t('courses.title')}</CardTitle>
          <CardDescription>{t('courses.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('courses.search')}
                className="h-9"
                defaultValue={search}
                onChange={(e) => {
                  handleSearch(e.target.value)
                }}
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
                  <TableHead>{t('courses.name')}</TableHead>
                  <TableHead>{t('courses.teacher')}</TableHead>
                  <TableHead>{t('courses.enrolledStudents')}</TableHead>
                  <TableHead>{t('schedule.title')}</TableHead>
                  <TableHead>{t('courses.price')}</TableHead>
                  <TableHead>{t('courses.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">{t('common.loading')}</TableCell>
                  </TableRow>
                ) : courses?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">{t('courses.noCourses')}</TableCell>
                  </TableRow>
                ) : (
                  courses?.map((course: any) => {
                    if (!course) return null;
                    return (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">
                          <Link href={`/dashboard/courses/${course.id}`} className="hover:underline text-primary">
                            {course?.name}
                          </Link>
                        </TableCell>
                        <TableCell>{course?.teacher_name || "-"}</TableCell>
                        <TableCell>{course?.enrollment_count || 0}</TableCell>
                        <TableCell>{course?.schedule_summary || t('courses.notScheduled')}</TableCell>
                        <TableCell>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(course?.price || 0)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${course?.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                          >
                            {course?.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(course)}>
                            {t('common.details')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
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
              onClick={() => handlePageChange(page - 1)}
              disabled={!previous || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('common.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={!next || isLoading}
            >
              {t('common.next')}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CoursesPageContent() {
  const t = useTranslations()
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    }>
      <CoursesContent />
    </Suspense>
  )
}

export default function CoursesPage() {
  return <CoursesPageContent />
}
