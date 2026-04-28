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
import { Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { useTranslations } from "next-intl"

interface PaymentsTableProps {
    studentId: number
}

export function PaymentsTable({ studentId }: PaymentsTableProps) {
    const t = useTranslations()
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchPayments = async () => {
        try {
            setLoading(true)
            const data = await api.payments.list({ student_id: studentId })
            // Handle both paginated and non-paginated responses
            if (Array.isArray(data)) {
                setPayments(data)
            } else if (data.results && Array.isArray(data.results)) {
                setPayments(data.results)
            } else {
                setPayments([])
            }
        } catch (error) {
            console.error("Failed to fetch payments:", error)
            setPayments([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPayments()

        const handleRefresh = () => fetchPayments()
        window.addEventListener("payment-updated", handleRefresh)
        return () => window.removeEventListener("payment-updated", handleRefresh)
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
                        <TableHead>{t('paymentsTable.ref')}</TableHead>
                        <TableHead>{t('paymentsTable.date')}</TableHead>
                        <TableHead>{t('paymentsTable.amount')}</TableHead>
                        <TableHead>{t('paymentsTable.method')}</TableHead>
                        <TableHead>{t('paymentsTable.status')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                {t('paymentsTable.noPayments')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        payments.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell className="font-mono text-xs">
                                    {payment.invoice_ref}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(payment.date), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {payment.amount} MAD
                                </TableCell>
                                <TableCell>
                                    {payment.method}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={payment.status === 'PAID' ? 'default' : 'secondary'}>
                                        {payment.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
