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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    const [updatingPlanId, setUpdatingPlanId] = useState<number | null>(null)

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
                const isUnpaid = subscription.payment_status !== "PAID" && subscription.payment_status !== "CANCELLED"
                const currentIsUnpaid = current && current.payment_status !== "PAID" && current.payment_status !== "CANCELLED"
                const shouldReplace =
                    !current ||
                    (isUnpaid && !currentIsUnpaid) ||
                    (isUnpaid && currentIsUnpaid && new Date(subscription.start_date) < new Date(current.start_date)) ||
                    (!isUnpaid && !currentIsUnpaid && new Date(subscription.start_date) > new Date(current.start_date))

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

    const updateBillingPlan = async (enrollmentId: number, billingPlan: string) => {
        setUpdatingPlanId(enrollmentId)
        try {
            await api.enrollments.update(enrollmentId, { billing_plan: billingPlan })
            await fetchEnrollments()
        } catch (error) {
            console.error("Failed to update billing plan:", error)
        } finally {
            setUpdatingPlanId(null)
        }
    }

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
                            const amount = subscription?.balance ?? subscription?.amount ?? enrollment.custom_price
                            const periodLabel = subscription
                                ? `${format(new Date(subscription.start_date), "MMM d")} - ${format(new Date(subscription.end_date), "MMM d, yyyy")}`
                                : t('enrolledCourses.noSubscription')

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
                                        <div className="flex flex-col items-start gap-1">
                                            <Badge variant={enrollment.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                {enrollment.status}
                                            </Badge>
                                            {subscription && (
                                                <Badge variant={subscription.payment_status === 'PAID' ? 'secondary' : 'outline'}>
                                                    {subscription.payment_status}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div>{Number(enrollment.custom_price).toFixed(2)} MAD / {t('enrolledCourses.month')}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {t('enrolledCourses.currentPeriod')}: {periodLabel}
                                            </div>
                                            {subscription && (
                                                <div className="text-xs text-muted-foreground">
                                                    {t('enrolledCourses.periodAmount')}: {Number(subscription.amount).toFixed(2)} MAD
                                                </div>
                                            )}
                                        </div>
                                        {enrollment.is_promotional && (
                                            <Badge variant="outline" className="ml-2 text-xs border-green-500 text-green-600">
                                                {t('enrolledCourses.promo')}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end gap-2">
                                            <Select
                                                value={enrollment.billing_plan || "MONTHLY"}
                                                onValueChange={(value) => updateBillingPlan(Number(enrollment.id), value)}
                                                disabled={updatingPlanId === Number(enrollment.id)}
                                            >
                                                <SelectTrigger className="h-8 w-[130px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MONTHLY">{t('dialogs.enrollStudent.monthly')}</SelectItem>
                                                    <SelectItem value="QUARTERLY">{t('dialogs.enrollStudent.quarterly')}</SelectItem>
                                                </SelectContent>
                                            </Select>
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
                                                    <Button variant="outline" size="sm" disabled={!subscription || Number(amount) <= 0}>
                                                        <CreditCard className="mr-2 h-3 w-3" />
                                                        {t('enrolledCourses.paySubscription')}
                                                    </Button>
                                                </PaymentDialog>
                                            )}
                                        </div>
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
