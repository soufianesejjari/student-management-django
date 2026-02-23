"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AsyncSelect } from "@/components/ui/async-select"
import { api } from "@/lib/api"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// --- Schema Definition ---
const courseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    subject: z.union([z.string(), z.number()], { required_error: "Subject is required" }),
    default_teacher: z.union([z.string(), z.number()]).nullable(),
    level: z.string().min(1, "Level is required"),
    price: z.coerce.number().min(0, "Price must be positive"),
    status: z.string(),
    // Schedule fields
    create_schedule: z.boolean().default(false),
    day_of_week: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    room: z.number().optional(),
}).superRefine((data, ctx) => {
    // Custom refinement for conditional schedule validation
    if (data.create_schedule) {
        if (!data.day_of_week) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Day is required", path: ["day_of_week"] })
        }
        if (!data.start_time) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Start time is required", path: ["start_time"] })
        }
        if (!data.end_time) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End time is required", path: ["end_time"] })
        }
        if (!data.room) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Room is required", path: ["room"] })
        }
    }
})

type CourseFormValues = z.infer<typeof courseSchema>

interface CourseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    course?: any // Ideally replace 'any' with your Course type
    onSubmit: (data: CourseFormValues) => Promise<void>
}

export function CourseDialog({
    open,
    onOpenChange,
    course,
    onSubmit,
}: CourseDialogProps) {
    const [step, setStep] = useState(1)
    const [conflict, setConflict] = useState<{ is_available: boolean; reason?: string; details?: string } | null>(null)
    const [isChecking, setIsChecking] = useState(false)
    const [suggestedSlots, setSuggestedSlots] = useState<any[]>([])
    const [isSuggesting, setIsSuggesting] = useState(false)

    const form = useForm<CourseFormValues>({
        resolver: zodResolver(courseSchema),
        defaultValues: {
            name: "",
            subject: "",
            default_teacher: null,
            level: "BEGINNER",
            price: 0,
            status: "ACTIVE",
            create_schedule: false,
            day_of_week: "0",
            start_time: "",
            end_time: "",
        },
    })

    // Reset form when dialog opens/closes or course changes
    useEffect(() => {
        if (open) {
            if (course) {
                form.reset({
                    name: course.name,
                    subject: course.subject,
                    default_teacher: course.default_teacher ?? null,
                    level: course.level,
                    price: course.price,
                    status: course.status,
                    create_schedule: false, // Usually false when editing existing course
                })
            } else {
                form.reset({
                    name: "",
                    subject: "",
                    default_teacher: null,
                    level: "BEGINNER",
                    price: 0,
                    status: "ACTIVE",
                    create_schedule: true,
                    day_of_week: "0",
                    start_time: "10:00",
                    end_time: "11:00",
                })
            }
            setStep(1)
        }
    }, [course, form, open])

    const handleFormSubmit = async (data: CourseFormValues) => {
        try {
            await onSubmit(data)
            onOpenChange(false)
        } catch (error) {
            console.error("Failed to submit", error)
        }
    }

    const nextStep = async () => {
        // Trigger validation for step 1 fields only
        const step1Valid = await form.trigger(["name", "subject", "level", "price", "status"])
        if (step1Valid) {
            setStep(2)
        }
    }

    const prevStep = () => setStep(1)

    // Check Availability Effect
    const watchedSchedule = form.watch(["create_schedule", "day_of_week", "start_time", "end_time", "room", "default_teacher"])
    useEffect(() => {
        const [create_schedule, day_of_week, start_time, end_time, room, default_teacher] = watchedSchedule

        if (create_schedule && day_of_week && start_time && end_time && room && default_teacher) {
            const check = async () => {
                setIsChecking(true)
                setConflict(null)
                try {
                    const res = await api.planning.checkAvailability({
                        teacher_id: Number(default_teacher),
                        room_id: Number(room),
                        day_of_week: Number(day_of_week),
                        start_time,
                        end_time
                    })
                    if (!res.is_available) {
                        setConflict(res)
                    }
                } catch (e) {
                    console.error("Check failed", e)
                } finally {
                    setIsChecking(false)
                }
            }
            // Debounce slightly
            const timer = setTimeout(check, 500)
            return () => clearTimeout(timer)
        } else {
            setConflict(null)
        }
    }, [JSON.stringify(watchedSchedule)])

    const handleSuggestSlots = async () => {
        const teacher = form.getValues("default_teacher")
        const day = form.getValues("day_of_week")

        if (!teacher || !day) {
            return // Need teacher and day to suggest
        }

        setIsSuggesting(true)
        try {
            const slots = await api.planning.suggestSlots({
                teacher_id: Number(teacher),
                day_of_week: Number(day),
                duration_minutes: 60 // Default 1 hour
            })
            setSuggestedSlots(slots)
        } catch (e) {
            console.error("Failed to suggest slots", e)
        } finally {
            setIsSuggesting(false)
        }
    }

    const applySuggestedSlot = (slot: any) => {
        form.setValue("start_time", slot.start)
        form.setValue("end_time", slot.end)
        setSuggestedSlots([])
    }

    // Check if we should show the schedule form
    const isCreatingNew = !course
    const createSchedule = form.watch("create_schedule")
    const showSchedule = isCreatingNew && createSchedule

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {course ? "Edit Course" : "Create New Course"}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                            (Step {step} of {isCreatingNew ? 2 : 1})
                        </span>
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1 ? "Enter course details." : "Configure the official schedule."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">

                        {/* STEP 1 */}
                        <div className={step === 1 ? "block space-y-4" : "hidden"}>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Piano Beginner 1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Subject</FormLabel>
                                            <FormControl>
                                                <AsyncSelect
                                                    endpoint="/academics/subjects/"
                                                    label="Subject"
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                    renderLabel={(item: any) => item.name}
                                                    renderValue={(item: any) => item.id}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="default_teacher"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Teacher</FormLabel>
                                            <FormControl>
                                                <AsyncSelect
                                                    endpoint="/users/teachers/"
                                                    label="Teacher"
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                    renderLabel={(item: any) => `${item.user.first_name} ${item.user.last_name}`}
                                                    renderValue={(item: any) => item.id}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="level"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Level</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select level" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                                                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                                                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Price (MAD)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* STEP 2 */}
                        {isCreatingNew && (
                            <div className={step === 2 ? "block space-y-4" : "hidden"}>
                                <FormField
                                    control={form.control}
                                    name="create_schedule"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Create Official Schedule</FormLabel>
                                                <FormDescription>
                                                    Automatically create the planning schedule for this course.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {showSchedule && (
                                    <div className="rounded-md bg-muted/50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <h4 className="text-sm font-medium">Official Schedule</h4>

                                        {/* Status & Alerts */}
                                        {isChecking && (
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                Checking availability...
                                            </div>
                                        )}

                                        {conflict && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle>Schedule Conflict</AlertTitle>
                                                <AlertDescription>
                                                    {conflict.details || conflict.reason}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Suggest Slots Button */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSuggestSlots}
                                            disabled={isSuggesting || !form.getValues("default_teacher") || !form.getValues("day_of_week")}
                                        >
                                            {isSuggesting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                            Suggest Available Slots
                                        </Button>

                                        {/* Display Suggested Slots */}
                                        {suggestedSlots.length > 0 && (
                                            <div className="border rounded-md p-3 space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground">Recommended Slots:</p>
                                                {suggestedSlots.map((slot, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer"
                                                        onClick={() => applySuggestedSlot(slot)}
                                                    >
                                                        <div>
                                                            <div className="font-medium text-sm">{slot.start} - {slot.end}</div>
                                                            <div className="text-xs text-muted-foreground">{slot.reason}</div>
                                                        </div>
                                                        <Button type="button" size="sm" variant="ghost">Apply</Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}


                                        <FormField
                                            control={form.control}
                                            name="room"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Room</FormLabel>
                                                    <AsyncSelect
                                                        endpoint="/planning/rooms/"
                                                        label="Room"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        renderLabel={(item: any) => `${item.name} (${item.capacity})`}
                                                        renderValue={(item: any) => item.id}
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="day_of_week"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Day</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select day" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="0">Monday</SelectItem>
                                                                <SelectItem value="1">Tuesday</SelectItem>
                                                                <SelectItem value="2">Wednesday</SelectItem>
                                                                <SelectItem value="3">Thursday</SelectItem>
                                                                <SelectItem value="4">Friday</SelectItem>
                                                                <SelectItem value="5">Saturday</SelectItem>
                                                                <SelectItem value="6">Sunday</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="start_time"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Start Time</FormLabel>
                                                        <FormControl>
                                                            <Input type="time" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="end_time"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>End Time</FormLabel>
                                                        <FormControl>
                                                            <Input type="time" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FOOTER */}
                        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>

                            <div className="flex gap-2">
                                {step === 2 && (
                                    <Button type="button" variant="ghost" onClick={prevStep}>
                                        Back
                                    </Button>
                                )}

                                {step === 1 && isCreatingNew ? (
                                    <Button type="button" onClick={nextStep}>
                                        Next
                                    </Button>
                                ) : (
                                    <Button type="submit">
                                        {course ? "Save Changes" : "Create Course"}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}