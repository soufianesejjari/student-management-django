"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, getDay } from "date-fns"
import { fr } from "date-fns/locale"

import { useSchedule } from "@/hooks/useSchedule"
import { SessionDialog } from "@/components/planning/session-dialog"
import { RescheduleDialog } from "@/components/planning/reschedule-dialog"

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState("week")

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

  // Format for API
  const startDateStr = format(weekStart, "yyyy-MM-dd")
  const endDateStr = format(weekEnd, "yyyy-MM-dd")

  const { sessions, isLoading, mutate } = useSchedule(startDateStr, endDateStr)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [rescheduleData, setRescheduleData] = useState<{ open: boolean, session: any, date: Date | null }>({
    open: false,
    session: null,
    date: null
  })

  // Start at 8am, end at 8pm
  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]

  // Generate days for the header
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(weekStart, i))
  }

  const handlePrevious = () => setCurrentDate(subWeeks(currentDate, 1))
  const handleNext = () => setCurrentDate(addWeeks(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

  const handleEventClick = (session: any, date: Date) => {
    setRescheduleData({
      open: true,
      session: { ...session, current_date: format(date, "yyyy-MM-dd") },
      date: date
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Planning des cours</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleToday}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Vue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Jour</SelectItem>
              <SelectItem value="week">Semaine</SelectItem>
              <SelectItem value="month">Mois</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      <SessionDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={() => mutate()}
      />

      <RescheduleDialog
        open={rescheduleData.open}
        onOpenChange={(open) => setRescheduleData(prev => ({ ...prev, open }))}
        session={rescheduleData.session}
        onSuccess={() => mutate()}
      />

      <Card>
        <CardHeader>
          <CardTitle>Planning hebdomadaire</CardTitle>
          <CardDescription>
            Semaine du {format(weekStart, "d MMMM", { locale: fr })} au {format(weekEnd, "d MMMM yyyy", { locale: fr })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-2">
                <div className="h-12 border-b"></div>
                {weekDays.map((day) => (
                  <div key={day.toString()} className="h-12 flex flex-col items-center justify-center font-medium bg-muted/50 rounded-t-md border-b text-sm">
                    <span className="capitalize">{format(day, "EEEE", { locale: fr })}</span>
                    <span className="text-muted-foreground">{format(day, "d")}</span>
                  </div>
                ))}

                {hours.map((hour) => (
                  <React.Fragment key={hour}>
                    <div className="h-20 flex items-start justify-center pt-2 text-xs text-muted-foreground border-t -mt-[1px] relative">
                      <span className="-translate-y-1/2 bg-background px-1">{hour}</span>
                    </div>
                    {weekDays.map((day) => {
                      // dayIndex: 0 (Monday) to 6 (Sunday) match Python
                      // getDay returns 0 for Sunday, 1 for Monday.
                      // We need 0=Monday...6=Sunday.
                      let dayIndex = getDay(day) - 1
                      if (dayIndex === -1) dayIndex = 6

                      const hourPrefix = hour.substring(0, 2)

                      const event = sessions?.find((s: any) => {
                        return s.day_of_week === dayIndex && s.start_time.startsWith(hourPrefix)
                      })

                      return (
                        <div key={`${day}-${hour}`} className="h-20 border-l border-t border-dashed relative group">
                          {/* Hover slot for adding could go here */}

                          {event && (
                            <div
                              className="absolute inset-1 rounded bg-primary/10 p-2 overflow-hidden cursor-pointer hover:bg-primary/20 transition-all border-l-4 border-primary shadow-sm z-10"
                              title={`${event.course_name}`}
                              onClick={() => handleEventClick(event, day)}
                            >
                              <div className="font-semibold text-xs truncate text-primary">{event.course_name}</div>
                              <div className="text-xs text-muted-foreground truncate">{event.teacher_name}</div>
                              <div className="text-xs text-muted-foreground truncate italic">{event.room_name}</div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
