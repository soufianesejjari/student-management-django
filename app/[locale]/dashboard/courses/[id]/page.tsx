"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Users, Calendar, Banknote } from "lucide-react"
import { EnrolledStudentsTable } from "@/components/courses/enrolled-students-table"
import { AddStudentToCourseDialog } from "@/components/courses/add-student-dialog"
import { CourseSchedule } from "@/components/courses/course-schedule"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useTranslations } from "next-intl"

export default function CourseDetailPage() {
    const params = useParams()
    const t = useTranslations()

    const [course, setCourse] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [openEnrollDialog, setOpenEnrollDialog] = useState(false)

    const fetchCourse = async () => {
        try {
            setLoading(true)
            const data = await api.courses.get(params.id as string)
            setCourse(data)
        } catch (error) {
            console.error("Failed to fetch course:", error)
            toast.error(t('courses.failedLoad'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (params.id) {
            fetchCourse()
        }
    }, [params.id])

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!course) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">{t('courses.notFound')}</p>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{course.name}</h2>
                    <p className="text-muted-foreground">
                        {course.subject_name} • {course.level} • {course.teacher_name || t('courses.noTeacher')}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => setOpenEnrollDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" /> {t('courses.addStudent')}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('courses.price')}</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{course.price} MAD</div>
                        <p className="text-xs text-muted-foreground">{t('courses.perMonthDefault')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('courses.enrollments')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{course.enrollment_count}</div>
                        <p className="text-xs text-muted-foreground">{t('courses.activeStudents')}</p>
                    </CardContent>
                </Card>
                {/* We can add more stats here */}
            </div>

            <Tabs defaultValue="students" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="students">{t('courses.enrolledStudents')}</TabsTrigger>
                    <TabsTrigger value="schedule">{t('courses.courseSchedule')}</TabsTrigger>
                </TabsList>
                <TabsContent value="students" className="space-y-4">
                    <EnrolledStudentsTable courseId={course.id} />
                </TabsContent>
                <TabsContent value="schedule" className="space-y-4">
                    <CourseSchedule courseId={course.id} />
                </TabsContent>
            </Tabs>

            <AddStudentToCourseDialog
                open={openEnrollDialog}
                onOpenChange={setOpenEnrollDialog}
                course={course}
                onSuccess={() => {
                    fetchCourse()
                    // Start a refresh event/trigger for the table if needed
                    window.dispatchEvent(new Event('enrollment-updated'))
                }}
            />
        </div>
    )
}
