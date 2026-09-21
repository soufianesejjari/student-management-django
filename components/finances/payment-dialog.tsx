"use client"

import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AsyncSelect } from "@/components/ui/async-select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { useTranslations } from "next-intl"

interface PaymentDialogProps {
    onSuccess?: () => void
    studentId?: number
    subscriptionId?: number | null
    studentFeeId?: number | null
    defaultAmount?: string | number
    /** Existing payment to edit. When set the dialog runs in update mode. */
    payment?: any
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: ReactNode
}

const NO_DUE = "NONE"

type DueOption = {
    value: string
    label: string
    amount: number
}

export function PaymentDialog({
    onSuccess,
    studentId,
    subscriptionId,
    studentFeeId,
    defaultAmount,
    payment,
    open: controlledOpen,
    onOpenChange,
    children,
}: PaymentDialogProps) {
    const t = useTranslations()
    const isEdit = Boolean(payment?.id)
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
    const open = controlledOpen ?? uncontrolledOpen
    const setOpen = onOpenChange ?? setUncontrolledOpen
    const [loading, setLoading] = useState(false)
    const [dueOptions, setDueOptions] = useState<DueOption[]>([])
    const [dueLoading, setDueLoading] = useState(false)

    const currentStudentId = isEdit ? Number(payment.student) : studentId || 0

    const buildInitialState = useCallback(() => {
        if (isEdit) {
            return {
                student: Number(payment.student) || 0,
                amount: payment.amount != null ? String(payment.amount) : "",
                method: payment.method || "CASH",
                date: payment.date || new Date().toISOString().split('T')[0],
                status: payment.status || "PAID",
                notes: payment.notes || "",
                due: payment.subscription
                    ? `subscription:${payment.subscription}`
                    : payment.student_fee
                        ? `student_fee:${payment.student_fee}`
                        : NO_DUE,
            }
        }
        return {
            student: studentId || 0,
            amount: defaultAmount != null ? String(defaultAmount) : "",
            method: "CASH",
            date: new Date().toISOString().split('T')[0],
            status: "PAID",
            notes: "",
            due: subscriptionId
                ? `subscription:${subscriptionId}`
                : studentFeeId
                    ? `student_fee:${studentFeeId}`
                    : NO_DUE,
        }
    }, [isEdit, payment, studentId, defaultAmount, subscriptionId, studentFeeId])

    const [formData, setFormData] = useState(buildInitialState)

    useEffect(() => {
        if (open) {
            setFormData(buildInitialState())
        }
    }, [open, buildInitialState])

    // In edit mode the payment can be re-attached to another open due.
    useEffect(() => {
        if (!open || !isEdit || !currentStudentId) return

        let cancelled = false
        const loadDues = async () => {
            setDueLoading(true)
            try {
                const [subscriptionsResult, feesResult] = await Promise.allSettled([
                    api.subscriptions.list({ student: currentStudentId }),
                    api.studentFees.list({ student: currentStudentId }),
                ])
                const unwrap = (result: PromiseSettledResult<any>) => {
                    if (result.status !== "fulfilled") return []
                    const data = result.value
                    return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
                }

                const options: DueOption[] = []
                for (const subscription of unwrap(subscriptionsResult)) {
                    const value = `subscription:${subscription.id}`
                    if (subscription.payment_status === "CANCELLED" && value !== formData.due) continue
                    options.push({
                        value,
                        label: `${subscription.course_name || t('finances.coursePayment')} · ${subscription.start_date} → ${subscription.end_date}`,
                        amount: Number(subscription.amount || 0),
                    })
                }
                for (const fee of unwrap(feesResult)) {
                    const value = `student_fee:${fee.id}`
                    if (fee.status === "EXEMPT" && value !== formData.due) continue
                    options.push({
                        value,
                        label: fee.fee_type === "REGISTRATION"
                            ? t('students.registrationFee')
                            : t('students.insuranceFee'),
                        amount: Number(fee.amount || 0),
                    })
                }
                if (!cancelled) setDueOptions(options)
            } catch (error) {
                console.error("Failed to load dues:", error)
                if (!cancelled) setDueOptions([])
            } finally {
                if (!cancelled) setDueLoading(false)
            }
        }

        loadDues()
        return () => { cancelled = true }
    }, [open, isEdit, currentStudentId])

    const duePayload = () => {
        if (formData.due === NO_DUE) return { subscription: null, student_fee: null }
        const [kind, id] = formData.due.split(":")
        return kind === "subscription"
            ? { subscription: Number(id), student_fee: null }
            : { subscription: null, student_fee: Number(id) }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.student) {
            toast.error(t('dialogs.payment.selectStudentError'))
            return
        }

        setLoading(true)

        try {
            const body = {
                student: formData.student,
                ...duePayload(),
                amount: parseFloat(formData.amount),
                method: formData.method,
                date: formData.date,
                status: formData.status,
                notes: formData.notes,
            }

            if (isEdit) {
                await api.payments.update(payment.id, body)
                toast.success(t('dialogs.payment.updateSuccess'))
            } else {
                await api.post("/finances/payments/", {
                    ...body,
                    subscription: subscriptionId || body.subscription,
                    student_fee: studentFeeId || body.student_fee,
                })
                toast.success(t('dialogs.payment.success'))
            }

            setOpen(false)
            setFormData(buildInitialState())
            onSuccess?.()
        } catch (error: any) {
            console.error(error)
            const detail = error?.response?.data?.detail || error?.response?.data?.[0]
            toast.error(detail || (isEdit ? t('dialogs.payment.updateError') : t('dialogs.payment.error')))
        } finally {
            setLoading(false)
        }
    }

    const buttonContent = children ? children : studentId ? (
        <Button variant="outline" size="sm">
            {t('dialogs.payment.recordBtn')}
        </Button>
    ) : (
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('dialogs.payment.recordBtn')}
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {controlledOpen === undefined && (
                <DialogTrigger asChild>
                    {buttonContent}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('dialogs.payment.editTitle') : t('dialogs.payment.title')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!studentId && !isEdit && (
                        <div className="space-y-2">
                            <Label htmlFor="student">{t('dialogs.payment.student')} *</Label>
                            <AsyncSelect
                                endpoint="/users/students/"
                                label={t('dialogs.payment.student')}
                                value={formData.student || ""}
                                onChange={(value) => setFormData({ ...formData, student: Number(value) })}
                                renderLabel={(item: any) => {
                                    const first = item.user?.first_name ?? item.first_name ?? ""
                                    const last = item.user?.last_name ?? item.last_name ?? ""
                                    const name = `${first} ${last}`.trim()
                                    return name || item.user?.username || item.username || t('dialogs.payment.student')
                                }}
                                renderValue={(item: any) => item.id}
                                placeholder={t('dialogs.payment.searchStudent')}
                            />
                        </div>
                    )}

                    {isEdit && (
                        <div className="space-y-2">
                            <Label>{t('dialogs.payment.student')}</Label>
                            <div className="rounded-md border px-3 py-2 text-sm">
                                {payment.student_name || payment.student_username || `#${payment.student}`}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">{t('dialogs.payment.amount')}</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">{t('finances.date')}</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="method">{t('finances.method')}</Label>
                            <Select
                                value={formData.method}
                                onValueChange={(value) => setFormData({ ...formData, method: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">{t('dialogs.payment.cash')}</SelectItem>
                                    <SelectItem value="CARD">{t('dialogs.payment.card')}</SelectItem>
                                    <SelectItem value="TRANSFER">{t('dialogs.payment.transfer')}</SelectItem>
                                    <SelectItem value="CHECK">{t('dialogs.payment.check')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">{t('finances.status')}</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PAID">{t('dialogs.payment.paid')}</SelectItem>
                                    <SelectItem value="PENDING">{t('dialogs.payment.pending')}</SelectItem>
                                    <SelectItem value="LATE">{t('dialogs.updatePaymentStatus.late')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {isEdit && (
                        <div className="space-y-2">
                            <Label htmlFor="due">{t('dialogs.payment.applyTo')}</Label>
                            <Select
                                value={formData.due}
                                onValueChange={(value) => setFormData({ ...formData, due: value })}
                                disabled={dueLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_DUE}>{t('dialogs.payment.applyToNone')}</SelectItem>
                                    {dueOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label} — {option.amount.toFixed(2)} MAD
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">{t('dialogs.payment.applyToHint')}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="notes">{t('dialogs.payment.notesOptional')}</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder={t('dialogs.payment.notesPlaceholder')}
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
