"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Ban, Calendar, Clock, MapPin, Plus, Pencil, RotateCcw, Trash2, Users } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { SessionDialog } from "./session-dialog"
import { useTranslations } from "next-intl"
import { SessionStudentsDialog } from "./session-students-dialog"
import { SessionActionsDialog, type SessionAction } from "./session-actions-dialog"

export function CourseSchedule({ courseId }: { courseId: number }) {
    const t = useTranslations()
    const [sessions, setSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [openDialog, setOpenDialog] = useState(false)
    const [selectedSession, setSelectedSession] = useState<any>(null)
    const [studentAssignmentSession, setStudentAssignmentSession] = useState<any>(null)
    const [pendingAction, setPendingAction] = useState<{ action: SessionAction; session: any } | null>(null)

    const fetchSessions = async () => {
        try {
            setLoading(true)
            // include_cancelled: cancelled slots stay visible here only, so they can be restored or deleted.
            const data = await api.planning.listCourseSessions(courseId, true)
            // Handle both paginated and non-paginated responses
            if (Array.isArray(data)) {
                setSessions(data)
            } else if (data.results && Array.isArray(data.results)) {
                setSessions(data.results)
            } else {
                setSessions([])
            }
        } catch (error) {
            console.error("Failed to fetch sessions:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSessions()
    }, [courseId])

    const daysOfWeek = [
        t('schedule.monday'),
        t('schedule.tuesday'),
        t('schedule.wednesday'),
        t('schedule.thursday'),
        t('schedule.friday'),
        t('schedule.saturday'),
        t('schedule.sunday'),
    ]

    const handleAddSchedule = () => {
        setSelectedSession(null)
        setOpenDialog(true)
    }

    const handleEditSession = (session: any) => {
        setSelectedSession(session)
        setOpenDialog(true)
    }

    const activeSessions = sessions.filter((session) => !session.is_cancelled)
    const cancelledSessions = sessions.filter((session) => session.is_cancelled)

    if (loading) {
        return (
            <Card className="p-4">
                <p className="text-muted-foreground">{t('schedule.loading')}</p>
            </Card>
        )
    }

    if (activeSessions.length === 0 && cancelledSessions.length === 0) {
        return (
            <>
                <Card className="p-8">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <Calendar className="h-12 w-12 text-muted-foreground" />
                        <div>
                            <h3 className="font-semibold text-lg">{t('schedule.noScheduleTitle')}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('schedule.noScheduleDescription')}
                            </p>
                        </div>
                        <Button onClick={handleAddSchedule}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('schedule.addSchedule')}
                        </Button>
                    </div>
                </Card>

                <SessionDialog
                    open={openDialog}
                    onOpenChange={setOpenDialog}
                    courseId={courseId}
                    session={selectedSession}
                    onSuccess={() => {
                        fetchSessions()
                        toast.success(t('schedule.createSuccess'))
                    }}
                />
            </>
        )
    }

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t('schedule.classSessions')}</h3>
                    <Button onClick={handleAddSchedule} size="sm">
                        <Plus className="mr-2 h-3 w-3" />
                        {t('schedule.addSession')}
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {activeSessions.map((session) => (
                        <Card key={session.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base">
                                            {daysOfWeek[session.day_of_week]}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            {session.teacher_name}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            title={t('schedule.edit')}
                                            onClick={() => handleEditSession(session)}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            title={t('schedule.cancelPlanning')}
                                            onClick={() => setPendingAction({ action: 'cancel', session })}
                                        >
                                            <Ban className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            title={t('schedule.deletePlanning')}
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setPendingAction({ action: 'delete', session })}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center text-sm">
                                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span>{session.start_time} - {session.end_time}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span>{session.room_name}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <Badge variant="outline" className="text-xs">
                                        {session.start_date} → {session.end_date || t('schedule.ongoing')}
                                    </Badge>
                                </div>
                                <div className="border-t pt-3">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            {t('enrolledCourses.assignedStudents')}
                                            <Badge variant="secondary">{session.assigned_students?.length || 0}</Badge>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => setStudentAssignmentSession(session)}>
                                            {t('enrolledCourses.assignStudents')}
                                        </Button>
                                    </div>
                                    {session.assigned_students?.length ? (
                                        <p className="text-xs text-muted-foreground">
                                            {session.assigned_students.map((student: any) => student.student_name).join(', ')}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-amber-700">{t('enrolledCourses.noAssignedStudents')}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {cancelledSessions.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <div>
                            <h3 className="text-base font-semibold">{t('schedule.cancelledSlots')}</h3>
                            <p className="text-xs text-muted-foreground">{t('schedule.cancelledSlotsHint')}</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {cancelledSessions.map((session) => (
                                <Card key={session.id} className="border-dashed opacity-80">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <CardTitle className="text-base line-through">
                                                    {daysOfWeek[session.day_of_week]} {session.start_time} - {session.end_time}
                                                </CardTitle>
                                                <CardDescription className="mt-1">
                                                    {session.teacher_name} · {session.room_name}
                                                </CardDescription>
                                            </div>
                                            <Badge variant="destructive" className="text-xs">
                                                {t('schedule.cancelledBadge')}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {session.cancellation_reason && (
                                            <p className="text-xs text-muted-foreground">
                                                {t('schedule.cancelledReasonLabel')}: {session.cancellation_reason}
                                            </p>
                                        )}
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPendingAction({ action: 'restore', session })}
                                            >
                                                <RotateCcw className="mr-2 h-3 w-3" />
                                                {t('schedule.restorePlanning')}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => setPendingAction({ action: 'delete', session })}
                                            >
                                                <Trash2 className="mr-2 h-3 w-3" />
                                                {t('schedule.deletePlanning')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <SessionActionsDialog
                action={pendingAction?.action ?? null}
                session={pendingAction?.session}
                onOpenChange={(open) => !open && setPendingAction(null)}
                onSuccess={() => {
                    fetchSessions()
                    window.dispatchEvent(new Event('enrollment-updated'))
                }}
            />

            <SessionDialog
                open={openDialog}
                onOpenChange={setOpenDialog}
                courseId={courseId}
                session={selectedSession}
                onSuccess={() => {
                    fetchSessions()
                    toast.success(selectedSession ? t('schedule.updateSuccess') : t('schedule.createSuccess'))
                }}
            />
            <SessionStudentsDialog
                open={Boolean(studentAssignmentSession)}
                onOpenChange={(open) => !open && setStudentAssignmentSession(null)}
                courseId={courseId}
                session={studentAssignmentSession}
                onSuccess={() => {
                    fetchSessions()
                    window.dispatchEvent(new Event('enrollment-updated'))
                }}
            />
        </>
    )
}
