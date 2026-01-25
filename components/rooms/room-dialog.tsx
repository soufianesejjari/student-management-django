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

interface RoomDialogProps {
    room?: any
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function RoomDialog({ room, onSuccess, trigger }: RoomDialogProps) {
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
                toast.success("Room updated successfully")
            } else {
                await api.post("/planning/rooms/", formData)
                toast.success("Room created successfully")
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
            toast.error(error.response?.data?.name?.[0] || "Failed to save room")
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
            Add Room
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{room ? "Edit Room" : "Add New Room"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Room Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Studio A, Room 101"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="capacity">Capacity *</Label>
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
                        <Label htmlFor="resources">Resources / Equipment</Label>
                        <Textarea
                            id="resources"
                            value={formData.resources}
                            onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                            placeholder="e.g., Grand Piano, Projector, Whiteboard"
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active">Active</Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {room ? "Update" : "Create"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
