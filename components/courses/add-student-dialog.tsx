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
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, Wand2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

    // Fetch students removed - handled by AsyncSelect

    // Reset price to course default
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

                    // Auto-fill suggested price
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
                    toast.success("Student enrolled and free Solfege added")
                } catch (freeCourseError: any) {
                    const detail =
                        freeCourseError?.response?.data?.non_field_errors?.[0] ||
                        freeCourseError?.response?.data?.detail ||
                        "Could not add free Solfege course automatically"
                    toast.warning(`Main enrollment created. ${detail}`)
                }
            } else {
                toast.success("Student enrolled successfully")
            }

            onSuccess()
            onOpenChange(false)
            form.reset()
            setOfferSettings(null)
            setIncludeFreeCourse(false)
        } catch (error: any) {
            toast.error(error.response?.data?.non_field_errors?.[0] || "Failed to enroll student")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Enroll Student</DialogTitle>
                    <DialogDescription>
                        Add a student to {course?.name}. Check suggested pricing below.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="studentId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Student</FormLabel>
                                    <AsyncSelect
                                        endpoint="/users/students/"
                                        label="Student"
                                        value={field.value}
                                        onChange={field.onChange}
                                        renderLabel={(item: any) => `${item.user.first_name} ${item.user.last_name}`}
                                        renderValue={(item: any) => item.id}
                                        placeholder="Select a student"
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Pricing Suggestion Alert */}
                        {suggestingPrice ? (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Calculating price...</span>
                            </div>
                        ) : pricingSuggestion && pricingSuggestion.is_promotional ? (
                            <Alert className="bg-green-50 border-green-200">
                                <Wand2 className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">Promotion Available!</AlertTitle>
                                <AlertDescription className="text-green-700 text-xs mt-1">
                                    {pricingSuggestion.reason}
                                    <div className="font-bold mt-1">Suggested Price: {pricingSuggestion.suggested_price} MAD</div>
                                </AlertDescription>
                            </Alert>
                        ) : pricingSuggestion ? (
                            <Alert className="bg-blue-50 border-blue-200">
                                <AlertTitle className="text-blue-800">Standard Pricing</AlertTitle>
                                <AlertDescription className="text-blue-700 text-xs">
                                    Standard course price applies.
                                    <div className="font-bold mt-1">Default Price: {pricingSuggestion.default_price} MAD</div>
                                </AlertDescription>
                            </Alert>
                        ) : null}

                        {loadingOfferSettings && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Checking free Solfege eligibility...</span>
                            </div>
                        )}

                        {!loadingOfferSettings &&
                            offerSettings?.enabled &&
                            offerSettings?.free_course &&
                            Number(offerSettings.free_course_id) !== Number(course?.id) &&
                            offerSettings?.can_add_free_course && (
                                <div className="flex items-start space-x-3 rounded-md border p-3">
                                    <Checkbox
                                        id="include-free-course"
                                        checked={includeFreeCourse}
                                        onCheckedChange={(checked) => setIncludeFreeCourse(Boolean(checked))}
                                    />
                                    <div className="space-y-1">
                                        <FormLabel htmlFor="include-free-course" className="cursor-pointer">
                                            Add free {offerSettings.free_course.name} course
                                        </FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                            Suggested for first enrollment. You can uncheck it.
                                        </p>
                                    </div>
                                </div>
                            )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="subscriptionType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Plan</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select plan" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
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
                                        <FormLabel>Start Date</FormLabel>
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
                                Enroll Student
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
