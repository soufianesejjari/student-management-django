"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export type SessionAction = "cancel" | "restore" | "delete"

interface SessionActionsDialogProps {
    action: SessionAction | null
    session: any
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function SessionActionsDialog({
    action,
    session,
    onOpenChange,
    onSuccess,
}: SessionActionsDialogProps) {
    const t = useTranslations()
    const [reason, setReason] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [conflicts, setConflicts] = useState<any[]>([])
    const [canForce, setCanForce] = useState(false)

    useEffect(() => {
        if (action) {
            setReason("")
            setConflicts([])
            setCanForce(false)
        }
    }, [action, session?.id])

    if (!action || !session) return null

    const titles: Record<SessionAction, string> = {
        cancel: t('schedule.cancelPlanningTitle'),
        restore: t('schedule.restorePlanning'),
        delete: t('schedule.deletePlanningTitle'),
    }
    const descriptions: Record<SessionAction, string> = {
        cancel: t('schedule.cancelPlanningDescription'),
        restore: t('schedule.cancelledSlotsHint'),
        delete: t('schedule.deletePlanningDescription'),
    }

    const run = async (force = false) => {
        setSubmitting(true)
        setConflicts([])
        try {
            if (action === "cancel") {
                await api.planning.cancelSession(session.id, reason)
                toast.success(t('schedule.cancelPlanningSuccess'))
            } else if (action === "restore") {
                await api.planning.restoreSession(session.id, force)
                toast.success(t('schedule.restorePlanningSuccess'))
            } else {
                await api.planning.deleteSession(session.id)
                toast.success(t('schedule.deleteSuccess'))
            }
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            const data = error?.response?.data
            if (error?.response?.status === 409 && Array.isArray(data?.conflicts) && data?.can_force) {
                setConflicts(data.conflicts)
                setCanForce(true)
            } else {
                const detail = Array.isArray(data?.detail) ? data.detail.join(' ') : data?.detail
                const fallback =
                    action === "cancel"
                        ? t('schedule.cancelPlanningError')
                        : action === "restore"
                            ? t('schedule.restorePlanningError')
                            : t('schedule.deletePlanningError')
                toast.error(detail || fallback)
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onOpenChange(false)}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle>{titles[action]}</DialogTitle>
                    <DialogDescription>{descriptions[action]}</DialogDescription>
                </DialogHeader>

                {action === "cancel" && (
                    <div className="space-y-2">
                        <Label htmlFor="cancel-reason">{t('schedule.cancelledReasonLabel')}</Label>
                        <Textarea
                            id="cancel-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder={t('schedule.cancelPlanningReasonPlaceholder')}
                        />
                    </div>
                )}

                {conflicts.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{t('schedule.restoreConflictTitle')}</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-4 text-xs">
                                {conflicts.map((conflict, index) => (
                                    <li key={index}>
                                        {conflict.student_name} — {conflict.conflicting_course}
                                    </li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        {t('schedule.close')}
                    </Button>
                    <Button
                        variant={action === "delete" ? "destructive" : "default"}
                        onClick={() => run(canForce)}
                        disabled={submitting}
                    >
                        {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        {canForce ? t('schedule.restoreForce') : t('schedule.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
