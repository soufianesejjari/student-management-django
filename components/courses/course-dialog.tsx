"use client"

import { useEffect } from "react"
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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AsyncSelect } from "@/components/ui/async-select"
import { useTranslations } from "next-intl"

const courseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    subject: z.union([z.string(), z.number()], { required_error: "Subject is required" }),
    default_teacher: z.union([z.string(), z.number()]).nullable(),
    level: z.string().min(1, "Level is required"),
    price: z.coerce.number().min(0, "Price must be positive"),
    status: z.string(),
})

type CourseFormValues = z.infer<typeof courseSchema>

interface CourseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    course?: any
    onSubmit: (data: CourseFormValues) => Promise<void>
}

export function CourseDialog({ open, onOpenChange, course, onSubmit }: CourseDialogProps) {
    const t = useTranslations()
    const form = useForm<CourseFormValues>({
        resolver: zodResolver(courseSchema),
        defaultValues: {
            name: "",
            subject: "",
            default_teacher: null,
            level: "BEGINNER",
            price: 0,
            status: "ACTIVE",
        },
    })

    useEffect(() => {
        if (!open) return

        form.reset(course ? {
            name: course.name,
            subject: course.subject,
            default_teacher: course.default_teacher ?? null,
            level: course.level,
            price: course.price,
            status: course.status,
        } : {
            name: "",
            subject: "",
            default_teacher: null,
            level: "BEGINNER",
            price: 0,
            status: "ACTIVE",
        })
    }, [course, form, open])

    const handleFormSubmit = async (data: CourseFormValues) => {
        await onSubmit(data)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {course ? t('dialogs.course.editTitle') : t('dialogs.course.createTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {course ? t('dialogs.course.step1Desc') : t('dialogs.course.createDesc')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('dialogs.course.courseName')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('dialogs.course.courseNamePlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>{t('dialogs.course.subject')}</FormLabel>
                                        <FormControl>
                                            <AsyncSelect
                                                endpoint="/academics/subjects/"
                                                label={t('dialogs.course.subject')}
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
                                        <FormLabel>{t('dialogs.course.teacherOptional')}</FormLabel>
                                        <FormControl>
                                            <AsyncSelect
                                                endpoint="/users/teachers/"
                                                label={t('dialogs.course.teacher')}
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                                renderLabel={(item: any) => `${item.user.first_name} ${item.user.last_name}`}
                                                renderValue={(item: any) => item.id}
                                                placeholder={t('dialogs.course.teacherLater')}
                                            />
                                        </FormControl>
                                        <FormDescription>{t('dialogs.course.teacherLaterDesc')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="level"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('dialogs.course.level')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('dialogs.course.selectLevel')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="BEGINNER">{t('dialogs.course.beginner')}</SelectItem>
                                                <SelectItem value="INTERMEDIATE">{t('dialogs.course.intermediate')}</SelectItem>
                                                <SelectItem value="ADVANCED">{t('dialogs.course.advanced')}</SelectItem>
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
                                        <FormLabel>{t('dialogs.course.priceCurrency')}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="0" step="0.01" {...field} />
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
                                        <FormLabel>{t('dialogs.course.status')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('dialogs.course.selectStatus')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">{t('dialogs.course.active')}</SelectItem>
                                                <SelectItem value="INACTIVE">{t('dialogs.course.inactive')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {!course && (
                            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                                {t('dialogs.course.planningLaterDesc')}
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {course ? t('dialogs.course.saveChanges') : t('dialogs.course.createCourse')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
