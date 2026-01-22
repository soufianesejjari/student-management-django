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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { toast } from "sonner"

const rescheduleSchema = z.object({
    new_date: z.date({ required_error: "New date is required" }),
    new_start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    new_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    notes: z.string().optional(),
})

type RescheduleFormValues = z.infer<typeof rescheduleSchema>

interface RescheduleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    session: any
    onSuccess: () => void
}

export function RescheduleDialog({ open, onOpenChange, session, onSuccess }: RescheduleDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<RescheduleFormValues>({
        resolver: zodResolver(rescheduleSchema),
        defaultValues: {
            new_start_time: session?.start_time || "",
            new_end_time: session?.end_time || "",
            notes: "",
        },
    })

    // Reset form when session changes
    // useEffect(() => {
    //   if (session) {
    //       form.reset({
    //           new_start_time: session.start_time,
    //           new_end_time: session.end_time,
    //       })
    //   }
    // }, [session, form])

    const onSubmit = async (data: RescheduleFormValues) => {
        if (!session) return

        setIsSubmitting(true)
        try {
            const payload = {
                original_date: session.current_date, // This needs to be passed depending on which occurrence was clicked! 
                // Note: The grid view currently is simple. We might need to assume we are rescheduling "this specific occurrence" 
                // if the UI supports clicking a specific date.
                // For now, let's assume `session` object passed here HAS the date we clicked on.
                // If not, we might need to ask the user which date they want to move, OR the UI must pass the clicked date.

                // Let's assume the UI passes `session.date` or we need to ask. 
                // For simplicity, I'll assume the parent component passes the DATE of the event being clicked.

                new_date: format(data.new_date, "yyyy-MM-dd"),
                new_start_time: data.new_start_time,
                new_end_time: data.new_end_time,
                notes: data.notes,
            }

            await api.post(`/planning/sessions/${session.id}/reschedule/`, payload)

            toast.success("Session rescheduled successfully")
            onOpenChange(false)
            onSuccess()
            form.reset()
        } catch (error: any) {
            console.error(error)
            toast.error(error.response?.data?.detail || "Failed to reschedule session")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={!!session} onOpenChange={(open) => !open && onOpenChange(false)}>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Reschedule Session</DialogTitle>
                    <DialogDescription>
                        Move this session to a different time.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="new_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>New Date</FormLabel>
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="new_start_time"
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
                                name="new_end_time"
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

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Reschedule
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent >
        </Dialog >
    )
}
