"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { SessionDetailsDialog } from "@/components/planning/session-details-dialog"
import { CalendarColumn } from "./CalendarColumn"

export function WeeklyCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [sessions, setSessions] = useState<any[]>([])
    const [instances, setInstances] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSession, setSelectedSession] = useState<any>(null)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    // Helper to get start of week (Monday)
    const getStartOfWeek = (date: Date) => {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        return new Date(d.setDate(diff))
    }

    const startOfWeek = getStartOfWeek(currentDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek)
        d.setDate(startOfWeek.getDate() + i)
        return d
    })

    const fetchSessions = async () => {
        try {
            setLoading(true)
            // Format dates for API (YYYY-MM-DD)
            const formatDate = (d: Date) => d.toISOString().split('T')[0]

            const endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 6)

            // Fetch only current week's data using the grid endpoint
            const response = await api.get(`/planning/sessions/grid/?start_date=${formatDate(startOfWeek)}&end_date=${formatDate(endOfWeek)}`)
            const data = response.data

            // Extract recurring sessions and instances
            setSessions(data.recurring || [])
            setInstances(data.instances || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSessions()
    }, [currentDate])

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate)
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
        setCurrentDate(newDate)
    }

    // Colors for different subjects/courses (simple hash)
    const getColor = (str: string) => {
        const colors = [
            "bg-red-100 text-red-700 border-red-200",
            "bg-blue-100 text-blue-700 border-blue-200",
            "bg-green-100 text-green-700 border-green-200",
            "bg-yellow-100 text-yellow-700 border-yellow-200",
            "bg-purple-100 text-purple-700 border-purple-200",
            "bg-pink-100 text-pink-700 border-pink-200",
            "bg-indigo-100 text-indigo-700 border-indigo-200",
        ]
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash)
        }
        return colors[Math.abs(hash) % colors.length]
    }

    // Time slots (8am to 8pm)
    const hours = Array.from({ length: 13 }, (_, i) => i + 8)

    const getSessionStyle = (start: string, end: string) => {
        const [startH, startM] = start.split(':').map(Number)
        const [endH, endM] = end.split(':').map(Number)

        // 80px per hour
        const pxPerMinute = 80 / 60
        const startOffset = ((startH - 8) * 60 + startM) * pxPerMinute
        const duration = ((endH * 60 + endM) - (startH * 60 + startM)) * pxPerMinute

        return {
            top: `${startOffset}px`,
            height: `${duration}px`
        }
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-bold">
                    {startOfWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
                    <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
                {loading && (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                )}

                <div className="overflow-x-auto">
                    {/* Header Row - using flex to match body layout */}
                    <div className="flex border-b sticky top-0 bg-background z-20" style={{ minWidth: '900px' }}>
                        <div className="w-[100px] flex-shrink-0 p-1all border-r bg-muted/30 text-xs font-semibold text-muted-foreground text-center flex items-center justify-center">
                            Time
                        </div>
                        {weekDays.map((date, i) => (
                            <div key={i} className={cn(
                                "flex-1 p-2 border-r text-center py-3",
                                date.toDateString() === new Date().toDateString() ? "bg-accent/50" : ""
                            )}>
                                <div className="text-sm font-medium">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                <div className={cn(
                                    "text-xl font-bold rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1",
                                    date.toDateString() === new Date().toDateString() ? "bg-primary text-primary-foreground" : ""
                                )}>
                                    {date.getDate()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Grid Body */}
                    <div className="flex" style={{ minWidth: '900px', minHeight: '1040px' }}>
                        {/* Time Column - fixed width */}
                        <div className="w-[100px] flex-shrink-0 border-r bg-muted/10">
                            {hours.map(hour => (
                                <div key={hour} style={{ height: '80px' }} className="border-b flex items-start justify-end pr-3 pt-2">
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {hour}:00
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Days Columns - flex grow equally */}
                        {weekDays.map((dayDate, dayIndex) => (
                            <CalendarColumn
                                key={dayIndex}
                                dayDate={dayDate}
                                hours={hours}
                                sessions={sessions}
                                instances={instances}
                                getColor={getColor}
                                getSessionStyle={getSessionStyle}
                                onSelectSession={(session, date) => {
                                    setSelectedSession(session)
                                    setSelectedDate(date)
                                    setDialogOpen(true)
                                }}
                            />
                        ))}
                    </div>
                </div>
            </CardContent>

            {selectedSession && selectedDate && (
                <SessionDetailsDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    session={selectedSession}
                    date={selectedDate}
                    onUpdate={() => {
                        fetchSessions()
                    }}
                />
            )}
        </Card>
    )
}
