"use client"

import { useEffect, useState } from "react"
import { CalendarClock, Loader2, MapPin, UserRound } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useTranslations } from "next-intl"

interface SessionPickerProps {
    courseId: number | null
    value: number[]
    onChange: (ids: number[]) => void
    onSessionsLoaded?: (count: number) => void
    disabled?: boolean
}

export function SessionPicker({
    courseId,
    value,
    onChange,
    onSessionsLoaded,
    disabled = false,
}: SessionPickerProps) {
    const t = useTranslations()
    const [sessions, setSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!courseId) {
            setSessions([])
            onSessionsLoaded?.(0)
            return
        }

        let active = true
        setLoading(true)
        onSessionsLoaded?.(-1)
        api.get(`/planning/sessions/?course=${courseId}`)
            .then((response) => {
                if (!active) return
                const data = Array.isArray(response.data) ? response.data : response.data?.results || []
                setSessions(data)
                onSessionsLoaded?.(data.length)
                if (data.length === 1 && value.length === 0) {
                    onChange([Number(data[0].id)])
                }
            })
            .catch(() => {
                if (!active) return
                setSessions([])
                onSessionsLoaded?.(0)
            })
            .finally(() => {
                if (active) setLoading(false)
            })

        return () => {
            active = false
        }
    }, [courseId])

    const days = [
        t('schedule.monday'),
        t('schedule.tuesday'),
        t('schedule.wednesday'),
        t('schedule.thursday'),
        t('schedule.friday'),
        t('schedule.saturday'),
        t('schedule.sunday'),
    ]

    const toggle = (sessionId: number, checked: boolean) => {
        onChange(
            checked
                ? Array.from(new Set([...value, sessionId]))
                : value.filter((id) => id !== sessionId)
        )
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 rounded-md border p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('schedule.loading')}
            </div>
        )
    }

    if (sessions.length === 0) {
        return (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {t('enrolledCourses.noAvailableSessions')}
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {sessions.map((session) => {
                const id = Number(session.id)
                const checked = value.includes(id)
                return (
                    <Label
                        key={id}
                        htmlFor={`session-${id}`}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${checked ? "border-red-600 bg-red-50" : "hover:bg-muted/50"}`}
                    >
                        <Checkbox
                            id={`session-${id}`}
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(next) => toggle(id, next === true)}
                            className="mt-0.5"
                        />
                        <span className="min-w-0 space-y-1 text-sm font-normal">
                            <span className="flex items-center gap-2 font-semibold">
                                <CalendarClock className="h-4 w-4 text-red-700" />
                                {days[session.day_of_week]} · {String(session.start_time).slice(0, 5)}–{String(session.end_time).slice(0, 5)}
                            </span>
                            <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><UserRound className="h-3 w-3" />{session.teacher_name}</span>
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{session.room_name}</span>
                            </span>
                            <span className="block text-xs text-muted-foreground">
                                {session.start_date} → {session.end_date || t('schedule.ongoing')}
                            </span>
                        </span>
                    </Label>
                )
            })}
            <p className="text-xs text-muted-foreground">{t('enrolledCourses.sessionSelectionHint')}</p>
        </div>
    )
}
