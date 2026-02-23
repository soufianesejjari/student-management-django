"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { useTranslations } from "next-intl"

interface ExpenseDialogProps {
    onSuccess?: () => void
    expense?: any
    trigger?: React.ReactNode
}

export function ExpenseDialog({ onSuccess, expense, trigger }: ExpenseDialogProps) {
    const t = useTranslations()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        category: "OTHER",
        date: new Date().toISOString().split('T')[0],
        status: "PENDING",
    })

    useEffect(() => {
        if (!open) return
        if (expense) {
            setFormData({
                description: expense.description || "",
                amount: expense.amount?.toString?.() ?? `${expense.amount ?? ""}`,
                category: expense.category || "OTHER",
                date: expense.date || new Date().toISOString().split('T')[0],
                status: expense.status || "PENDING",
            })
        } else {
            setFormData({
                description: "",
                amount: "",
                category: "OTHER",
                date: new Date().toISOString().split('T')[0],
                status: "PENDING",
            })
        }
    }, [open, expense])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (expense) {
                await api.patch(`/finances/expenses/${expense.id}/`, {
                    description: formData.description,
                    amount: parseFloat(formData.amount),
                    category: formData.category,
                    date: formData.date,
                    status: formData.status
                })
                toast.success(t('dialogs.expense.updateSuccess'))
            } else {
                await api.post("/finances/expenses/", {
                    description: formData.description,
                    amount: parseFloat(formData.amount),
                    category: formData.category,
                    date: formData.date,
                    status: formData.status
                })
                toast.success(t('dialogs.expense.addSuccess'))
            }
            setOpen(false)
            onSuccess?.()
        } catch (error) {
            console.error(error)
            toast.error(expense ? t('dialogs.expense.updateError') : t('dialogs.expense.addError'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? (
                    trigger
                ) : (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('dialogs.expense.newExpense')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{expense ? t('dialogs.expense.editTitle') : t('dialogs.expense.addTitle')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">{t('dialogs.expense.descriptionLabel')}</Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder={t('dialogs.expense.descriptionPlaceholder')}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">{t('dialogs.expense.amount')}</Label>
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
                            <Label htmlFor="category">{t('finances.category')}</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData({ ...formData, category: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SALARY">{t('dialogs.expense.salary')}</SelectItem>
                                    <SelectItem value="RENT">{t('dialogs.expense.rent')}</SelectItem>
                                    <SelectItem value="UTILITIES">{t('dialogs.expense.utilities')}</SelectItem>
                                    <SelectItem value="EQUIPMENT">{t('dialogs.expense.equipment')}</SelectItem>
                                    <SelectItem value="MAINTENANCE">{t('dialogs.expense.maintenance')}</SelectItem>
                                    <SelectItem value="OTHER">{t('dialogs.expense.other')}</SelectItem>
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
                                    <SelectItem value="PENDING">{t('dialogs.expense.pending')}</SelectItem>
                                    <SelectItem value="PAID">{t('dialogs.expense.paid')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
