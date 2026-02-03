"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronLeft, ChevronRight, Loader2, FileDown, Calendar } from "lucide-react"
import { useTeacherSessions, updateSessionAttendance } from "@/hooks/useTeacherSessions"
import { toast } from "sonner"
import api from "@/lib/api"

export default function TeacherProfile() {
    const params = useParams()
    const teacherId = parseInt(params.id as string)
    
    const [currentDate, setCurrentDate] = useState(new Date())
    const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({})

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1

    const { data: sessionData, isLoading, mutate } = useTeacherSessions(teacherId, year, month)

    const goToPreviousMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }

    const goToNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }

    const handleAbsenceChange = async (sessionId: number, date: string, isAbsent: boolean) => {
        const key = `${sessionId}-${date}`
        setSavingStates(prev => ({ ...prev, [key]: true }))
        
        try {
            await updateSessionAttendance(teacherId, sessionId, date, isAbsent)
            await mutate()
            toast.success("Attendance updated successfully")
        } catch (error: any) {
            console.error(error)
            toast.error("Failed to update attendance")
        } finally {
            setSavingStates(prev => ({ ...prev, [key]: false }))
        }
    }

    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const handleDownloadPaymentReport = async () => {
        try {
            const response = await api.get(`/planning/teacher/${teacherId}/payment-report/`, {
                params: { year, month },
                responseType: 'blob'
            })
            
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `payment_report_${year}_${month}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            toast.success("Payment report downloaded")
        } catch (error) {
            console.error(error)
            toast.error("Failed to download payment report")
        }
    }

    const handleDownloadSchedule = async () => {
        try {
            const response = await api.get(`/planning/teacher/${teacherId}/schedule-pdf/`, {
                responseType: 'blob'
            })
            
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `teacher_schedule.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            toast.success("Schedule downloaded")
        } catch (error) {
            console.error(error)
            toast.error("Failed to download schedule")
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!sessionData) {
        return (
            <div className="p-8">
                <p className="text-muted-foreground">No data available</p>
            </div>
        )
    }

    const { teacher, occurrences, summary } = sessionData

    // Group occurrences by week for calendar display
    const groupedByWeek: { [key: string]: typeof occurrences } = {}
    occurrences.forEach((occurrence: any) => {
        const date = new Date(occurrence.date)
        const weekStart = new Date(date)
        weekStart.setDate(weekStart.getDate() - date.getDay())
        const weekKey = weekStart.toISOString().split('T')[0]
        
        if (!groupedByWeek[weekKey]) {
            groupedByWeek[weekKey] = []
        }
        groupedByWeek[weekKey].push(occurrence)
    })

    const weeks = Object.entries(groupedByWeek).sort(([a], [b]) => a.localeCompare(b))

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{teacher.name}</h1>
                    <p className="text-muted-foreground">Teacher Profile & Attendance</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadPaymentReport}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Payment Report
                    </Button>
                    <Button variant="outline" onClick={handleDownloadSchedule}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Schedule PDF
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="w-full grid gap-4 grid-cols-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Hourly Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${teacher.hourly_rate.toFixed(2)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.total_hours.toFixed(1)}h</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Worked Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.worked_hours.toFixed(1)}h</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Expense</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">${summary.total_expense.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold">{monthName}</h2>
                <Button variant="outline" size="sm" onClick={goToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Calendar View */}
            <div className="space-y-4">
                {weeks.length === 0 ? (
                    <Card className="p-8">
                        <p className="text-center text-muted-foreground">No sessions scheduled for this month</p>
                    </Card>
                ) : (
                    weeks.map(([weekStart, weekSessions]) => (
                        <Card key={weekStart}>
                            <CardHeader>
                                <CardTitle className="text-sm">
                                    {new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {weekSessions.map((session: any) => {
                                        const key = `${session.id}-${session.date}`
                                        const isSaving = savingStates[key]
                                        
                                        return (
                                            <div
                                                key={key}
                                                className={`flex items-center justify-between p-4 border rounded-lg ${
                                                    session.is_cancelled 
                                                        ? 'bg-red-50 border-red-200' 
                                                        : session.teacher_is_absent 
                                                        ? 'bg-yellow-50 border-yellow-200'
                                                        : 'bg-white'
                                                }`}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{session.course}</span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {daysOfWeek[new Date(session.date).getDay()]}
                                                        </span>
                                                        {session.is_cancelled && (
                                                            <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {session.start_time} - {session.end_time} | {session.room} | {session.duration_hours.toFixed(1)}h
                                                    </div>
                                                </div>

                                                {!session.is_cancelled && (
                                                    <div className="flex items-center gap-3 ml-4">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`absent-${key}`}
                                                                checked={session.teacher_is_absent}
                                                                disabled={isSaving}
                                                                onCheckedChange={(checked) =>
                                                                    handleAbsenceChange(session.id, session.date, checked as boolean)
                                                                }
                                                            />
                                                            <label htmlFor={`absent-${key}`} className="text-sm cursor-pointer">
                                                                Absent
                                                            </label>
                                                        </div>
                                                        {isSaving && (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Summary Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Sessions</p>
                            <p className="text-2xl font-bold">{summary.total_sessions}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Cancelled</p>
                            <p className="text-2xl font-bold text-red-600">{summary.cancelled_sessions}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Absences</p>
                            <p className="text-2xl font-bold text-yellow-600">{summary.absent_sessions}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Salary</p>
                            <p className="text-2xl font-bold text-green-600">${summary.total_expense.toFixed(2)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
