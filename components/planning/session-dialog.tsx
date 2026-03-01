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
import { useTranslations } from "next-intl"


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
    const t = useTranslations('schedule')
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

            toast.success(t('createSuccess'))
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
                toast.error(error.response?.data?.detail || t('createSessionError'))
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
                        <DialogTitle>{t('createTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('createDescription')}
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
                                            <FormLabel>{t('course')}</FormLabel>
                                            <AsyncSelect
                                                endpoint="/academics/courses/"
                                                label={t('course')}
                                                value={field.value}
                                                onChange={field.onChange}
                                                renderLabel={(item: any) => item.name}
                                                renderValue={(item: any) => item.id}
                                                placeholder={t('selectCourse')}
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
                                            <FormLabel>{t('teacher')}</FormLabel>
                                            <AsyncSelect
                                                endpoint="/users/teachers/"
                                                label={t('teacher')}
                                                value={field.value}
                                                onChange={field.onChange}
                                                renderLabel={(item: any) => `${item.user.first_name} ${item.user.last_name}`}
                                                renderValue={(item: any) => item.id}
                                                placeholder={t('selectTeacher')}
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
                                            <FormLabel>{t('room')}</FormLabel>
                                            <AsyncSelect
                                                endpoint="/planning/rooms/"
                                                label={t('room')}
                                                value={field.value}
                                                onChange={field.onChange}
                                                renderLabel={(item: any) => `${item.name} (${item.capacity})`}
                                                renderValue={(item: any) => item.id}
                                                placeholder={t('selectRoom')}
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
                                            <FormLabel>{t('startTime')}</FormLabel>
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
                                            <FormLabel>{t('endTime')}</FormLabel>
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
                                            <FormLabel>{t('startDate')}</FormLabel>
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
                                    {t('cancel')}
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('createSchedule')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent >
            </Dialog >

            <AlertDialog open={isForceDialogOpen} onOpenChange={setIsForceDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">{t('conflictsTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('conflictsDescription')}
                            <ul className="list-disc pl-5 mt-2 mb-2 text-sm text-foreground">
                                {conflictData?.conflicts?.map((c: any, i: number) => (
                                    <li key={i}>
                                        <strong>{c.student_name}</strong> - {c.conflicting_course}
                                    </li>
                                ))}
                            </ul>
                            {t('conflictsForceQuestion')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleForceSubmit} className="bg-destructive hover:bg-destructive/90">
                            {t('forceSchedule')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
