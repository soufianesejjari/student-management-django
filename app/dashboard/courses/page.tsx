import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react"

export default function CoursesPage() {
  // Données fictives pour la démonstration
  const courses = [
    {
      id: 1,
      name: "Piano - Niveau débutant",
      teacher: "Marie Dupont",
      students: 8,
      schedule: "Lundi, 10:00 - 12:00",
      status: "Actif",
    },
    {
      id: 2,
      name: "Guitare - Niveau intermédiaire",
      teacher: "Jean Martin",
      students: 6,
      schedule: "Mardi, 14:00 - 16:00",
      status: "Actif",
    },
    {
      id: 3,
      name: "Violon - Niveau avancé",
      teacher: "Sophie Leclerc",
      students: 4,
      schedule: "Mercredi, 16:30 - 18:30",
      status: "Actif",
    },
    {
      id: 4,
      name: "Batterie - Niveau débutant",
      teacher: "Pierre Durand",
      students: 5,
      schedule: "Jeudi, 17:00 - 19:00",
      status: "Actif",
    },
    {
      id: 5,
      name: "Chant - Niveau intermédiaire",
      teacher: "Isabelle Lefebvre",
      students: 10,
      schedule: "Vendredi, 18:00 - 20:00",
      status: "Actif",
    },
    {
      id: 6,
      name: "Saxophone - Niveau débutant",
      teacher: "François Moreau",
      students: 3,
      schedule: "Samedi, 10:00 - 12:00",
      status: "Actif",
    },
    {
      id: 7,
      name: "Flûte - Niveau débutant",
      teacher: "Claire Rousseau",
      students: 4,
      schedule: "Lundi, 14:00 - 16:00",
      status: "Inactif",
    },
    {
      id: 8,
      name: "Orchestre - Tous niveaux",
      teacher: "Michel Lambert",
      students: 15,
      schedule: "Samedi, 14:00 - 17:00",
      status: "Actif",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des cours</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau cours
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cours</CardTitle>
          <CardDescription>Gérez les cours, les horaires et les affectations des professeurs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un cours..." className="h-9" />
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du cours</TableHead>
                  <TableHead>Professeur</TableHead>
                  <TableHead>Étudiants</TableHead>
                  <TableHead>Horaire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.name}</TableCell>
                    <TableCell>{course.teacher}</TableCell>
                    <TableCell>{course.students}</TableCell>
                    <TableCell>{course.schedule}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          course.status === "Actif"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {course.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button variant="outline" size="sm">
              Suivant
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
