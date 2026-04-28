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
import { Loader2, CreditCard } from "lucide-react"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { useTranslations } from "next-intl"
import { PaymentDialog } from "@/components/finances/payment-dialog"

interface EnrolledCoursesTableProps {
    studentId: number
}

export function EnrolledCoursesTable({ studentId }: EnrolledCoursesTableProps) {
    const t = useTranslations()
    const [enrollments, setEnrollments] = useState<any[]>([])
    const [subscriptionsByEnrollment, setSubscriptionsByEnrollment] = useState<Record<number, any>>({})
    const [loading, setLoading] = useState(true)

    const fetchEnrollments = async () => {
        try {
            setLoading(true)
            const [enrollmentsResult, subscriptionsResult] = await Promise.allSettled([
                api.enrollments.list({ student_id: studentId }),
                api.subscriptions.list({ student: studentId }),
            ])
            const data = enrollmentsResult.status === "fulfilled" ? enrollmentsResult.value : []
            const subscriptionsData = subscriptionsResult.status === "fulfilled" ? subscriptionsResult.value : []

            if (enrollmentsResult.status === "rejected") {
                throw enrollmentsResult.reason
            }
            // Handle both paginated and non-paginated responses
            const nextEnrollments = Array.isArray(data)
                ? data
                : data.results && Array.isArray(data.results)
                    ? data.results
                    : []

            if (Array.isArray(data)) {
                setEnrollments(nextEnrollments)
            } else if (data.results && Array.isArray(data.results)) {
                setEnrollments(nextEnrollments)
            } else {
                setEnrollments([])
            }

            const subscriptions = Array.isArray(subscriptionsData)
                ? subscriptionsData
                : subscriptionsData.results && Array.isArray(subscriptionsData.results)
                    ? subscriptionsData.results
                    : []

            const nextSubscriptionsByEnrollment = subscriptions.reduce((acc: Record<number, any>, subscription: any) => {
                const enrollmentId = Number(subscription.enrollment)
                if (!enrollmentId) return acc

                const current = acc[enrollmentId]
                const shouldReplace =
                    !current ||
                    (current.payment_status !== "PENDING" && subscription.payment_status === "PENDING") ||
                    new Date(subscription.start_date) > new Date(current.start_date)

                if (shouldReplace) {
                    acc[enrollmentId] = subscription
                }

                return acc
            }, {})

            setSubscriptionsByEnrollment(nextSubscriptionsByEnrollment)
        } catch (error) {
            console.error("Failed to fetch enrollments:", error)
            setEnrollments([])
            setSubscriptionsByEnrollment({})
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEnrollments()

        const handleRefresh = () => fetchEnrollments()
        window.addEventListener("enrollment-updated", handleRefresh)
        return () => window.removeEventListener("enrollment-updated", handleRefresh)
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
                        enrollments.map((enrollment) => {
                            const subscription = subscriptionsByEnrollment[Number(enrollment.id)]
                            const amount = subscription?.amount ?? enrollment.custom_price

                            return (
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
                                        {enrollment.status === 'ACTIVE' && (
                                            <PaymentDialog
                                                studentId={studentId}
                                                subscriptionId={subscription?.id}
                                                defaultAmount={amount}
                                                onSuccess={() => {
                                                    fetchEnrollments()
                                                    window.dispatchEvent(new Event("payment-updated"))
                                                }}
                                            >
                                                <Button variant="outline" size="sm">
                                                    <CreditCard className="mr-2 h-3 w-3" />
                                                    {t('enrolledCourses.paySubscription')}
                                                </Button>
                                            </PaymentDialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
