"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { Calendar, Clock, MapPin, User, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SessionDetailsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    session: any // The recurring session object
    date: Date // The specific occurrence date
    onUpdate?: () => void
}

export function SessionDetailsDialog({ open, onOpenChange, session, date, onUpdate }: SessionDetailsDialogProps) {
    const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel'>('view')
    const [newDate, setNewDate] = useState('')
    const [newStartTime, setNewStartTime] = useState('')
    const [newEndTime, setNewEndTime] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    const handleCancel = async () => {
        try {
            setLoading(true)
            await api.post(`/planning/sessions/${session.id}/cancel_occurrence/`, {
                original_date: format(date, 'yyyy-MM-dd'),
                notes
            })
            toast.success("Session cancelled for this date")
            onUpdate?.()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("Failed to cancel session")
        } finally {
            setLoading(false)
        }
    }

    const handleReschedule = async () => {
        if (!newDate || !newStartTime || !newEndTime) {
            toast.error("Please fill all fields")
            return
        }

        try {
            setLoading(true)
            await api.post(`/planning/sessions/${session.id}/reschedule/`, {
                original_date: format(date, 'yyyy-MM-dd'),
                new_date: newDate,
                new_start_time: newStartTime,
                new_end_time: newEndTime,
                notes
            })
            toast.success("Session rescheduled successfully")
            onUpdate?.()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("Failed to reschedule session")
        } finally {
            setLoading(false)
        }
    }

    const resetMode = () => {
        setMode('view')
        setNewDate('')
        setNewStartTime('')
        setNewEndTime('')
        setNotes('')
    }

    const handleClose = () => {
        resetMode()
        onOpenChange(false)
    }

    if (!session) return null

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'view' && 'Session Details'}
                        {mode === 'reschedule' && 'Reschedule Session'}
                        {mode === 'cancel' && 'Cancel Session'}
                    </DialogTitle>
                    <DialogDescription>
                        {format(date, 'EEEE, MMMM d, yyyy')}
                    </DialogDescription>
                </DialogHeader>

                {mode === 'view' && (
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="font-semibold">{session.course_name}</div>
                                <div className="text-sm text-muted-foreground">{session.subject_name}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <div className="text-sm">
                                {session.start_time} - {session.end_time}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div className="text-sm">{session.teacher_name}</div>
                        </div>

                        <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                            <div className="text-sm">{session.room_name}</div>
                        </div>
                    </div>
                )}

                {mode === 'reschedule' && (
                    <div className="space-y-4 py-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                This will reschedule only the occurrence on {format(date, 'MMM d, yyyy')}. Other sessions remain unchanged.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="newDate">New Date</Label>
                            <Input
                                id="newDate"
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="newStartTime">Start Time</Label>
                                <Input
                                    id="newStartTime"
                                    type="time"
                                    value={newStartTime}
                                    onChange={(e) => setNewStartTime(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newEndTime">End Time</Label>
                                <Input
                                    id="newEndTime"
                                    type="time"
                                    value={newEndTime}
                                    onChange={(e) => setNewEndTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Reason for rescheduling..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {mode === 'cancel' && (
                    <div className="space-y-4 py-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                This will cancel only the session on {format(date, 'MMM d, yyyy')}. This action cannot be undone.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="cancelNotes">Reason for Cancellation</Label>
                            <Textarea
                                id="cancelNotes"
                                placeholder="e.g., Teacher sick, Holiday..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between">
                    {mode === 'view' ? (
                        <>
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Close
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setMode('reschedule')}
                                >
                                    Reschedule
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setMode('cancel')}
                                >
                                    Cancel Session
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Button type="button" variant="outline" onClick={resetMode} disabled={loading}>
                                Back
                            </Button>
                            <Button
                                type="button"
                                variant={mode === 'cancel' ? 'destructive' : 'default'}
                                onClick={mode === 'reschedule' ? handleReschedule : handleCancel}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : mode === 'reschedule' ? 'Confirm Reschedule' : 'Confirm Cancellation'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
