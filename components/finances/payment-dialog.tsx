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

interface PaymentDialogProps {
    onSuccess?: () => void
    studentId?: number
}

export function PaymentDialog({ onSuccess, studentId }: PaymentDialogProps) {
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
            toast.error("Please select a student")
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
            toast.error("Failed to record payment")
        } finally {
            setLoading(false)
        }
    }

    const buttonContent = studentId ? (
        <Button variant="outline" size="sm">
            Record Payment
        </Button>
    ) : (
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {buttonContent}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!studentId && (
                        <div className="space-y-2">
                            <Label htmlFor="student">Student *</Label>
                            <AsyncSelect
                                endpoint="/users/students/"
                                label="Student"
                                value={formData.student || ""}
                                onChange={(value) => setFormData({ ...formData, student: Number(value) })}
                                renderLabel={(item: any) => {
                                    const first = item.user?.first_name ?? item.first_name ?? ""
                                    const last = item.user?.last_name ?? item.last_name ?? ""
                                    const name = `${first} ${last}`.trim()
                                    return name || item.user?.username || item.username || "Unknown Student"
                                }}
                                renderValue={(item: any) => item.id}
                                placeholder="Search student..."
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (€)</Label>
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
                            <Label htmlFor="date">Date</Label>
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
                            <Label htmlFor="method">Payment Method</Label>
                            <Select
                                value={formData.method}
                                onValueChange={(value) => setFormData({ ...formData, method: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="CARD">Credit Card</SelectItem>
                                    <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                                    <SelectItem value="CHECK">Check</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PAID">Paid</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional notes..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
