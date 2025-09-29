import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
      </div>
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
          <TabsTrigger value="billing">Facturation</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'école</CardTitle>
              <CardDescription>Modifiez les informations générales de votre école de musique.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school-name">Nom de l'école</Label>
                <Input id="school-name" defaultValue="The Musical Academy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-address">Adresse</Label>
                <Input id="school-address" defaultValue="123 Rue de la Musique" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-city">Ville</Label>
                  <Input id="school-city" defaultValue="Paris" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-postal">Code postal</Label>
                  <Input id="school-postal" defaultValue="75001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-phone">Téléphone</Label>
                <Input id="school-phone" defaultValue="+33 1 23 45 67 89" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-email">Email</Label>
                <Input id="school-email" defaultValue="contact@musicalacademy.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-description">Description</Label>
                <Textarea
                  id="school-description"
                  defaultValue="The Musical Academy est une école de musique proposant des cours pour tous les niveaux et tous les âges."
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Enregistrer les modifications</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Paramètres d'affichage</CardTitle>
              <CardDescription>Personnalisez l'apparence de votre application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme-mode">Mode sombre</Label>
                <Switch id="theme-mode" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="compact-mode">Mode compact</Label>
                <Switch id="compact-mode" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Enregistrer les modifications</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Préférences de notification</CardTitle>
              <CardDescription>Configurez comment et quand vous souhaitez être notifié.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Notifications par email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevez des notifications par email pour les événements importants.
                  </p>
                </div>
                <Switch id="email-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-notifications">Notifications de paiement</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevez des notifications pour les paiements reçus et en retard.
                  </p>
                </div>
                <Switch id="payment-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="course-notifications">Notifications de cours</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevez des notifications pour les changements de planning.
                  </p>
                </div>
                <Switch id="course-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-notifications">Notifications marketing</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevez des notifications sur les nouvelles fonctionnalités et offres.
                  </p>
                </div>
                <Switch id="marketing-notifications" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Enregistrer les préférences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>Gérez la sécurité de votre compte et les paramètres d'authentification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="two-factor">Authentification à deux facteurs</Label>
                  <p className="text-sm text-muted-foreground">
                    Ajoutez une couche de sécurité supplémentaire à votre compte.
                  </p>
                </div>
                <Switch id="two-factor" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Mettre à jour le mot de passe</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sessions actives</CardTitle>
              <CardDescription>Gérez vos sessions actives sur différents appareils.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Chrome sur Windows</p>
                    <p className="text-sm text-muted-foreground">Paris, France • Actif maintenant</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Déconnecter
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Safari sur MacOS</p>
                    <p className="text-sm text-muted-foreground">Paris, France • Dernière activité il y a 2 heures</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Déconnecter
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Application mobile sur iPhone</p>
                    <p className="text-sm text-muted-foreground">Paris, France • Dernière activité il y a 5 jours</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Déconnecter
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="destructive">Déconnecter toutes les autres sessions</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations de facturation</CardTitle>
              <CardDescription>Gérez vos informations de facturation et vos méthodes de paiement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billing-name">Nom de facturation</Label>
                <Input id="billing-name" defaultValue="The Musical Academy SARL" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-email">Email de facturation</Label>
                <Input id="billing-email" defaultValue="facturation@musicalacademy.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-address">Adresse de facturation</Label>
                <Input id="billing-address" defaultValue="123 Rue de la Musique" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing-city">Ville</Label>
                  <Input id="billing-city" defaultValue="Paris" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-postal">Code postal</Label>
                  <Input id="billing-postal" defaultValue="75001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-country">Pays</Label>
                <Input id="billing-country" defaultValue="France" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-id">Numéro de TVA</Label>
                <Input id="tax-id" defaultValue="FR12345678901" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Enregistrer les informations</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Méthodes de paiement</CardTitle>
              <CardDescription>Gérez vos méthodes de paiement pour les factures.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-muted p-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <path d="M2 10h20" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Visa se terminant par 4242</p>
                      <p className="text-sm text-muted-foreground">Expire le 12/2025</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Modifier
                  </Button>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Ajouter une méthode de paiement
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
