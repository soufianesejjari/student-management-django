"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface SessionStudentsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    courseId: number
    session: any | null
    onSuccess: () => void
}

export function SessionStudentsDialog({ open, onOpenChange, courseId, session, onSuccess }: SessionStudentsDialogProps) {
    const t = useTranslations()
    const [enrollments, setEnrollments] = useState<any[]>([])
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open || !session) return
        let active = true
        setLoading(true)
        api.enrollments.list({ course_id: courseId })
            .then((data) => {
                if (!active) return
                const rows = Array.isArray(data) ? data : data.results || []
                setEnrollments(rows.filter((row: any) => row.status === 'ACTIVE'))
                setSelectedIds((session.assigned_students || []).map((row: any) => Number(row.enrollment_id)))
            })
            .catch(() => toast.error(t('common.error')))
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [open, session?.id, courseId])

    const toggle = (enrollmentId: number, checked: boolean) => {
        setSelectedIds(
            checked
                ? Array.from(new Set([...selectedIds, enrollmentId]))
                : selectedIds.filter((id) => id !== enrollmentId)
        )
    }

    const save = async () => {
        if (!session) return
        setSaving(true)
        try {
            await api.post(`/planning/sessions/${session.id}/assign-students/`, { enrollment_ids: selectedIds })
            toast.success(t('enrolledCourses.sessionStudentsUpdated'))
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
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{t('enrolledCourses.assignStudents')}</DialogTitle>
                    <DialogDescription>
                        {session && `${String(session.start_time).slice(0, 5)}–${String(session.end_time).slice(0, 5)} · ${session.room_name}`}
                    </DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : enrollments.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        {t('enrolledCourses.notEnrolled')}
                    </div>
                ) : (
                    <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {enrollments.map((enrollment) => {
                            const id = Number(enrollment.id)
                            return (
                                <Label key={id} htmlFor={`enrollment-${id}`} className="flex cursor-pointer items-center gap-3 rounded-md border p-3">
                                    <Checkbox
                                        id={`enrollment-${id}`}
                                        checked={selectedIds.includes(id)}
                                        disabled={saving}
                                        onCheckedChange={(next) => toggle(id, next === true)}
                                    />
                                    <span>{enrollment.student_name}</span>
                                </Label>
                            )
                        })}
                    </div>
                )}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="button" onClick={save} disabled={saving || loading}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
