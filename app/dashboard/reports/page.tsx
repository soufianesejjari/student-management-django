import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, LineChart, PieChart, TrendingUp } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Rapports et statistiques</h1>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Exporter les rapports
        </Button>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="students">Étudiants</TabsTrigger>
          <TabsTrigger value="finances">Finances</TabsTrigger>
          <TabsTrigger value="courses">Cours</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des inscriptions</CardTitle>
                <CardDescription>Nombre d'inscriptions par mois sur l'année en cours</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="flex items-center gap-2 mb-4">
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tendance: </span>
                  <span className="text-sm text-green-500 font-medium">En hausse</span>
                </div>
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  Graphique d'évolution des inscriptions
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Répartition des revenus</CardTitle>
                <CardDescription>Répartition des revenus par type de cours</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Top catégorie: </span>
                  <span className="text-sm font-medium">Piano (32%)</span>
                </div>
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  Graphique de répartition des revenus
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Performance globale</CardTitle>
              <CardDescription>Indicateurs clés de performance sur les 12 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Croissance annuelle: </span>
                <span className="text-sm text-green-500 font-medium">+15%</span>
              </div>
              <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                Graphique de performance globale
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="students" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Répartition par âge</CardTitle>
                <CardDescription>Répartition des étudiants par tranche d'âge</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  Graphique de répartition par âge
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Répartition par instrument</CardTitle>
                <CardDescription>Répartition des étudiants par instrument</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  Graphique de répartition par instrument
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Taux de rétention</CardTitle>
              <CardDescription>Taux de rétention des étudiants sur les 12 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                Graphique de taux de rétention
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="finances" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenus vs Dépenses</CardTitle>
                <CardDescription>Comparaison des revenus et dépenses mensuels</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  Graphique revenus vs dépenses
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Répartition des dépenses</CardTitle>
                <CardDescription>Répartition des dépenses par catégorie</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  Graphique de répartition des dépenses
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Prévisions financières</CardTitle>
              <CardDescription>Prévisions des revenus pour les 6 prochains mois</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                Graphique de prévisions financières
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="courses" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Popularité des cours</CardTitle>
                <CardDescription>Classement des cours par nombre d'inscriptions</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  Graphique de popularité des cours
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Taux d'occupation</CardTitle>
                <CardDescription>Taux d'occupation des salles par jour de la semaine</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  Graphique de taux d'occupation
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Évolution des cours</CardTitle>
              <CardDescription>Évolution du nombre de cours proposés par trimestre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                Graphique d'évolution des cours
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
