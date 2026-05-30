"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Mail, Phone, Calendar, Music, FileDown } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { EnrolledCoursesTable } from "@/components/students/enrolled-courses-table"
import { PaymentsTable } from "@/components/students/payments-table"
import { StudentFeesTable } from "@/components/students/student-fees-table"
import { EnrollCourseDialog } from "@/components/students/enroll-course-dialog"
import { format } from "date-fns"
import { useTranslations } from "next-intl"

export default function StudentDetailPage() {
    const params = useParams()
    const t = useTranslations()

    const [student, setStudent] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [openAddCourseDialog, setOpenAddCourseDialog] = useState(false)

    const fetchStudent = async () => {
        try {
            setLoading(true)
            const data = await api.students.get(params.id as string)
            setStudent(data)
        } catch (error) {
            console.error("Failed to fetch student:", error)
            toast.error(t('students.failedLoad'))
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadSchedule = async () => {
        try {
            const response = await api.get(`/planning/student/${params.id}/schedule-pdf/`, {
                responseType: 'blob'
            })
            
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `student_schedule_${student?.user?.username || params.id}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            toast.success(t('students.scheduleDownloaded'))
        } catch (error) {
            console.error(error)
            toast.error(t('students.scheduleFailed'))
        }
    }

    useEffect(() => {
        if (params.id) {
            fetchStudent()
        }
    }, [params.id])

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!student) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">{t('students.notFound')}</p>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {student.user?.first_name || student.first_name} {student.user?.last_name || student.last_name}
                    </h2>
                    <div className="flex items-center space-x-4 text-muted-foreground text-sm mt-1">
                        {(student.user?.email || student.email) && <div className="flex items-center"><Mail className="mr-1 h-3 w-3" /> {student.user?.email || student.email}</div>}
                        {student.phone && <div className="flex items-center"><Phone className="mr-1 h-3 w-3" /> {student.phone}</div>}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={handleDownloadSchedule}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {t('students.downloadSchedule')}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('students.joined')}</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {student.enrollment_date ? format(new Date(student.enrollment_date), "MMM yyyy") : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground">{t('students.registrationDate')}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="courses" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="courses">{t('students.coursesSubscriptions')}</TabsTrigger>
                    <TabsTrigger value="fees">{t('students.studentFees')}</TabsTrigger>
                    <TabsTrigger value="payments">{t('students.paymentsHistory')}</TabsTrigger>
                </TabsList>
                <TabsContent value="courses" className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => setOpenAddCourseDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" /> {t('students.enrollInCourse')}
                        </Button>
                    </div>
                    <EnrolledCoursesTable studentId={student.id} />
                </TabsContent>
                <TabsContent value="payments" className="space-y-4">
                    <PaymentsTable studentId={student.id} />
                </TabsContent>
                <TabsContent value="fees" className="space-y-4">
                    <StudentFeesTable studentId={student.id} />
                </TabsContent>
            </Tabs>

            <EnrollCourseDialog
                open={openAddCourseDialog}
                onOpenChange={setOpenAddCourseDialog}
                studentId={student.id}
                onSuccess={() => {
                    fetchStudent()
                    window.dispatchEvent(new Event('enrollment-updated'))
                }}
            />
        </div>
    )
}
