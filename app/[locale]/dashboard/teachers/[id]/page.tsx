"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, FileDown, Loader2, ReceiptText, Unlock } from "lucide-react"
import { reopenTeacherPayroll, updateSessionAttendance, useTeacherSessions, validateTeacherPayroll } from "@/hooks/useTeacherSessions"
import { toast } from "sonner"
import api from "@/lib/api"
import { useTranslations, useLocale } from "next-intl"

export default function TeacherProfile() {
    const params = useParams()
    const t = useTranslations()
    const locale = useLocale()
    const teacherId = parseInt(params.id as string)
    
    const [currentDate, setCurrentDate] = useState(new Date())
    const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({})
    const [payrollSaving, setPayrollSaving] = useState(false)

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
            toast.success(t('teachers.attendanceUpdated'))
        } catch (error: any) {
            console.error(error)
            toast.error(t('teachers.attendanceFailed'))
        } finally {
            setSavingStates(prev => ({ ...prev, [key]: false }))
        }
    }

    const handleValidatePayroll = async () => {
        if (sessionData?.before_validation_day) {
            const confirmed = window.confirm(t('teachers.beforeValidationDayConfirm', { day: sessionData.validation_day || 28 }))
            if (!confirmed) return
        }

        setPayrollSaving(true)
        try {
            await validateTeacherPayroll(teacherId, year, month)
            await mutate()
            toast.success(t('teachers.payrollValidatedSuccess'))
        } catch (error) {
            console.error(error)
            toast.error(t('teachers.payrollActionFailed'))
        } finally {
            setPayrollSaving(false)
        }
    }

    const handleReopenPayroll = async () => {
        setPayrollSaving(true)
        try {
            await reopenTeacherPayroll(teacherId, year, month)
            await mutate()
            toast.success(t('teachers.payrollReopenedSuccess'))
        } catch (error) {
            console.error(error)
            toast.error(t('teachers.payrollActionFailed'))
        } finally {
            setPayrollSaving(false)
        }
    }

    const monthName = new Date(year, month - 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    const daysOfWeek = Array.from({ length: 7 }, (_, i) =>
        new Date(2021, 0, i + 3).toLocaleDateString(locale, { weekday: 'short' })
    )

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
            toast.success(t('teachers.paymentReportDownloaded'))
        } catch (error) {
            console.error(error)
            toast.error(t('teachers.paymentReportFailed'))
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
            toast.success(t('teachers.scheduleDownloaded'))
        } catch (error) {
            console.error(error)
            toast.error(t('teachers.scheduleFailed'))
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
                <p className="text-muted-foreground">{t('teachers.noData')}</p>
            </div>
        )
    }

    const { teacher, occurrences, summary, payroll } = sessionData
    const isPayrollValidated = payroll?.status === 'VALIDATED'

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
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{teacher.name}</h1>
                    <p className="text-muted-foreground">{t('teachers.profileAttendance')}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    {isPayrollValidated ? (
                        <Button variant="outline" onClick={handleReopenPayroll} disabled={payrollSaving}>
                            {payrollSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlock className="mr-2 h-4 w-4" />}
                            {t('teachers.reopenPayroll')}
                        </Button>
                    ) : (
                        <Button onClick={handleValidatePayroll} disabled={payrollSaving}>
                            {payrollSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            {t('teachers.validatePayroll')}
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleDownloadPaymentReport}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {t('teachers.paymentReport')}
                    </Button>
                    <Button variant="outline" onClick={handleDownloadSchedule}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {t('teachers.schedulePdf')}
                    </Button>
                </div>
            </div>

            <Card className={isPayrollValidated ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <ReceiptText className={isPayrollValidated ? "h-5 w-5 text-green-700" : "h-5 w-5 text-amber-700"} />
                        <div>
                            <p className="font-medium">
                                {isPayrollValidated ? t('teachers.payrollValidated') : t('teachers.payrollDraft')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {isPayrollValidated ? t('teachers.payrollLockedHint') : t('teachers.payrollDraftHint')}
                            </p>
                        </div>
                    </div>
                    {payroll?.expense_id && (
                        <Badge variant="secondary">
                            {t('teachers.payrollExpense')} #{payroll.expense_id}
                            {payroll.expense_status === 'PENDING' ? ` - ${t('teachers.expensePending')}` : ''}
                        </Badge>
                    )}
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="w-full grid gap-4 grid-cols-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('teachers.hourlyRate')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{teacher.hourly_rate.toFixed(2)} MAD</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('teachers.totalHours')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.total_hours.toFixed(1)}h</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('teachers.workedHours')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.worked_hours.toFixed(1)}h</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('teachers.totalExpense')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{summary.total_expense.toFixed(2)} MAD</div>
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
                        <p className="text-center text-muted-foreground">{t('teachers.noSessionsThisMonth')}</p>
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
                                                            <Badge variant="destructive" className="text-xs">{t('schedule.cancelled')}</Badge>
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
                                                                disabled={isSaving || isPayrollValidated}
                                                                onCheckedChange={(checked) =>
                                                                    handleAbsenceChange(session.id, session.date, checked as boolean)
                                                                }
                                                            />
                                                            <label htmlFor={`absent-${key}`} className={`text-sm ${isPayrollValidated ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}`}>
                                                                {t('teachers.absent')}
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
                    <CardTitle>{t('teachers.monthlySummary')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <p className="text-sm text-muted-foreground">{t('teachers.totalSessions')}</p>
                            <p className="text-2xl font-bold">{summary.total_sessions}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t('schedule.cancelled')}</p>
                            <p className="text-2xl font-bold text-red-600">{summary.cancelled_sessions}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t('teachers.absences')}</p>
                            <p className="text-2xl font-bold text-yellow-600">{summary.absent_sessions}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t('teachers.totalSalary')}</p>
                            <p className="text-2xl font-bold text-green-600">{summary.total_expense.toFixed(2)} MAD</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('teachers.salaryHistory')}</CardTitle>
                    <CardDescription>{t('teachers.salaryHistoryDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {!sessionData.payroll_history?.length ? (
                        <p className="text-sm text-muted-foreground">{t('teachers.noSalaryHistory')}</p>
                    ) : (
                        <div className="rounded-md border">
                            <div className="grid grid-cols-6 gap-2 border-b px-4 py-2 text-sm font-medium text-muted-foreground">
                                <span>{t('teachers.month')}</span>
                                <span>{t('teachers.workedHours')}</span>
                                <span>{t('teachers.hourlyRate')}</span>
                                <span>{t('teachers.totalSalary')}</span>
                                <span>{t('teachers.payrollExpense')}</span>
                                <span>{t('teachers.validatedBy')}</span>
                            </div>
                            {sessionData.payroll_history.map((item: any) => (
                                <div key={item.id} className="grid grid-cols-6 gap-2 px-4 py-3 text-sm border-b last:border-b-0">
                                    <span>{item.year}-{String(item.month).padStart(2, '0')}</span>
                                    <span>{Number(item.worked_hours || 0).toFixed(1)}h</span>
                                    <span>{Number(item.hourly_rate || 0).toFixed(2)} MAD</span>
                                    <span>{Number(item.amount || 0).toFixed(2)} MAD</span>
                                    <span>
                                        {item.expense_id ? (
                                            <Badge variant={item.expense_status === 'PAID' ? 'default' : 'secondary'}>
                                                #{item.expense_id} {item.expense_status}
                                            </Badge>
                                        ) : (
                                            t('teachers.notGenerated')
                                        )}
                                    </span>
                                    <span>{item.validated_by_name || '-'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
