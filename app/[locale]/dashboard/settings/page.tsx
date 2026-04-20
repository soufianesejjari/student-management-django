'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { SubjectsManagement } from "@/components/academics/subjects-management"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, Gift, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { AsyncSelect } from "@/components/ui/async-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
  const t = useTranslations()

  // ── Offer settings state ────────────────────────────────────────────────
  const [offerEnabled, setOfferEnabled] = useState(false)
  const [freeCourseId, setFreeCourseId] = useState<number | null>(null)
  const [offerMaxTimes, setOfferMaxTimes] = useState(1)
  const [loadingOffer, setLoadingOffer] = useState(true)
  const [savingOffer, setSavingOffer] = useState(false)

  useEffect(() => {
    api.enrollments.offerSettings()
      .then((data) => {
        setOfferEnabled(Boolean(data.enabled))
        setFreeCourseId(data.free_course_id ?? null)
        setOfferMaxTimes(data.max_times ?? 1)
      })
      .catch(() => { toast.error(t('settings.loadError') || 'Erreur lors du chargement des paramètres') })
      .finally(() => setLoadingOffer(false))
  }, [])

  const handleSaveOffer = async () => {
    setSavingOffer(true)
    try {
      await api.enrollments.updateOfferSettings({
        enabled: offerEnabled,
        free_course_id: freeCourseId,
        max_times: offerMaxTimes,
      })
      toast.success(t('settings.offerSavedSuccess'))
    } catch {
      toast.error(t('settings.offerSavedError'))
    } finally {
      setSavingOffer(false)
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('settings.title')} />
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="subjects">{t('settings.subjects')}</TabsTrigger>
          <TabsTrigger value="offer">{t('settings.offer')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('settings.notifications')}</TabsTrigger>
          <TabsTrigger value="security">{t('settings.security')}</TabsTrigger>
          <TabsTrigger value="billing">{t('settings.billing')}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.schoolInfo')}</CardTitle>
              <CardDescription>Les informations de l'école sont gérées centralement. Contactez l'administrateur pour les modifier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school-name">{t('settings.schoolName')}</Label>
                <Input id="school-name" defaultValue="The Musical Academy" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-address">{t('settings.address')}</Label>
                <Input id="school-address" defaultValue="à coté du café LE CAVALLI, Av. Taha Houcine, Fès 30050" readOnly />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-city">{t('settings.city')}</Label>
                  <Input id="school-city" defaultValue="Fès" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-postal">{t('settings.postalCode')}</Label>
                  <Input id="school-postal" defaultValue="30050" readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-phone">{t('settings.phone')}</Label>
                <Input id="school-phone" defaultValue="+212 695-969711" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-email">{t('settings.email')}</Label>
                <Input id="school-email" defaultValue="contact@themusicalacademy.net" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-description">{t('settings.description')}</Label>
                <Textarea
                  id="school-description"
                  defaultValue="The Musical Academy est une école de musique proposant des cours pour tous les niveaux et tous les âges."
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled title="Contactez l'administrateur pour modifier">
                {t('settings.saveChanges')}
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.displaySettings')}</CardTitle>
              <CardDescription>{t('settings.displaySettingsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme-mode">{t('settings.darkMode')}</Label>
                <Switch id="theme-mode" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="compact-mode">{t('settings.compactMode')}</Label>
                <Switch id="compact-mode" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>{t('settings.saveChanges')}</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="subjects" className="space-y-4">
          <SubjectsManagement />
        </TabsContent>

        {/* ── Enrollment Offer ─────────────────────────────────────────── */}
        <TabsContent value="offer" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <CardTitle>{t('settings.offerSettings')}</CardTitle>
                {!loadingOffer && (
                  offerEnabled && freeCourseId
                    ? <Badge className="bg-green-100 text-green-700 border-0 text-xs flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </Badge>
                    : <Badge variant="outline" className="text-muted-foreground text-xs flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Inactive
                      </Badge>
                )}
              </div>
              <CardDescription>{t('settings.offerSettingsDescription')}</CardDescription>
            </CardHeader>

            {loadingOffer ? (
              <CardContent className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('common.loading')}</span>
              </CardContent>
            ) : (
              <CardContent className="space-y-6">

                {/* Enable / disable toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="offer-enabled" className="text-base">
                      {t('settings.offerEnabled')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.offerEnabledDescription')}
                    </p>
                  </div>
                  <Switch
                    id="offer-enabled"
                    checked={offerEnabled}
                    onCheckedChange={setOfferEnabled}
                  />
                </div>

                {/* Free course selector */}
                <div className="space-y-2">
                  <Label>{t('settings.offerFreeCourse')}</Label>
                  <AsyncSelect
                    endpoint="/academics/courses/"
                    label="Course"
                    value={freeCourseId}
                    onChange={(val) => setFreeCourseId(val ? Number(val) : null)}
                    renderLabel={(item: any) => `${item.name} (${item.subject_name || item.subject})`}
                    renderValue={(item: any) => item.id}
                    placeholder={t('settings.offerFreeCoursePlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Typically the Solfège course. Leave empty to disable the offer even if the toggle is on.
                  </p>
                </div>

                {/* Max times */}
                <div className="space-y-2">
                  <Label htmlFor="offer-max-times">{t('settings.offerMaxTimes')}</Label>
                  <Input
                    id="offer-max-times"
                    type="number"
                    min={1}
                    max={10}
                    value={offerMaxTimes}
                    onChange={(e) => setOfferMaxTimes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.offerMaxTimesDescription')}
                  </p>
                </div>

                {/* Warning if enabled but no course selected */}
                {offerEnabled && !freeCourseId && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-700 text-sm">
                      {t('settings.offerWarningNoFreeCourse')}
                    </AlertDescription>
                  </Alert>
                )}

              </CardContent>
            )}

            <CardFooter>
              <Button onClick={handleSaveOffer} disabled={loadingOffer || savingOffer}>
                {savingOffer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.saveChanges')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.notificationPreferences')}</CardTitle>
              <CardDescription>{t('settings.notificationDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">{t('settings.emailNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.emailNotificationsDescription')}
                  </p>
                </div>
                <Switch id="email-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-notifications">{t('settings.paymentNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.paymentNotificationsDescription')}
                  </p>
                </div>
                <Switch id="payment-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="course-notifications">{t('settings.courseNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.courseNotificationsDescription')}
                  </p>
                </div>
                <Switch id="course-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-notifications">{t('settings.marketingNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.marketingNotificationsDescription')}
                  </p>
                </div>
                <Switch id="marketing-notifications" />
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled title="Fonctionnalité à venir">
                {t('settings.savePreferences')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.accountSecurity')}</CardTitle>
              <CardDescription>{t('settings.accountSecurityDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t('settings.currentPassword')}</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('settings.newPassword')}</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('settings.confirmPassword')}</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="two-factor">{t('settings.twoFactor')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.twoFactorDescription')}
                  </p>
                </div>
                <Switch id="two-factor" />
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled title="Fonctionnalité à venir">
                {t('settings.updatePassword')}
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.activeSessions')}</CardTitle>
              <CardDescription>{t('settings.activeSessionsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Chrome {t('common.on')} Windows</p>
                    <p className="text-sm text-muted-foreground">Paris, France • {t('settings.activeNow')}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t('common.logout')}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Safari {t('common.on')} MacOS</p>
                    <p className="text-sm text-muted-foreground">Paris, France • {t('settings.lastActivity')} 2 {t('settings.hoursAgo')}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t('common.logout')}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('settings.mobileApp')} iPhone</p>
                    <p className="text-sm text-muted-foreground">Paris, France • {t('settings.lastActivity')} 5 {t('settings.daysAgo')}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t('common.logout')}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="destructive">{t('settings.logoutAllSessions')}</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.billingInfo')}</CardTitle>
              <CardDescription>{t('settings.billingInfoDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billing-name">{t('settings.billingName')}</Label>
                <Input id="billing-name" defaultValue="The Musical Academy" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-email">{t('settings.billingEmail')}</Label>
                <Input id="billing-email" defaultValue="contact@themusicalacademy.net" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-address">{t('settings.billingAddress')}</Label>
                <Input id="billing-address" defaultValue="à coté du café LE CAVALLI, Av. Taha Houcine, Fès 30050" readOnly />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing-city">{t('settings.city')}</Label>
                  <Input id="billing-city" defaultValue="Fès" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-postal">{t('settings.postalCode')}</Label>
                  <Input id="billing-postal" defaultValue="30050" readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-country">{t('settings.country')}</Label>
                <Input id="billing-country" defaultValue="Maroc" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-id">{t('settings.taxId')}</Label>
                <Input id="tax-id" defaultValue="" placeholder="À venir" readOnly />
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled title="Contactez l'administrateur pour modifier">
                {t('settings.saveBillingInfo')}
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.paymentMethods')}</CardTitle>
              <CardDescription>{t('settings.paymentMethodsDescription')}</CardDescription>
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
                      <p className="font-medium">{t('settings.visaEnding')} 4242</p>
                      <p className="text-sm text-muted-foreground">{t('settings.expires')} 12/2025</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    {t('common.edit')}
                  </Button>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                {t('settings.addPaymentMethod')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
