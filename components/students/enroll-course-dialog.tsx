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
import { Loader2, Wand2 } from "lucide-react"
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
    const subscriptionAmount = Number(customPrice || 0) * (subscriptionType === "QUARTERLY" ? 3 : 1)

    useEffect(() => {
        if (!open) {
            setCourseId(null)
            setCourse(null)
            setSubscriptionType("MONTHLY")
            setStartDate(new Date().toISOString().split("T")[0])
            setCustomPrice("")
            setNotes("")
            setPricingSuggestion(null)
        }
    }, [open])

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

            toast.success(t("dialogs.enrollStudent.enrollSimpleSuccess"))
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
                            {t("dialogs.enrollStudent.enrollStudent")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
