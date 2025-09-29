import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowDownUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  DollarSign,
  Filter,
  PieChart,
  TrendingUp,
} from "lucide-react"

export default function FinancesPage() {
  // Données fictives pour la démonstration
  const payments = [
    { id: 1, student: "Emma Martin", amount: 250, date: "2025-04-01", method: "Carte bancaire", status: "Payé" },
    { id: 2, student: "Lucas Dubois", amount: 180, date: "2025-04-02", method: "Virement", status: "Payé" },
    { id: 3, student: "Chloé Petit", amount: 320, date: "2025-04-05", method: "Carte bancaire", status: "Payé" },
    { id: 4, student: "Thomas Bernard", amount: 150, date: "2025-04-08", method: "Espèces", status: "Payé" },
    { id: 5, student: "Léa Moreau", amount: 280, date: "2025-04-10", method: "Virement", status: "Payé" },
    { id: 6, student: "Hugo Leroy", amount: 200, date: "2025-04-15", method: "Carte bancaire", status: "En attente" },
    { id: 7, student: "Manon Roux", amount: 300, date: "2025-04-20", method: "Virement", status: "En retard" },
  ]

  const expenses = [
    {
      id: 1,
      description: "Salaire - Marie Dupont",
      amount: 1800,
      date: "2025-04-01",
      category: "Salaires",
      status: "Payé",
    },
    {
      id: 2,
      description: "Salaire - Jean Martin",
      amount: 1600,
      date: "2025-04-01",
      category: "Salaires",
      status: "Payé",
    },
    {
      id: 3,
      description: "Salaire - Sophie Leclerc",
      amount: 1400,
      date: "2025-04-01",
      category: "Salaires",
      status: "Payé",
    },
    { id: 4, description: "Loyer - Avril 2025", amount: 2500, date: "2025-04-05", category: "Locaux", status: "Payé" },
    {
      id: 5,
      description: "Facture d'électricité",
      amount: 350,
      date: "2025-04-10",
      category: "Charges",
      status: "Payé",
    },
    {
      id: 6,
      description: "Achat de partitions",
      amount: 200,
      date: "2025-04-15",
      category: "Matériel",
      status: "Payé",
    },
    {
      id: 7,
      description: "Réparation piano",
      amount: 450,
      date: "2025-04-20",
      category: "Maintenance",
      status: "En attente",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestion financière</h1>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Exporter les rapports
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus du mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 450 €</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">+8%</span> par rapport au mois dernier
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses du mois</CardTitle>
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9 850 €</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="mr-1 h-4 w-4 text-red-500" />
              <span className="text-red-500 font-medium">+5%</span> par rapport au mois dernier
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bénéfice net</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2 600 €</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">+12%</span> par rapport au mois dernier
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paiements en attente</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">950 €</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>5 paiements en attente</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Paiements reçus</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paiements des étudiants</CardTitle>
              <CardDescription>Suivez les paiements reçus des étudiants.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtrer
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Étudiant</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.student}</TableCell>
                        <TableCell>{payment.amount} €</TableCell>
                        <TableCell>{payment.date}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              payment.status === "Payé"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : payment.status === "En attente"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            }`}
                          >
                            {payment.status}
                          </span>
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
        </TabsContent>
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dépenses</CardTitle>
              <CardDescription>Suivez les dépenses de l'école.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtrer
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>{expense.amount} €</TableCell>
                        <TableCell>{expense.date}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              expense.status === "Payé"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            }`}
                          >
                            {expense.status}
                          </span>
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
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rapports financiers</CardTitle>
              <CardDescription>Consultez les rapports financiers détaillés.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                Graphique des revenus et dépenses
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Button variant="outline" className="h-auto flex flex-col items-center justify-center p-4">
                  <Download className="h-6 w-6 mb-2" />
                  <span>Rapport mensuel</span>
                  <span className="text-xs text-muted-foreground mt-1">Avril 2025</span>
                </Button>
                <Button variant="outline" className="h-auto flex flex-col items-center justify-center p-4">
                  <Download className="h-6 w-6 mb-2" />
                  <span>Rapport trimestriel</span>
                  <span className="text-xs text-muted-foreground mt-1">T1 2025</span>
                </Button>
                <Button variant="outline" className="h-auto flex flex-col items-center justify-center p-4">
                  <Download className="h-6 w-6 mb-2" />
                  <span>Rapport annuel</span>
                  <span className="text-xs text-muted-foreground mt-1">2024</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
