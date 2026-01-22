"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"

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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AsyncSelect } from "@/components/ui/async-select"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const sessionSchema = z.object({
    course: z.number({ required_error: "Course is required" }),
    teacher: z.number({ required_error: "Teacher is required" }),
    room: z.number({ required_error: "Room is required" }),
    day_of_week: z.string({ required_error: "Day is required" }),
    start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    start_date: z.date({ required_error: "Start date is required" }),
    end_date: z.date().optional().nullable(),
    is_indefinite: z.boolean().default(false),
})

type SessionFormValues = z.infer<typeof sessionSchema>

interface SessionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function SessionDialog({ open, onOpenChange, onSuccess }: SessionDialogProps) {
    const [conflictData, setConflictData] = useState<any>(null)
    const [isForceDialogOpen, setIsForceDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<SessionFormValues>({
        resolver: zodResolver(sessionSchema),
        defaultValues: {
            is_indefinite: false,
        },
    })

    const onSubmit = async (data: SessionFormValues, force = false) => {
        setIsSubmitting(true)
        try {
            const payload = {
                ...data,
                day_of_week: parseInt(data.day_of_week),
                start_date: format(data.start_date, "yyyy-MM-dd"),
                end_date: data.is_indefinite || !data.end_date ? null : format(data.end_date, "yyyy-MM-dd"),
                force_conflicts: force,
            }

            await api.post("/planning/sessions/", payload)

            toast.success("Session created successfully")
            onOpenChange(false)
            onSuccess()
            setConflictData(null)
            setIsForceDialogOpen(false)
            form.reset()
        } catch (error: any) {
            if (error.response?.status === 409 && error.response?.data?.can_force) {
                setConflictData(error.response.data)
                setIsForceDialogOpen(true)
            } else {
                console.error(error)
                toast.error(error.response?.data?.detail || "Failed to create session")
                // Check for specific field errors
                if (error.response?.data) {
                    // map backend errors to form fields if possible
                }
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleForceSubmit = () => {
        form.handleSubmit((data) => onSubmit(data, true))()
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Schedule Class Session</DialogTitle>
                        <DialogDescription>
                            Create a recurring class session.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))} className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="course"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Course</FormLabel>
                                            <AsyncSelect
                                                endpoint="/academics/courses/"
                                                label="Course"
                                                value={field.value}
                                                onChange={field.onChange}
                                                renderLabel={(item: any) => item.name}
                                                renderValue={(item: any) => item.id}
                                                placeholder="Select course"
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="teacher"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Teacher</FormLabel>
                                            <AsyncSelect
                                                endpoint="/users/teachers/"
                                                label="Teacher"
                                                value={field.value}
                                                onChange={field.onChange}
                                                renderLabel={(item: any) => `${item.user.first_name} ${item.user.last_name}`}
                                                renderValue={(item: any) => item.id}
                                                placeholder="Select teacher"
                                            />
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
                                                renderLabel={(item: any) => `${item.name} (${item.capacity})`}
                                                renderValue={(item: any) => item.id}
                                                placeholder="Select room"
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="start_date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Start Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="end_date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>End Date (Optional)</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            disabled={form.watch("is_indefinite")}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                (!field.value && !form.watch("is_indefinite")) && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {form.watch("is_indefinite") ? (
                                                                <span>Indefinite</span>
                                                            ) : field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value || undefined}
                                                        onSelect={field.onChange}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>


                            <FormField
                                control={form.control}
                                name="is_indefinite"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Recur Indefinitely
                                            </FormLabel>
                                            <FormDescription>
                                                This class will repeat every week until manually cancelled.
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Schedule
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent >
            </Dialog >

            <AlertDialog open={isForceDialogOpen} onOpenChange={setIsForceDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">Scheduling Conflicts Detected</AlertDialogTitle>
                        <AlertDialogDescription>
                            The following students have conflicting classes at this time:
                            <ul className="list-disc pl-5 mt-2 mb-2 text-sm text-foreground">
                                {conflictData?.conflicts?.map((c: any, i: number) => (
                                    <li key={i}>
                                        <strong>{c.student_name}</strong> - {c.conflicting_course}
                                    </li>
                                ))}
                            </ul>
                            Do you want to force this schedule anyway?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleForceSubmit} className="bg-destructive hover:bg-destructive/90">
                            Force Schedule
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
