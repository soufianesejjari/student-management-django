"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Loader2 } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { useTranslations } from "next-intl"

interface UpdatePaymentStatusDialogProps {
    paymentId: number
    currentStatus: string
    onSuccess?: () => void
}

export function UpdatePaymentStatusDialog({ paymentId, currentStatus, onSuccess }: UpdatePaymentStatusDialogProps) {
    const t = useTranslations()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState(currentStatus)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await api.patch(`/finances/payments/${paymentId}/`, {
                status: status
            })

            toast.success(t('dialogs.updatePaymentStatus.success'))
            setOpen(false)
            onSuccess?.()
        } catch (error) {
            console.error(error)
            toast.error(t('dialogs.updatePaymentStatus.error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{t('dialogs.updatePaymentStatus.title')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="status">{t('finances.status')}</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PAID">{t('dialogs.updatePaymentStatus.paid')}</SelectItem>
                                <SelectItem value="PENDING">{t('dialogs.updatePaymentStatus.pending')}</SelectItem>
                                <SelectItem value="LATE">{t('dialogs.updatePaymentStatus.late')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('dialogs.updatePaymentStatus.update')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
