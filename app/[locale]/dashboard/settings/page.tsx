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
import { Loader2, Gift, AlertTriangle, CheckCircle2, XCircle, CalendarDays } from "lucide-react"
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
  const [savingSchool, setSavingSchool] = useState(false)
  const [schoolSettings, setSchoolSettings] = useState<Record<string, string>>({
    name: "",
    address: "",
    city: "",
    postal_code: "",
    phone: "",
    email: "",
    description: "",
    country: "",
    tax_id: "",
  })
  const [studentFeeSettings, setStudentFeeSettings] = useState({
    registration_fee: "",
    insurance_fee: "",
  })
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [loadingYears, setLoadingYears] = useState(true)
  const [savingYear, setSavingYear] = useState(false)
  const [yearForm, setYearForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
  })

  useEffect(() => {
    api.enrollments.offerSettings()
      .then((data) => {
        setOfferEnabled(Boolean(data.enabled))
        setFreeCourseId(data.free_course_id ?? null)
        setOfferMaxTimes(data.max_times ?? 1)
        if (data.school) {
          setSchoolSettings((current) => ({ ...current, ...data.school }))
        }
        if (data.student_fees) {
          setStudentFeeSettings({
            registration_fee: String(data.student_fees.registration_fee ?? ""),
            insurance_fee: String(data.student_fees.insurance_fee ?? ""),
          })
        }
      })
      .catch(() => { toast.error(t('settings.loadError') || 'Erreur lors du chargement des paramètres') })
      .finally(() => setLoadingOffer(false))
  }, [])

  const loadAcademicYears = async () => {
    setLoadingYears(true)
    try {
      const data = await api.academicYears.list()
      const years = Array.isArray(data) ? data : data.results || []
      setAcademicYears(years)
    } catch {
      toast.error(t('settings.academicYearLoadError'))
    } finally {
      setLoadingYears(false)
    }
  }

  useEffect(() => {
    loadAcademicYears()
  }, [])

  const handleCreateAcademicYear = async () => {
    if (!yearForm.name || !yearForm.start_date || !yearForm.end_date) {
      toast.error(t('settings.academicYearRequired'))
      return
    }

    setSavingYear(true)
    try {
      await api.academicYears.create(yearForm)
      toast.success(t('settings.academicYearSaved'))
      setYearForm({ name: "", start_date: "", end_date: "" })
      loadAcademicYears()
    } catch {
      toast.error(t('settings.academicYearSaveError'))
    } finally {
      setSavingYear(false)
    }
  }

  const handleActivateAcademicYear = async (id: number) => {
    setSavingYear(true)
    try {
      await api.academicYears.activate(id)
      toast.success(t('settings.academicYearActivated'))
      loadAcademicYears()
    } catch {
      toast.error(t('settings.academicYearActivateError'))
    } finally {
      setSavingYear(false)
    }
  }

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

  const handleSaveSchool = async () => {
    setSavingSchool(true)
    try {
      const data = await api.enrollments.updateOfferSettings({ school: schoolSettings })
      if (data.school) {
        setSchoolSettings((current) => ({ ...current, ...data.school }))
      }
      toast.success(t('settings.schoolSavedSuccess'))
    } catch {
      toast.error(t('settings.schoolSavedError'))
    } finally {
      setSavingSchool(false)
    }
  }

  const handleSaveStudentFees = async () => {
    setSavingSchool(true)
    try {
      const data = await api.enrollments.updateOfferSettings({
        student_fees: {
          registration_fee: studentFeeSettings.registration_fee || 0,
          insurance_fee: studentFeeSettings.insurance_fee || 0,
        },
      })
      if (data.student_fees) {
        setStudentFeeSettings({
          registration_fee: String(data.student_fees.registration_fee ?? ""),
          insurance_fee: String(data.student_fees.insurance_fee ?? ""),
        })
      }
      toast.success(t('settings.studentFeesSavedSuccess'))
    } catch {
      toast.error(t('settings.studentFeesSavedError'))
    } finally {
      setSavingSchool(false)
    }
  }

  const updateSchoolField = (field: string, value: string) => {
    setSchoolSettings((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('settings.title')} />
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="academic-year">{t('settings.academicYear')}</TabsTrigger>
          <TabsTrigger value="subjects">{t('settings.subjects')}</TabsTrigger>
          <TabsTrigger value="student-fees">{t('settings.studentFees')}</TabsTrigger>
          <TabsTrigger value="offer">{t('settings.offer')}</TabsTrigger>
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
                <Input id="school-name" value={schoolSettings.name} disabled={loadingOffer} onChange={(event) => updateSchoolField('name', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-address">{t('settings.address')}</Label>
                <Input id="school-address" value={schoolSettings.address} disabled={loadingOffer} onChange={(event) => updateSchoolField('address', event.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-city">{t('settings.city')}</Label>
                  <Input id="school-city" value={schoolSettings.city} disabled={loadingOffer} onChange={(event) => updateSchoolField('city', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-postal">{t('settings.postalCode')}</Label>
                  <Input id="school-postal" value={schoolSettings.postal_code} disabled={loadingOffer} onChange={(event) => updateSchoolField('postal_code', event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-phone">{t('settings.phone')}</Label>
                <Input id="school-phone" value={schoolSettings.phone} disabled={loadingOffer} onChange={(event) => updateSchoolField('phone', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-email">{t('settings.email')}</Label>
                <Input id="school-email" type="email" value={schoolSettings.email} disabled={loadingOffer} onChange={(event) => updateSchoolField('email', event.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-country">{t('settings.country')}</Label>
                  <Input id="school-country" value={schoolSettings.country} disabled={loadingOffer} onChange={(event) => updateSchoolField('country', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-tax-id">{t('settings.taxId')}</Label>
                  <Input id="school-tax-id" value={schoolSettings.tax_id} disabled={loadingOffer} onChange={(event) => updateSchoolField('tax_id', event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-description">{t('settings.description')}</Label>
                <Textarea
                  id="school-description"
                  value={schoolSettings.description}
                  disabled={loadingOffer}
                  onChange={(event) => updateSchoolField('description', event.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSchool} disabled={savingSchool || loadingOffer}>
                {savingSchool && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.saveChanges')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="subjects" className="space-y-4">
          <SubjectsManagement />
        </TabsContent>

        <TabsContent value="student-fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.studentFees')}</CardTitle>
              <CardDescription>{t('settings.studentFeesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="default-registration-fee">{t('students.registrationFee')}</Label>
                <Input
                  id="default-registration-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={studentFeeSettings.registration_fee}
                  disabled={loadingOffer}
                  onChange={(event) => setStudentFeeSettings((current) => ({ ...current, registration_fee: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-insurance-fee">{t('students.insuranceFee')}</Label>
                <Input
                  id="default-insurance-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={studentFeeSettings.insurance_fee}
                  disabled={loadingOffer}
                  onChange={(event) => setStudentFeeSettings((current) => ({ ...current, insurance_fee: event.target.value }))}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveStudentFees} disabled={savingSchool || loadingOffer}>
                {savingSchool && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.saveChanges')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="academic-year" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle>{t('settings.academicYear')}</CardTitle>
              </div>
              <CardDescription>{t('settings.academicYearDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="academic-year-name">{t('settings.academicYearName')}</Label>
                  <Input
                    id="academic-year-name"
                    placeholder="2026-2027"
                    value={yearForm.name}
                    onChange={(event) => setYearForm({ ...yearForm, name: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academic-year-start">{t('settings.academicYearStart')}</Label>
                  <Input
                    id="academic-year-start"
                    type="date"
                    value={yearForm.start_date}
                    onChange={(event) => setYearForm({ ...yearForm, start_date: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academic-year-end">{t('settings.academicYearEnd')}</Label>
                  <Input
                    id="academic-year-end"
                    type="date"
                    value={yearForm.end_date}
                    onChange={(event) => setYearForm({ ...yearForm, end_date: event.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleCreateAcademicYear} disabled={savingYear}>
                {savingYear && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.academicYearCreate')}
              </Button>

              <div className="space-y-3">
                {loadingYears ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('common.loading')}</span>
                  </div>
                ) : academicYears.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('settings.academicYearEmpty')}</p>
                ) : (
                  academicYears.map((year) => (
                    <div key={year.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{year.name}</p>
                          {year.is_active && <Badge className="bg-green-100 text-green-700 border-0">{t('settings.active')}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {year.start_date} - {year.end_date}
                        </p>
                      </div>
                      <Button
                        variant={year.is_active ? "outline" : "default"}
                        disabled={year.is_active || savingYear}
                        onClick={() => handleActivateAcademicYear(year.id)}
                      >
                        {year.is_active ? t('settings.academicYearCurrent') : t('settings.academicYearActivate')}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
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
      </Tabs>
    </div>
  )
}
