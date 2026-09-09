"use client"

import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AsyncSelect } from "@/components/ui/async-select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Wand2, Gift, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useTranslations } from "next-intl"

interface EnrollCourseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    studentId: number
    onSuccess: () => void
}

export function EnrollCourseDialog({ open, onOpenChange, studentId, onSuccess }: EnrollCourseDialogProps) {
    const t = useTranslations()
    const [courseId, setCourseId] = useState<number | null>(null)
    const [course, setCourse] = useState<any>(null)
    const [subscriptionType, setSubscriptionType] = useState("MONTHLY")
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
    const [customPrice, setCustomPrice] = useState("")
    const [notes, setNotes] = useState("")
    const [pricingSuggestion, setPricingSuggestion] = useState<any>(null)
    const [loadingCourse, setLoadingCourse] = useState(false)
    const [suggestingPrice, setSuggestingPrice] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [globalOffer, setGlobalOffer] = useState<any>(null)
    const [offerSettings, setOfferSettings] = useState<any>(null)
    const [loadingOfferSettings, setLoadingOfferSettings] = useState(false)
    const [includeFreeCourse, setIncludeFreeCourse] = useState(false)
    const billedMonths = subscriptionType === "ANNUAL" ? 10 : subscriptionType === "QUARTERLY" ? 3 : 1
    const subscriptionAmount = Number(customPrice || 0) * billedMonths
    const isEnrollingInFreeCourse = Boolean(
        globalOffer?.free_course_id && courseId && Number(globalOffer.free_course_id) === Number(courseId)
    )

    useEffect(() => {
        if (!open) {
            setCourseId(null)
            setCourse(null)
            setSubscriptionType("MONTHLY")
            setStartDate(new Date().toISOString().split("T")[0])
            setCustomPrice("")
            setNotes("")
            setPricingSuggestion(null)
            setGlobalOffer(null)
            setOfferSettings(null)
            setIncludeFreeCourse(false)
        }
    }, [open])

    useEffect(() => {
        if (!open) return

        api.enrollments.offerSettings()
            .then((data) => setGlobalOffer(data))
            .catch(() => setGlobalOffer(null))
    }, [open])

    useEffect(() => {
        if (!open || !studentId) return

        const loadOfferSettings = async () => {
            setLoadingOfferSettings(true)
            try {
                const data = await api.enrollments.offerSettings(studentId)
                setOfferSettings(data)
            } catch (error) {
                console.error("Failed to load offer settings:", error)
                setOfferSettings(null)
            } finally {
                setLoadingOfferSettings(false)
            }
        }

        loadOfferSettings()
    }, [open, studentId])

    useEffect(() => {
        if (!courseId || isEnrollingInFreeCourse) {
            setIncludeFreeCourse(false)
            return
        }

        setIncludeFreeCourse(Boolean(offerSettings?.should_auto_add && offerSettings?.can_add_free_course))
    }, [courseId, isEnrollingInFreeCourse, offerSettings])

    useEffect(() => {
        if (!courseId) {
            setCourse(null)
            setCustomPrice("")
            setPricingSuggestion(null)
            return
        }

        const loadCourse = async () => {
            setLoadingCourse(true)
            try {
                const data = await api.courses.get(String(courseId))
                setCourse(data)
                setCustomPrice(String(data.price ?? ""))
            } catch (error) {
                console.error("Failed to fetch course:", error)
                toast.error(t("courses.failedLoad"))
            } finally {
                setLoadingCourse(false)
            }
        }

        loadCourse()
    }, [courseId, t])

    useEffect(() => {
        if (!courseId || !studentId) return

        const loadSuggestion = async () => {
            setSuggestingPrice(true)
            try {
                const suggestion = await api.enrollments.suggestPrice({
                    student_id: studentId,
                    course_id: courseId,
                })
                setPricingSuggestion(suggestion)
                const basePrice = Number(suggestion.suggested_price ?? suggestion.default_price ?? course?.price ?? 0)
                setCustomPrice(String(basePrice))
            } catch (error) {
                console.error("Failed to get price suggestion:", error)
                setPricingSuggestion(null)
            } finally {
                setSuggestingPrice(false)
            }
        }

        loadSuggestion()
    }, [courseId, studentId, course?.price])

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault()

        if (!courseId) {
            toast.error(`${t("enrolledCourses.course")} ${t("common.error")}`)
            return
        }

        setSubmitting(true)
        try {
            await api.enrollments.create({
                student: studentId,
                course: courseId,
                subscription_type: subscriptionType,
                subscription_start_date: startDate,
                custom_price: parseFloat(customPrice),
                notes,
            })

            const shouldAddFreeCourse = Boolean(
                includeFreeCourse &&
                offerSettings?.can_add_free_course &&
                offerSettings?.free_course_id &&
                Number(offerSettings.free_course_id) !== Number(courseId)
            )

            if (shouldAddFreeCourse) {
                try {
                    await api.enrollments.create({
                        student: studentId,
                        course: Number(offerSettings.free_course_id),
                        subscription_type: subscriptionType,
                        subscription_start_date: startDate,
                        custom_price: 0,
                        is_free_offer: true,
                        notes: `Auto-added free offer with ${course?.name || "course"} enrollment`,
                    })
                    toast.success(t("dialogs.enrollStudent.enrollSuccess", { course: offerSettings?.free_course?.name || "" }))
                } catch (freeCourseError: any) {
                    const detail =
                        freeCourseError?.response?.data?.non_field_errors?.[0] ||
                        freeCourseError?.response?.data?.detail ||
                        t("dialogs.enrollStudent.enrollError")
                    toast.warning(`${course?.name || t("enrolledCourses.course")}: ${detail}`)
                }
            } else {
                toast.success(t("dialogs.enrollStudent.enrollSimpleSuccess"))
            }
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            const detail =
                error.response?.data?.non_field_errors?.[0] ||
                error.response?.data?.detail ||
                t("dialogs.enrollStudent.enrollError")
            toast.error(detail)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("students.enrollInCourse")}</DialogTitle>
                    <DialogDescription>{t("dialogs.enrollStudent.description")}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t("enrolledCourses.course")}</Label>
                        <AsyncSelect
                            endpoint="/academics/courses/"
                            label={t("enrolledCourses.course")}
                            value={courseId || ""}
                            onChange={(value) => setCourseId(Number(value))}
                            renderLabel={(item: any) => {
                                const subject = item.subject_name ? ` - ${item.subject_name}` : ""
                                return `${item.name}${subject}`
                            }}
                            renderValue={(item: any) => item.id}
                            placeholder={t("students.enrollInCourse")}
                        />
                    </div>

                    {globalOffer?.enabled && globalOffer?.free_course && !isEnrollingInFreeCourse && (
                        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                            <Gift className="h-5 w-5 shrink-0 text-green-600" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-green-800">
                                    {t("dialogs.enrollStudent.freeOfferActive")}
                                </p>
                                <p className="text-xs text-green-700 mt-0.5">
                                    {`${t("dialogs.enrollStudent.freeOfferDescription")} ${globalOffer.free_course.name}`}
                                    {globalOffer.max_times > 1 && ` ${t("dialogs.enrollStudent.upToTimes", { count: globalOffer.max_times })}`}
                                </p>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs shrink-0">
                                {t("dialogs.enrollStudent.active")}
                            </Badge>
                        </div>
                    )}

                    {loadingCourse || suggestingPrice ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{t("dialogs.enrollStudent.calculatingPrice")}</span>
                        </div>
                    ) : pricingSuggestion?.is_promotional ? (
                        <Alert className="bg-green-50 border-green-200">
                            <Wand2 className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">{t("dialogs.enrollStudent.promotionAvailable")}</AlertTitle>
                            <AlertDescription className="text-green-700 text-xs mt-1">
                                {pricingSuggestion.reason}
                                <div className="font-bold mt-1">
                                    {t("dialogs.enrollStudent.suggestedPrice", { price: pricingSuggestion.suggested_price })}
                                </div>
                            </AlertDescription>
                        </Alert>
                    ) : pricingSuggestion ? (
                        <Alert className="bg-blue-50 border-blue-200">
                            <AlertTitle className="text-blue-800">{t("dialogs.enrollStudent.standardPricing")}</AlertTitle>
                            <AlertDescription className="text-blue-700 text-xs">
                                {t("dialogs.enrollStudent.standardPricingDesc")}
                                <div className="font-bold mt-1">
                                    {t("dialogs.enrollStudent.defaultPrice", { price: pricingSuggestion.default_price })}
                                </div>
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    {courseId && !isEnrollingInFreeCourse && globalOffer?.enabled && globalOffer?.free_course && (
                        <>
                            {loadingOfferSettings ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>{t("dialogs.enrollStudent.checkingEligibility")}</span>
                                </div>
                            ) : offerSettings?.can_add_free_course ? (
                                <div
                                    className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                                        includeFreeCourse
                                            ? "border-green-400 bg-green-50"
                                            : "border-dashed border-muted-foreground/30 hover:border-green-300"
                                    }`}
                                    onClick={() => setIncludeFreeCourse(!includeFreeCourse)}
                                >
                                    <Checkbox
                                        id="student-include-free-course"
                                        checked={includeFreeCourse}
                                        onClick={(event) => event.stopPropagation()}
                                        onCheckedChange={(checked) => {
                                            if (checked === true || checked === false) {
                                                setIncludeFreeCourse(checked)
                                            }
                                        }}
                                        className="mt-0.5"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Gift className="h-4 w-4 text-green-600" />
                                            <span className="font-semibold text-sm text-green-800">
                                                {t("dialogs.enrollStudent.addFreePrefix")} {offerSettings.free_course?.name}
                                            </span>
                                            <Badge className="bg-green-100 text-green-700 text-xs border-0">
                                                {t("dialogs.enrollStudent.free")}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {`${t("dialogs.enrollStudent.eligibleDescriptionPrefix")} ${offerSettings.free_course?.name}`}
                                        </p>
                                    </div>
                                    {includeFreeCourse && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                                </div>
                            ) : offerSettings && !offerSettings.can_add_free_course ? (
                                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span>
                                        {offerSettings.existing_free_course_count >= offerSettings.max_times
                                            ? `${t("dialogs.enrollStudent.alreadyReceivedPrefix")} ${globalOffer?.free_course?.name || "course"}`
                                            : `${t("dialogs.enrollStudent.alreadyEnrolledPrefix")} ${globalOffer?.free_course?.name || "course"}`}
                                    </span>
                                </div>
                            ) : null}
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("dialogs.enrollStudent.plan")}</Label>
                            <Select value={subscriptionType} onValueChange={setSubscriptionType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MONTHLY">{t("dialogs.enrollStudent.monthly")}</SelectItem>
                                    <SelectItem value="QUARTERLY">{t("dialogs.enrollStudent.quarterly")}</SelectItem>
                                    <SelectItem value="ANNUAL">{t("dialogs.enrollStudent.annual")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="start-date">{t("dialogs.enrollStudent.startDate")}</Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="custom-price">{t("dialogs.enrollStudent.monthlyPrice")}</Label>
                        <Input
                            id="custom-price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={customPrice}
                            onChange={(event) => setCustomPrice(event.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            {t("dialogs.enrollStudent.firstPeriodAmount", { amount: subscriptionAmount.toFixed(2) })}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="enrollment-notes">{t("dialogs.enrollStudent.notes")}</Label>
                        <Textarea
                            id="enrollment-notes"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder={t("dialogs.enrollStudent.notesPlaceholder")}
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={submitting || !courseId}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {includeFreeCourse
                                ? `${t("dialogs.enrollStudent.enrollWithFreePrefix")} ${offerSettings?.free_course?.name || "..."}`
                                : t("dialogs.enrollStudent.enrollStudent")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
