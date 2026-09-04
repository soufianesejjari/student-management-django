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
import { useTranslations, useLocale } from "next-intl"

interface SessionDetailsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    session: any // The recurring session object
    date: Date // The specific occurrence date
    onUpdate?: () => void
}

export function SessionDetailsDialog({ open, onOpenChange, session, date, onUpdate }: SessionDetailsDialogProps) {
    const t = useTranslations('schedule')
    const locale = useLocale()
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
            toast.success(t('cancelSessionSuccess'))
            onUpdate?.()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast.error(t('cancelSessionError'))
        } finally {
            setLoading(false)
        }
    }

    const handleReschedule = async () => {
        if (!newDate || !newStartTime || !newEndTime) {
            toast.error(t('fillAllFields'))
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
            toast.success(t('rescheduleSuccess'))
            onUpdate?.()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast.error(t('rescheduleError'))
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
                        {mode === 'view' && t('sessionDetails')}
                        {mode === 'reschedule' && t('rescheduleTitle')}
                        {mode === 'cancel' && t('cancelTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
                                {t('rescheduleAlert', { date: date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="newDate">{t('newDate')}</Label>
                            <Input
                                id="newDate"
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="newStartTime">{t('startTime')}</Label>
                                <Input
                                    id="newStartTime"
                                    type="time"
                                    value={newStartTime}
                                    onChange={(e) => setNewStartTime(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newEndTime">{t('endTime')}</Label>
                                <Input
                                    id="newEndTime"
                                    type="time"
                                    value={newEndTime}
                                    onChange={(e) => setNewEndTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">{t('notesOptional')}</Label>
                            <Textarea
                                id="notes"
                                placeholder={t('rescheduleReason')}
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
                                {t('cancelAlert', { date: date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="cancelNotes">{t('cancelReason')}</Label>
                            <Textarea
                                id="cancelNotes"
                                placeholder={t('cancelReasonPlaceholder')}
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
                                {t('close')}
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setMode('reschedule')}
                                >
                                    {t('reschedule')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setMode('cancel')}
                                >
                                    {t('cancelTitle')}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Button type="button" variant="outline" onClick={resetMode} disabled={loading}>
                                {t('back')}
                            </Button>
                            <Button
                                type="button"
                                variant={mode === 'cancel' ? 'destructive' : 'default'}
                                onClick={mode === 'reschedule' ? handleReschedule : handleCancel}
                                disabled={loading}
                            >
                                {loading ? t('processing') : mode === 'reschedule' ? t('confirmReschedule') : t('confirmCancellation')}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
