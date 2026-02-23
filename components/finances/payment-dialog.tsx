"use client"

import { useState } from "react"
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
}

export function PaymentDialog({ onSuccess, studentId }: PaymentDialogProps) {
    const t = useTranslations()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        student: studentId || 0,
        amount: "",
        method: "CASH",
        date: new Date().toISOString().split('T')[0],
        status: "PAID",
        notes: ""
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!formData.student) {
            toast.error(t('dialogs.payment.selectStudentError'))
            return
        }
        
        setLoading(true)

        try {
            await api.post("/finances/payments/", {
                student: formData.student,
                amount: parseFloat(formData.amount),
                method: formData.method,
                date: formData.date,
                status: formData.status,
                notes: formData.notes
            })

            toast.success(t('dialogs.payment.success'))
            setOpen(false)
            setFormData({
                student: studentId || 0,
                amount: "",
                method: "CASH",
                date: new Date().toISOString().split('T')[0],
                status: "PAID",
                notes: ""
            })
            onSuccess?.()
        } catch (error) {
            console.error(error)
            toast.error(t('dialogs.payment.error'))
        } finally {
            setLoading(false)
        }
    }

    const buttonContent = studentId ? (
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
            <DialogTrigger asChild>
                {buttonContent}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('dialogs.payment.title')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!studentId && (
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
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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
