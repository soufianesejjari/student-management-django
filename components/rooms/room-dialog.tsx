"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Loader2, Edit } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { useTranslations } from "next-intl"

interface RoomDialogProps {
    room?: any
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function RoomDialog({ room, onSuccess, trigger }: RoomDialogProps) {
    const t = useTranslations()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        capacity: 10,
        resources: "",
        is_active: true
    })

    useEffect(() => {
        if (room) {
            setFormData({
                name: room.name || "",
                capacity: room.capacity || 10,
                resources: room.resources || "",
                is_active: room.is_active !== undefined ? room.is_active : true
            })
        } else {
            setFormData({
                name: "",
                capacity: 10,
                resources: "",
                is_active: true
            })
        }
    }, [room, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (room) {
                await api.put(`/planning/rooms/${room.id}/`, formData)
                toast.success(t('rooms.updateSuccess'))
            } else {
                await api.post("/planning/rooms/", formData)
                toast.success(t('rooms.createSuccess'))
            }
            
            setOpen(false)
            setFormData({
                name: "",
                capacity: 10,
                resources: "",
                is_active: true
            })
            onSuccess?.()
        } catch (error: any) {
            console.error(error)
            toast.error(error.response?.data?.name?.[0] || t('rooms.saveError'))
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = room ? (
        <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
        </Button>
    ) : (
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('rooms.addRoom')}
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{room ? t('rooms.editRoom') : t('rooms.addNewRoom')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('rooms.roomName')} *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('rooms.roomNamePlaceholder')}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="capacity">{t('rooms.capacity')} *</Label>
                        <Input
                            id="capacity"
                            type="number"
                            min="1"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="resources">{t('rooms.resources')}</Label>
                        <Textarea
                            id="resources"
                            value={formData.resources}
                            onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                            placeholder={t('rooms.resourcesPlaceholder')}
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active">{t('rooms.active')}</Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('rooms.cancel')}
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {room ? t('rooms.update') : t('rooms.create')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
