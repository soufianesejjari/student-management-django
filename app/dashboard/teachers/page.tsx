import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react"

export default function TeachersPage() {
  // Données fictives pour la démonstration
  const teachers = [
    {
      id: 1,
      name: "Marie Dupont",
      email: "marie.dupont@example.com",
      speciality: "Piano",
      students: 18,
      status: "Actif",
    },
    {
      id: 2,
      name: "Jean Martin",
      email: "jean.martin@example.com",
      speciality: "Guitare",
      students: 15,
      status: "Actif",
    },
    {
      id: 3,
      name: "Sophie Leclerc",
      email: "sophie.leclerc@example.com",
      speciality: "Violon",
      students: 12,
      status: "Actif",
    },
    {
      id: 4,
      name: "Pierre Durand",
      email: "pierre.durand@example.com",
      speciality: "Batterie",
      students: 10,
      status: "Actif",
    },
    {
      id: 5,
      name: "Isabelle Lefebvre",
      email: "isabelle.lefebvre@example.com",
      speciality: "Chant",
      students: 20,
      status: "Actif",
    },
    {
      id: 6,
      name: "François Moreau",
      email: "francois.moreau@example.com",
      speciality: "Saxophone",
      students: 8,
      status: "Actif",
    },
    {
      id: 7,
      name: "Claire Rousseau",
      email: "claire.rousseau@example.com",
      speciality: "Flûte",
      students: 9,
      status: "En congé",
    },
    {
      id: 8,
      name: "Michel Lambert",
      email: "michel.lambert@example.com",
      speciality: "Contrebasse",
      students: 5,
      status: "Actif",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des professeurs</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau professeur
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Professeurs</CardTitle>
          <CardDescription>Gérez les profils des professeurs, leurs spécialités et leurs plannings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un professeur..." className="h-9" />
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
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Spécialité</TableHead>
                  <TableHead>Étudiants</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.speciality}</TableCell>
                    <TableCell>{teacher.students}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          teacher.status === "Actif"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                        }`}
                      >
                        {teacher.status}
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
