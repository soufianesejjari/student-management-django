"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AsyncSelect } from "@/components/ui/async-select"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@radix-ui/react-alert-dialog"
import { AlertDialogFooter, AlertDialogHeader } from "../ui/alert-dialog"


const sessionSchema = z.object({
    course: z.number({ required_error: "Course is required" }),
    teacher: z.number({ required_error: "Teacher is required" }),
    room: z.number({ required_error: "Room is required" }),
    start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    start_date: z.date({ required_error: "Start date is required" }),
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
            start_date: new Date(),
            start_time: "10:00",
            end_time: "11:00",
        },
    })


    const onSubmit = async (data: SessionFormValues, force = false) => {
        setIsSubmitting(true)
        try {
            const jsDay = data.start_date.getDay()
            const dayOfWeek = (jsDay + 6) % 7
            const endDate = format(data.start_date, "yyyy-MM-dd")

            const payload = {
                ...data,
                day_of_week: dayOfWeek,
                start_date: format(data.start_date, "yyyy-MM-dd"),
                end_date: endDate,
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
                            Create a single class session.
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
                                        <FormItem>
                                            <FormLabel>Start Date</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="date" 
                                                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                                    onChange={(e) => {
                                                        const date = e.target.value ? new Date(e.target.value) : new Date()
                                                        field.onChange(date)
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

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
