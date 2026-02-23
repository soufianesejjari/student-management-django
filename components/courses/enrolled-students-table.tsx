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
import { MoreHorizontal, Loader2 } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { useTranslations } from "next-intl"

interface EnrolledStudentsTableProps {
    courseId: number
}

export function EnrolledStudentsTable({ courseId }: EnrolledStudentsTableProps) {
    const t = useTranslations()
    const [enrollments, setEnrollments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchEnrollments = async () => {
        try {
            setLoading(true)
            const data = await api.enrollments.list({ course_id: courseId })
            // Handle paginated response or direct array
            setEnrollments(Array.isArray(data) ? data : data.results || [])
        } catch (error) {
            console.error("Failed to fetch enrollments:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEnrollments()

        // Listen for refresh events
        const handleRefresh = () => fetchEnrollments()
        window.addEventListener('enrollment-updated', handleRefresh)
        return () => window.removeEventListener('enrollment-updated', handleRefresh)
    }, [courseId])

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
                        <TableHead>{t('students.name')}</TableHead>
                        <TableHead>{t('enrolledCourses.enrolledDate')}</TableHead>
                        <TableHead>{t('enrolledCourses.status')}</TableHead>
                        <TableHead>{t('enrolledCourses.price')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {enrollments.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                {t('enrolledCourses.notEnrolled')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        enrollments.map((enrollment) => (
                            <TableRow key={enrollment.id}>
                                <TableCell className="font-medium">
                                    {enrollment.student_name}
                                    {enrollment.is_promotional && (
                                        <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800 hover:bg-green-100">
                                            Promo
                                        </Badge>
                                    )}
                                </TableCell>
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
                                    {enrollment.custom_price !== enrollment.default_price && (
                                        <span className="ml-2 text-xs text-muted-foreground line-through">
                                            {enrollment.default_price} MAD
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(enrollment.id.toString())}>
                                                {t('enrolledCourses.copyId')}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem>{t('enrolledCourses.viewStudent')}</DropdownMenuItem>
                                            <DropdownMenuItem>{t('enrolledCourses.suspend')}</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">{t('enrolledCourses.cancel')}</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
