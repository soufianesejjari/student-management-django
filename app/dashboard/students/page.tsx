import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react"

export default function StudentsPage() {
  // Données fictives pour la démonstration
  const students = [
    {
      id: 1,
      name: "Emma Martin",
      email: "emma.martin@example.com",
      courses: "Piano, Solfège",
      status: "Actif",
      payments: "À jour",
    },
    {
      id: 2,
      name: "Lucas Dubois",
      email: "lucas.dubois@example.com",
      courses: "Guitare",
      status: "Actif",
      payments: "À jour",
    },
    {
      id: 3,
      name: "Chloé Petit",
      email: "chloe.petit@example.com",
      courses: "Violon, Orchestre",
      status: "Actif",
      payments: "En retard",
    },
    {
      id: 4,
      name: "Thomas Bernard",
      email: "thomas.bernard@example.com",
      courses: "Batterie",
      status: "Inactif",
      payments: "À jour",
    },
    {
      id: 5,
      name: "Léa Moreau",
      email: "lea.moreau@example.com",
      courses: "Chant, Piano",
      status: "Actif",
      payments: "À jour",
    },
    {
      id: 6,
      name: "Hugo Leroy",
      email: "hugo.leroy@example.com",
      courses: "Saxophone",
      status: "Actif",
      payments: "À jour",
    },
    {
      id: 7,
      name: "Manon Roux",
      email: "manon.roux@example.com",
      courses: "Flûte, Solfège",
      status: "Actif",
      payments: "En retard",
    },
    {
      id: 8,
      name: "Nathan Fournier",
      email: "nathan.fournier@example.com",
      courses: "Guitare basse",
      status: "Actif",
      payments: "À jour",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des étudiants</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel étudiant
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Étudiants</CardTitle>
          <CardDescription>Gérez les profils des étudiants, leurs inscriptions et leurs paiements.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un étudiant..." className="h-9" />
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
                  <TableHead>Cours</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Paiements</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.courses}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          student.status === "Actif"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {student.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          student.payments === "À jour"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        }`}
                      >
                        {student.payments}
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
