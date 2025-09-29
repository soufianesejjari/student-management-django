import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react"

export default function SchedulePage() {
  // Données fictives pour la démonstration
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
  const hours = ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]

  const schedule = [
    { day: "Lundi", hour: "10:00", course: "Piano - Niveau débutant", teacher: "Marie Dupont", room: "Salle 1" },
    { day: "Lundi", hour: "14:00", course: "Flûte - Niveau débutant", teacher: "Claire Rousseau", room: "Salle 3" },
    { day: "Mardi", hour: "14:00", course: "Guitare - Niveau intermédiaire", teacher: "Jean Martin", room: "Salle 2" },
    { day: "Mercredi", hour: "16:00", course: "Violon - Niveau avancé", teacher: "Sophie Leclerc", room: "Salle 4" },
    { day: "Jeudi", hour: "17:00", course: "Batterie - Niveau débutant", teacher: "Pierre Durand", room: "Salle 5" },
    {
      day: "Vendredi",
      hour: "18:00",
      course: "Chant - Niveau intermédiaire",
      teacher: "Isabelle Lefebvre",
      room: "Salle 1",
    },
    {
      day: "Samedi",
      hour: "10:00",
      course: "Saxophone - Niveau débutant",
      teacher: "François Moreau",
      room: "Salle 2",
    },
    { day: "Samedi", hour: "14:00", course: "Orchestre - Tous niveaux", teacher: "Michel Lambert", room: "Auditorium" },
  ]

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
                      const event = schedule.find((s) => s.day === day && s.hour === hour)
                      return (
                        <div key={`${day}-${hour}`} className="h-20 border rounded-md p-1 relative">
                          {event && (
                            <div className="absolute inset-1 rounded bg-primary/10 p-1 overflow-hidden">
                              <div className="font-medium text-xs">{event.course}</div>
                              <div className="text-xs text-muted-foreground">{event.teacher}</div>
                              <div className="text-xs text-muted-foreground">{event.room}</div>
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
