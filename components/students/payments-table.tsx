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
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { usePermissions } from "@/hooks/usePermissions"
import { PaymentDialog } from "@/components/finances/payment-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PaymentsTableProps {
    studentId: number
}

export function PaymentsTable({ studentId }: PaymentsTableProps) {
    const t = useTranslations()
    const { hasPermission } = usePermissions()
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editingPayment, setEditingPayment] = useState<any | null>(null)
    const [deletingPayment, setDeletingPayment] = useState<any | null>(null)
    const [deleting, setDeleting] = useState(false)

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

    const refreshAll = () => {
        fetchPayments()
        window.dispatchEvent(new Event("payment-updated"))
        window.dispatchEvent(new Event("enrollment-updated"))
    }

    const deletePayment = async () => {
        if (!deletingPayment) return
        setDeleting(true)
        try {
            await api.payments.remove(deletingPayment.id)
            toast.success(t('paymentsTable.deleteSuccess'))
            setDeletingPayment(null)
            refreshAll()
        } catch (error: any) {
            console.error("Failed to delete payment:", error)
            toast.error(error?.response?.data?.detail || t('paymentsTable.deleteError'))
        } finally {
            setDeleting(false)
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
        <>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('paymentsTable.ref')}</TableHead>
                        <TableHead>{t('paymentsTable.date')}</TableHead>
                        <TableHead>{t('paymentsTable.amount')}</TableHead>
                        <TableHead>{t('paymentsTable.method')}</TableHead>
                        <TableHead>{t('paymentsTable.status')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
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
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {hasPermission("finances.change_payment") && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={t('dialogs.payment.editTitle')}
                                                onClick={() => setEditingPayment(payment)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {hasPermission("finances.delete_payment") && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={t('paymentsTable.deleteTitle')}
                                                onClick={() => setDeletingPayment(payment)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
        <PaymentDialog
            payment={editingPayment}
            open={Boolean(editingPayment)}
            onOpenChange={(open) => !open && setEditingPayment(null)}
            onSuccess={() => { setEditingPayment(null); refreshAll() }}
        />
        <AlertDialog open={Boolean(deletingPayment)} onOpenChange={(open) => !open && setDeletingPayment(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('paymentsTable.deleteTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('paymentsTable.deleteDescription', {
                            amount: deletingPayment?.amount ?? '',
                            date: deletingPayment?.date ?? '',
                        })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(event) => { event.preventDefault(); deletePayment() }}
                        disabled={deleting}
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        {deleting ? t('common.loading') : t('common.delete')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    )
}
