"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Mail, Phone, Calendar, Music } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { EnrolledCoursesTable } from "@/components/students/enrolled-courses-table"
import { PaymentsTable } from "@/components/students/payments-table"
import { format } from "date-fns"

export default function StudentDetailPage() {
    const params = useParams()

    const [student, setStudent] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [openAddCourseDialog, setOpenAddCourseDialog] = useState(false)
    const [openPaymentDialog, setOpenPaymentDialog] = useState(false)

    const fetchStudent = async () => {
        try {
            setLoading(true)
            const data = await api.students.get(params.id as string)
            setStudent(data)
        } catch (error) {
            console.error("Failed to fetch student:", error)
            toast.error("Failed to load student details")
        } finally {
            setLoading(false)
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
                <p className="text-muted-foreground">Student not found</p>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{student.first_name} {student.last_name}</h2>
                    <div className="flex items-center space-x-4 text-muted-foreground text-sm mt-1">
                        {student.email && <div className="flex items-center"><Mail className="mr-1 h-3 w-3" /> {student.email}</div>}
                        {student.phone && <div className="flex items-center"><Phone className="mr-1 h-3 w-3" /> {student.phone}</div>}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {/* Actions like Edit Profile could go here */}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Joined</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{student.date_joined ? format(new Date(student.date_joined), "MMM yyyy") : "N/A"}</div>
                        <p className="text-xs text-muted-foreground">Registration Date</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="courses" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="courses">Courses & Subscriptions</TabsTrigger>
                    <TabsTrigger value="payments">Payments History</TabsTrigger>
                </TabsList>
                <TabsContent value="courses" className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => setOpenAddCourseDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Enroll in Course
                        </Button>
                    </div>
                    <EnrolledCoursesTable studentId={student.id} />
                </TabsContent>
                <TabsContent value="payments" className="space-y-4">
                    <PaymentsTable studentId={student.id} />
                </TabsContent>
            </Tabs>

            {/* Dialogs will be added here */}
        </div>
    )
}
