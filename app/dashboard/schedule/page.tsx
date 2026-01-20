"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react"

import { useSchedule } from "@/hooks/useSchedule"

export default function SchedulePage() {
  const { sessions, isLoading } = useSchedule()
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
  const daysMap = { "Lundi": 0, "Mardi": 1, "Mercredi": 2, "Jeudi": 3, "Vendredi": 4, "Samedi": 5 }
  const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]



  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Planning des cours</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Select defaultValue="week">
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Vue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Jour</SelectItem>
              <SelectItem value="week">Semaine</SelectItem>
              <SelectItem value="month">Mois</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Planning hebdomadaire</CardTitle>
          <CardDescription>Semaine du 14 au 19 avril 2025</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[100px_repeat(6,1fr)] gap-2">
                <div className="h-12"></div>
                {days.map((day) => (
                  <div key={day} className="h-12 flex items-center justify-center font-medium bg-muted rounded-md">
                    {day}
                  </div>
                ))}
                {hours.map((hour) => (
                  <React.Fragment key={hour}>
                    <div className="h-20 flex items-center justify-center text-sm text-muted-foreground">{hour}</div>
                    {days.map((day) => {
                      const dayIndex = daysMap[day as keyof typeof daysMap]
                      const hourPrefix = hour.substring(0, 2)

                      const event = sessions?.find((s: any) => {
                        return s.day_of_week === dayIndex && s.start_time.startsWith(hourPrefix)
                      })

                      return (
                        <div key={`${day}-${hour}`} className="h-20 border rounded-md p-1 relative">
                          {isLoading && <div className="absolute inset-0 bg-muted/20 animate-pulse" />}
                          {event && (
                            <div className="absolute inset-1 rounded bg-primary/10 p-1 overflow-hidden" title={`${event.course_name} - ${event.room_name}`}>
                              <div className="font-medium text-xs truncate">{event.course_name}</div>
                              <div className="text-xs text-muted-foreground truncate">{event.teacher_name}</div>
                              <div className="text-xs text-muted-foreground truncate">{event.room_name}</div>
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
