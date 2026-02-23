"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form"
import { AsyncSelect } from "@/components/ui/async-select"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, Wand2, Gift, CheckCircle2, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTranslations } from "next-intl"

const formSchema = z.object({
    studentId: z.union([z.string(), z.number()]),
    subscriptionType: z.enum(["MONTHLY", "QUARTERLY"]),
    startDate: z.string().min(1, "Start date is required"),
    customPrice: z.string().min(1, "Price is required"),
    notes: z.string().optional(),
})

interface AddStudentToCourseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    course: any
    onSuccess: () => void
}

interface OfferSettings {
    enabled: boolean
    free_course_id: number | null
    max_times: number
    free_course?: {
        id: number
        name: string
        status: string
        subject_type?: string | null
    } | null
    student_id?: number
    active_enrollments_count?: number
    existing_free_course_count?: number
    can_add_free_course?: boolean
    should_auto_add?: boolean
}

export function AddStudentToCourseDialog({
    open,
    onOpenChange,
    course,
    onSuccess,
}: AddStudentToCourseDialogProps) {

    const [suggestingPrice, setSuggestingPrice] = useState(false)
    const [pricingSuggestion, setPricingSuggestion] = useState<any>(null)

    const t = useTranslations()

    // Global offer config (loaded once when dialog opens, no student needed)
    const [globalOffer, setGlobalOffer] = useState<OfferSettings | null>(null)
    // Per-student eligibility (loaded after student is selected)
    const [offerSettings, setOfferSettings] = useState<OfferSettings | null>(null)
    const [loadingOfferSettings, setLoadingOfferSettings] = useState(false)
    const [includeFreeCourse, setIncludeFreeCourse] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            subscriptionType: "MONTHLY",
            startDate: new Date().toISOString().split('T')[0],
            customPrice: course?.price?.toString() || "0",
            notes: "",
        },
    })

    // Load global offer settings as soon as dialog opens
    useEffect(() => {
        if (!open) return
        api.enrollments.offerSettings()
            .then((data) => setGlobalOffer(data))
            .catch(() => setGlobalOffer(null))
    }, [open])

    // Reset price to course default when dialog opens
    useEffect(() => {
        if (open && course) {
            form.setValue("customPrice", course.price.toString())
        }
    }, [open, course, form])

    // Watch for student selection to suggest price
    const selectedStudentId = form.watch("studentId")
    useEffect(() => {
        if (selectedStudentId && course) {
            const getPriceSuggestion = async () => {
                setSuggestingPrice(true)
                try {
                    const suggestion = await api.enrollments.suggestPrice({
                        student_id: Number(selectedStudentId),
                        course_id: course.id
                    })
                    setPricingSuggestion(suggestion)
                    if (suggestion.suggested_price !== undefined) {
                        form.setValue("customPrice", suggestion.suggested_price.toString())
                    }
                } catch (error) {
                    console.error("Failed to get price suggestion", error)
                } finally {
                    setSuggestingPrice(false)
                }
            }
            getPriceSuggestion()
        } else {
            setPricingSuggestion(null)
        }
    }, [selectedStudentId, course, form])

    // Load per-student offer eligibility once a student is selected
    useEffect(() => {
        if (!open || !selectedStudentId || !course) {
            setOfferSettings(null)
            setIncludeFreeCourse(false)
            return
        }

        const loadOfferSettings = async () => {
            setLoadingOfferSettings(true)
            try {
                const data = await api.enrollments.offerSettings(Number(selectedStudentId))
                setOfferSettings(data)
                const isDifferentCourse = Number(data.free_course_id) !== Number(course.id)
                setIncludeFreeCourse(Boolean(data.should_auto_add && isDifferentCourse))
            } catch (error) {
                console.error("Failed to load offer settings", error)
                setOfferSettings(null)
                setIncludeFreeCourse(false)
            } finally {
                setLoadingOfferSettings(false)
            }
        }

        loadOfferSettings()
    }, [open, selectedStudentId, course?.id])

    // Update price when subscription type changes
    const subscriptionType = form.watch("subscriptionType")
    useEffect(() => {
        const basePrice = pricingSuggestion?.suggested_price ?? course?.price ?? 0
        if (subscriptionType === "QUARTERLY") {
            form.setValue("customPrice", (basePrice * 3).toString())
        } else {
            form.setValue("customPrice", basePrice.toString())
        }
    }, [subscriptionType, pricingSuggestion, course, form])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const studentId = Number(values.studentId)
        const shouldAddFreeCourse = Boolean(
            includeFreeCourse &&
            offerSettings?.can_add_free_course &&
            offerSettings?.free_course_id &&
            Number(offerSettings.free_course_id) !== Number(course.id)
        )

        try {
            await api.enrollments.create({
                student: studentId,
                course: course.id,
                subscription_type: values.subscriptionType,
                subscription_start_date: values.startDate,
                custom_price: parseFloat(values.customPrice),
                notes: values.notes
            })

            if (shouldAddFreeCourse) {
                try {
                    await api.enrollments.create({
                        student: studentId,
                        course: Number(offerSettings?.free_course_id),
                        subscription_type: values.subscriptionType,
                        subscription_start_date: values.startDate,
                        custom_price: 0,
                        is_free_offer: true,
                        notes: `Auto-added free offer with ${course?.name || "course"} enrollment`
                    })
                    toast.success(`${t('dialogs.enrollStudent.enrollSuccess')} ${offerSettings?.free_course?.name || ''}`)
                } catch (freeCourseError: any) {
                    const detail =
                        freeCourseError?.response?.data?.non_field_errors?.[0] ||
                        freeCourseError?.response?.data?.detail ||
                        t('dialogs.enrollStudent.enrollError')
                    toast.warning(`${t('courses.name')}: ${course.name}. ${detail}`)
                }
            } else {
                toast.success(t('dialogs.enrollStudent.enrollSimpleSuccess'))
            }

            onSuccess()
            onOpenChange(false)
            form.reset()
            setOfferSettings(null)
            setGlobalOffer(null)
            setIncludeFreeCourse(false)
        } catch (error: any) {
            toast.error(error.response?.data?.non_field_errors?.[0] || t('dialogs.enrollStudent.enrollError'))
        }
    }

    // Derived: is the free course the same as the course being enrolled in?
    const isEnrollingInFreeCourse = globalOffer?.free_course_id != null &&
        Number(globalOffer.free_course_id) === Number(course?.id)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('dialogs.enrollStudent.title')} {course?.name}</DialogTitle>
                    <DialogDescription>
                        {t('dialogs.enrollStudent.description')}
                    </DialogDescription>
                </DialogHeader>

                {/* ── Global offer banner (always visible when offer is active) ── */}
                {globalOffer?.enabled && globalOffer?.free_course && !isEnrollingInFreeCourse && (
                    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                        <Gift className="h-5 w-5 shrink-0 text-green-600" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-green-800">
                                {t('dialogs.enrollStudent.freeOfferActive')}
                            </p>
                            <p className="text-xs text-green-700 mt-0.5">
                                {`${t('dialogs.enrollStudent.freeOfferDescription')} ${globalOffer.free_course.name}`}
                                {globalOffer.max_times > 1 && ` ${t('dialogs.enrollStudent.upToTimes')} (${globalOffer.max_times}×)`}
                            </p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs shrink-0">
                            {t('dialogs.enrollStudent.active')}
                        </Badge>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="studentId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t('dialogs.enrollStudent.student')}</FormLabel>
                                    <AsyncSelect
                                        endpoint="/users/students/"
                                        label="Student"
                                        value={field.value}
                                        onChange={field.onChange}
                                        renderLabel={(item: any) => `${item.user.first_name} ${item.user.last_name}`}
                                        renderValue={(item: any) => item.id}
                                        placeholder={t('dialogs.enrollStudent.selectStudent')}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Pricing Suggestion Alert */}
                        {suggestingPrice ? (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{t('dialogs.enrollStudent.calculatingPrice')}</span>
                            </div>
                        ) : pricingSuggestion && pricingSuggestion.is_promotional ? (
                            <Alert className="bg-green-50 border-green-200">
                                <Wand2 className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">{t('dialogs.enrollStudent.promotionAvailable')}</AlertTitle>
                                <AlertDescription className="text-green-700 text-xs mt-1">
                                    {pricingSuggestion.reason}
                                    <div className="font-bold mt-1">{t('dialogs.enrollStudent.suggestedPrice')} {pricingSuggestion.suggested_price} MAD</div>
                                </AlertDescription>
                            </Alert>
                        ) : pricingSuggestion ? (
                            <Alert className="bg-blue-50 border-blue-200">
                                <AlertTitle className="text-blue-800">{t('dialogs.enrollStudent.standardPricing')}</AlertTitle>
                                <AlertDescription className="text-blue-700 text-xs">
                                    {t('dialogs.enrollStudent.standardPricingDesc')}
                                    <div className="font-bold mt-1">{t('dialogs.enrollStudent.defaultPrice')} {pricingSuggestion.default_price} MAD</div>
                                </AlertDescription>
                            </Alert>
                        ) : null}

                        {/* ── Per-student free offer eligibility ── */}
                        {selectedStudentId && !isEnrollingInFreeCourse && globalOffer?.enabled && globalOffer?.free_course && (
                            <>
                                {loadingOfferSettings ? (
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>{t('dialogs.enrollStudent.checkingEligibility')}</span>
                                    </div>
                                ) : offerSettings?.can_add_free_course ? (
                                    /* ELIGIBLE — big checkbox card */
                                    <div
                                        className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                                            includeFreeCourse
                                                ? "border-green-400 bg-green-50"
                                                : "border-dashed border-muted-foreground/30 hover:border-green-300"
                                        }`}
                                        onClick={() => setIncludeFreeCourse(!includeFreeCourse)}
                                    >
                                        <Checkbox
                                            id="include-free-course"
                                            checked={includeFreeCourse}
                                            onCheckedChange={(checked) => setIncludeFreeCourse(Boolean(checked))}
                                            className="mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Gift className="h-4 w-4 text-green-600" />
                                                <span className="font-semibold text-sm text-green-800">
                                                    {t('dialogs.enrollStudent.addFreePrefix')} {offerSettings.free_course?.name}
                                                </span>
                                                <Badge className="bg-green-100 text-green-700 text-xs border-0">{t('dialogs.enrollStudent.free')}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {`${t('dialogs.enrollStudent.eligibleDescriptionPrefix')} ${offerSettings.free_course?.name}`}
                                            </p>
                                        </div>
                                        {includeFreeCourse && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                                    </div>
                                ) : offerSettings && !offerSettings.can_add_free_course ? (
                                    /* NOT ELIGIBLE — small info note */
                                    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            {offerSettings.existing_free_course_count! >= offerSettings.max_times!
                                                ? `${t('dialogs.enrollStudent.alreadyReceivedPrefix')} ${globalOffer?.free_course?.name || 'course'}`
                                                : `${t('dialogs.enrollStudent.alreadyEnrolledPrefix')} ${globalOffer?.free_course?.name || 'course'}`}
                                        </span>
                                    </div>
                                ) : null}
                            </>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="subscriptionType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('dialogs.enrollStudent.plan')}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('dialogs.enrollStudent.plan')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="MONTHLY">{t('dialogs.enrollStudent.monthly')}</SelectItem>
                                                <SelectItem value="QUARTERLY">{t('dialogs.enrollStudent.quarterly')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>{t('dialogs.enrollStudent.startDate')}</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="customPrice"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Final Price (MAD)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        You can override the suggested price here.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Any special notes..." className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {includeFreeCourse
                                    ? `${t('dialogs.enrollStudent.enrollWithFreePrefix')} ${offerSettings?.free_course?.name || '...'}`
                                    : t('dialogs.enrollStudent.enrollStudent')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
