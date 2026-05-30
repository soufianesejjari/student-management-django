"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"
import { api } from "@/lib/api"
import { PaymentDialog } from "@/components/finances/payment-dialog"
import { useTranslations } from "next-intl"

interface StudentFeesTableProps {
    studentId: number
}

export function StudentFeesTable({ studentId }: StudentFeesTableProps) {
    const t = useTranslations()
    const [fees, setFees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<number | null>(null)

    const fetchFees = async () => {
        try {
            setLoading(true)
            const data = await api.studentFees.list({ student: studentId })
            setFees(Array.isArray(data) ? data : data.results || [])
        } catch (error) {
            console.error("Failed to fetch student fees:", error)
            setFees([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFees()
        const handleRefresh = () => fetchFees()
        window.addEventListener("payment-updated", handleRefresh)
        return () => window.removeEventListener("payment-updated", handleRefresh)
    }, [studentId])

    const markExempt = async (fee: any) => {
        setUpdatingId(fee.id)
        try {
            await api.studentFees.update(fee.id, { status: "EXEMPT" })
            await fetchFees()
            window.dispatchEvent(new Event("payment-updated"))
        } catch (error) {
            console.error("Failed to exempt fee:", error)
        } finally {
            setUpdatingId(null)
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
                        <TableHead>{t('studentFees.type')}</TableHead>
                        <TableHead>{t('studentFees.amount')}</TableHead>
                        <TableHead>{t('studentFees.paid')}</TableHead>
                        <TableHead>{t('studentFees.balance')}</TableHead>
                        <TableHead>{t('studentFees.status')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {fees.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                {t('studentFees.empty')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        fees.map((fee) => {
                            const balance = Number(fee.balance ?? fee.amount ?? 0)
                            return (
                                <TableRow key={fee.id}>
                                    <TableCell className="font-medium">
                                        {fee.fee_type === "REGISTRATION" ? t('students.registrationFee') : t('students.insuranceFee')}
                                    </TableCell>
                                    <TableCell>{Number(fee.amount).toFixed(2)} MAD</TableCell>
                                    <TableCell>{Number(fee.amount_paid || 0).toFixed(2)} MAD</TableCell>
                                    <TableCell>{balance.toFixed(2)} MAD</TableCell>
                                    <TableCell>
                                        <Badge variant={fee.status === "PAID" ? "default" : fee.status === "EXEMPT" ? "secondary" : "outline"}>
                                            {fee.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {fee.status !== "PAID" && fee.status !== "EXEMPT" && balance > 0 && (
                                                <PaymentDialog
                                                    studentId={studentId}
                                                    studentFeeId={fee.id}
                                                    defaultAmount={balance}
                                                    onSuccess={() => {
                                                        fetchFees()
                                                        window.dispatchEvent(new Event("payment-updated"))
                                                    }}
                                                >
                                                    <Button variant="outline" size="sm">
                                                        <CreditCard className="mr-2 h-3 w-3" />
                                                        {t('studentFees.pay')}
                                                    </Button>
                                                </PaymentDialog>
                                            )}
                                            {fee.status !== "PAID" && fee.status !== "EXEMPT" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={updatingId === fee.id}
                                                    onClick={() => markExempt(fee)}
                                                >
                                                    {t('studentFees.exempt')}
                                                </Button>
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
