'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { SubjectsManagement } from "@/components/academics/subjects-management"
import { useTranslations } from "next-intl"

export default function SettingsPage() {
  const t = useTranslations()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
      </div>
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="subjects">{t('settings.subjects')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('settings.notifications')}</TabsTrigger>
          <TabsTrigger value="security">{t('settings.security')}</TabsTrigger>
          <TabsTrigger value="billing">{t('settings.billing')}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.schoolInfo')}</CardTitle>
              <CardDescription>{t('settings.schoolInfoDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school-name">{t('settings.schoolName')}</Label>
                <Input id="school-name" defaultValue="The Musical Academy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-address">{t('settings.address')}</Label>
                <Input id="school-address" defaultValue="123 Rue de la Musique" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-city">{t('settings.city')}</Label>
                  <Input id="school-city" defaultValue="Paris" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-postal">{t('settings.postalCode')}</Label>
                  <Input id="school-postal" defaultValue="75001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-phone">{t('settings.phone')}</Label>
                <Input id="school-phone" defaultValue="+33 1 23 45 67 89" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-email">{t('settings.email')}</Label>
                <Input id="school-email" defaultValue="contact@musicalacademy.com" />
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
              <Button>{t('settings.saveChanges')}</Button>
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
              <Button>{t('settings.savePreferences')}</Button>
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
              <Button>{t('settings.updatePassword')}</Button>
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
                <Input id="billing-name" defaultValue="The Musical Academy SARL" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-email">{t('settings.billingEmail')}</Label>
                <Input id="billing-email" defaultValue="facturation@musicalacademy.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-address">{t('settings.billingAddress')}</Label>
                <Input id="billing-address" defaultValue="123 Rue de la Musique" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing-city">{t('settings.city')}</Label>
                  <Input id="billing-city" defaultValue="Paris" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-postal">{t('settings.postalCode')}</Label>
                  <Input id="billing-postal" defaultValue="75001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-country">{t('settings.country')}</Label>
                <Input id="billing-country" defaultValue="France" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-id">{t('settings.taxId')}</Label>
                <Input id="tax-id" defaultValue="FR12345678901" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>{t('settings.saveBillingInfo')}</Button>
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
