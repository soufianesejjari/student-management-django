"use client"

import { useEffect, useState } from "react"
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
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { AsyncSelect } from "@/components/ui/async-select"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const sessionSchema = z.object({
    day_of_week: z.string().min(1, "Day is required"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    room: z.number({ required_error: "Room is required" }),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().optional(),
})

type SessionFormValues = z.infer<typeof sessionSchema>

interface SessionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    courseId: number
    session?: any
    onSuccess: () => void
}

export function SessionDialog({
    open,
    onOpenChange,
    courseId,
    session,
    onSuccess,
}: SessionDialogProps) {
    const [conflict, setConflict] = useState<any>(null)
    const [isChecking, setIsChecking] = useState(false)
    const [suggestedSlots, setSuggestedSlots] = useState<any[]>([])
    const [isSuggesting, setIsSuggesting] = useState(false)
    const [teacher, setTeacher] = useState<number | null>(null)

    const form = useForm<SessionFormValues>({
        resolver: zodResolver(sessionSchema),
        defaultValues: {
            day_of_week: "0",
            start_time: "10:00",
            end_time: "11:00",
            start_date: new Date().toISOString().split('T')[0],
            end_date: "",
        },
    })

    useEffect(() => {
        if (open && session) {
            form.reset({
                day_of_week: session.day_of_week.toString(),
                start_time: session.start_time,
                end_time: session.end_time,
                room: session.room,
                start_date: session.start_date,
                end_date: session.end_date || "",
            })
        } else if (open) {
            form.reset({
                day_of_week: "0",
                start_time: "10:00",
                end_time: "11:00",
                start_date: new Date().toISOString().split('T')[0],
                end_date: "",
            })
        }
    }, [session, form, open])

    // Fetch course to get teacher
    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const course = await api.courses.get(courseId.toString())
                setTeacher(course.default_teacher)
            } catch (e) {
                console.error("Failed to fetch course", e)
            }
        }
        if (open) {
            fetchCourse()
        }
    }, [courseId, open])

    // Check availability
    const watchedSchedule = form.watch(["day_of_week", "start_time", "end_time", "room"])
    useEffect(() => {
        const [day_of_week, start_time, end_time, room] = watchedSchedule

        if (day_of_week && start_time && end_time && room && teacher) {
            const check = async () => {
                setIsChecking(true)
                setConflict(null)
                try {
                    const res = await api.planning.checkAvailability({
                        teacher_id: teacher,
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
            const timer = setTimeout(check, 500)
            return () => clearTimeout(timer)
        }
    }, [JSON.stringify(watchedSchedule), teacher])

    const handleSuggestSlots = async () => {
        const day = form.getValues("day_of_week")

        if (!teacher || !day) {
            return
        }

        setIsSuggesting(true)
        try {
            const slots = await api.planning.suggestSlots({
                teacher_id: teacher,
                day_of_week: Number(day),
                duration_minutes: 60
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

    const onSubmit = async (values: SessionFormValues) => {
        try {
            const payload = {
                course: courseId,
                teacher: teacher,
                day_of_week: Number(values.day_of_week),
                start_time: values.start_time,
                end_time: values.end_time,
                room: values.room,
                start_date: values.start_date,
                end_date: values.end_date || null,
            }

            if (session) {
                await api.patch(`/planning/sessions/${session.id}/`, payload)
            } else {
                await api.planning.createSession(payload)
            }

            onSuccess()
            onOpenChange(false)
            form.reset()
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || "Failed to save schedule"
            toast.error(errorMsg)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{session ? "Edit" : "Add"} Schedule</DialogTitle>
                    <DialogDescription>
                        Configure the weekly class session
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            disabled={isSuggesting || !teacher || !form.getValues("day_of_week")}
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="day_of_week"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Day</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
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
                                name="room"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Room</FormLabel>
                                        <AsyncSelect
                                            endpoint="/planning/rooms/"
                                            label="Room"
                                            value={field.value}
                                            onChange={field.onChange}
                                            renderLabel={(item: any) => `${item.name}`}
                                            renderValue={(item: any) => item.id}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="start_date"
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

                            <FormField
                                control={form.control}
                                name="end_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>End Date (Optional)</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {session ? "Update" : "Create"} Schedule
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
