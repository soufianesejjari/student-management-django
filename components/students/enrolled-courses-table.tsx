"use client"

import { useEffect, useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, PlusCircle, CreditCard } from "lucide-react"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { useTranslations } from "next-intl"

interface EnrolledCoursesTableProps {
    studentId: number
}

export function EnrolledCoursesTable({ studentId }: EnrolledCoursesTableProps) {
    const t = useTranslations()
    const [enrollments, setEnrollments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchEnrollments = async () => {
        try {
            setLoading(true)
            const data = await api.enrollments.list({ student_id: studentId })
            // Handle both paginated and non-paginated responses
            if (Array.isArray(data)) {
                setEnrollments(data)
            } else if (data.results && Array.isArray(data.results)) {
                setEnrollments(data.results)
            } else {
                setEnrollments([])
            }
        } catch (error) {
            console.error("Failed to fetch enrollments:", error)
            setEnrollments([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEnrollments()
    }, [studentId])

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('enrolledCourses.course')}</TableHead>
                        <TableHead>{t('enrolledCourses.subject')}</TableHead>
                        <TableHead>{t('enrolledCourses.enrolledDate')}</TableHead>
                        <TableHead>{t('enrolledCourses.status')}</TableHead>
                        <TableHead>{t('enrolledCourses.price')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {enrollments.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                {t('enrolledCourses.notEnrolled')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        enrollments.map((enrollment) => (
                            <TableRow key={enrollment.id}>
                                <TableCell className="font-medium">
                                    {enrollment.course_name}
                                </TableCell>
                                <TableCell>{enrollment.course_subject}</TableCell>
                                <TableCell>
                                    {format(new Date(enrollment.enrolled_at), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={enrollment.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                        {enrollment.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {enrollment.custom_price} MAD
                                    {enrollment.is_promotional && (
                                        <Badge variant="outline" className="ml-2 text-xs border-green-500 text-green-600">
                                            {t('enrolledCourses.promo')}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {/* Add Payment Button logic later */}
                                    {enrollment.status === 'ACTIVE' && (
                                        <Button variant="outline" size="sm">
                                            <CreditCard className="mr-2 h-3 w-3" />
                                            {t('enrolledCourses.paySubscription')}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
