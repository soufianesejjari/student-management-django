"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SessionPicker } from "@/components/academics/session-picker"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface SessionAssignmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    enrollment: any | null
    onSuccess: () => void
}

export function SessionAssignmentDialog({ open, onOpenChange, enrollment, onSuccess }: SessionAssignmentDialogProps) {
    const t = useTranslations()
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [availableCount, setAvailableCount] = useState(0)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open || !enrollment) return
        setSelectedIds((enrollment.assigned_sessions || []).map(Number))
        setAvailableCount(-1)
    }, [open, enrollment])

    const save = async () => {
        if (!enrollment) return
        if (availableCount > 0 && selectedIds.length === 0) {
            toast.error(t('enrolledCourses.selectAtLeastOneSession'))
            return
        }
        if (availableCount < 0) return

        setSaving(true)
        try {
            await api.enrollments.update(enrollment.id, { assigned_sessions: selectedIds })
            toast.success(t('enrolledCourses.sessionAssignmentUpdated'))
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            const detail = error?.response?.data?.assigned_sessions?.[0] || error?.response?.data?.detail || t('common.error')
            toast.error(detail)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>{t('enrolledCourses.editSessions')}</DialogTitle>
                    <DialogDescription>
                        {enrollment?.student_name ? `${enrollment.student_name} · ` : ""}{enrollment?.course_name}
                    </DialogDescription>
                </DialogHeader>
                <SessionPicker
                    courseId={enrollment ? Number(enrollment.course) : null}
                    value={selectedIds}
                    onChange={setSelectedIds}
                    onSessionsLoaded={setAvailableCount}
                    disabled={saving}
                />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="button" onClick={save} disabled={saving || availableCount < 0}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
