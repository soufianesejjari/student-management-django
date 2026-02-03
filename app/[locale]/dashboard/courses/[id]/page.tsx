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

export default function CourseDetailPage() {
    const params = useParams()

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
            toast.error("Failed to load course details")
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
                <p className="text-muted-foreground">Course not found</p>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{course.name}</h2>
                    <p className="text-muted-foreground">
                        {course.subject_name} • {course.level} • {course.teacher_name || "No Teacher"}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => setOpenEnrollDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Enroll Student
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Price</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{course.price} MAD</div>
                        <p className="text-xs text-muted-foreground">Per month (default)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Enrollments</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{course.enrollment_count}</div>
                        <p className="text-xs text-muted-foreground">Active students</p>
                    </CardContent>
                </Card>
                {/* We can add more stats here */}
            </div>

            <Tabs defaultValue="students" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="students">Enrolled Students</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
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
