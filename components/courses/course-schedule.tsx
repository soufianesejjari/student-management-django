"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Plus, Pencil } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { SessionDialog } from "./session-dialog"

export function CourseSchedule({ courseId }: { courseId: number }) {
    const [sessions, setSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [openDialog, setOpenDialog] = useState(false)
    const [selectedSession, setSelectedSession] = useState<any>(null)

    const fetchSessions = async () => {
        try {
            setLoading(true)
            const response = await api.get(`/planning/sessions/?course=${courseId}`)
            const data = response.data
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

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    const handleAddSchedule = () => {
        setSelectedSession(null)
        setOpenDialog(true)
    }

    const handleEditSession = (session: any) => {
        setSelectedSession(session)
        setOpenDialog(true)
    }

    if (loading) {
        return (
            <Card className="p-4">
                <p className="text-muted-foreground">Loading schedule...</p>
            </Card>
        )
    }

    if (sessions.length === 0) {
        return (
            <>
                <Card className="p-8">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <Calendar className="h-12 w-12 text-muted-foreground" />
                        <div>
                            <h3 className="font-semibold text-lg">No Schedule Yet</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create an official class schedule for this course
                            </p>
                        </div>
                        <Button onClick={handleAddSchedule}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Schedule
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
                        toast.success("Schedule created successfully")
                    }}
                />
            </>
        )
    }

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Class Sessions</h3>
                    <Button onClick={handleAddSchedule} size="sm">
                        <Plus className="mr-2 h-3 w-3" />
                        Add Session
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {sessions.map((session) => (
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
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditSession(session)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
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
                                        {session.start_date} → {session.end_date || 'Ongoing'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <SessionDialog
                open={openDialog}
                onOpenChange={setOpenDialog}
                courseId={courseId}
                session={selectedSession}
                onSuccess={() => {
                    fetchSessions()
                    toast.success(selectedSession ? "Schedule updated" : "Schedule created")
                }}
            />
        </>
    )
}
