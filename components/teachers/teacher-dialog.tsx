"use client"

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
import { useForm } from "react-hook-form"
import { useEffect, useRef, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { useTranslations } from "next-intl"

const teacherSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    cin: z.string().min(1, "CIN is required"),
    speciality: z.string().min(1, "Speciality is required"),
    phone: z.string().min(1, "Phone is required"),
    hourly_rate: z.coerce.number().min(0, "Hourly rate must be >= 0"),
})

type TeacherFormValues = z.infer<typeof teacherSchema>

interface TeacherDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    teacher?: any // If present, edit mode
    onSubmit: (data: TeacherFormValues) => Promise<void>
}

export function TeacherDialog({
    open,
    onOpenChange,
    teacher,
    onSubmit,
}: TeacherDialogProps) {
    const t = useTranslations()
    const submitLock = useRef(false)
    const [isSaving, setIsSaving] = useState(false)
    const form = useForm<TeacherFormValues>({
        resolver: zodResolver(teacherSchema),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            cin: "",
            speciality: "",
            phone: "",
            hourly_rate: 0,
        },
    })

    useEffect(() => {
        if (teacher) {
            form.reset({
                first_name: teacher.user?.first_name || "",
                last_name: teacher.user?.last_name || "",
                email: teacher.user?.email || "",
                cin: teacher.cin || "",
                speciality: teacher.speciality || "",
                phone: teacher.phone || "",
                hourly_rate: teacher.hourly_rate || 0,
            })
        } else {
            form.reset({
                first_name: "",
                last_name: "",
                email: "",
                cin: "",
                speciality: "",
                phone: "",
                hourly_rate: 0,
            })
        }
    }, [teacher, form, open])

    const handleSubmit = async (data: TeacherFormValues) => {
        if (submitLock.current) return

        submitLock.current = true
        setIsSaving(true)
        try {
            await onSubmit(data)
            onOpenChange(false)
            form.reset()
        } finally {
            submitLock.current = false
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{teacher ? t('teachers.editTeacher') : t('teachers.addTeacher')}</DialogTitle>
                    <DialogDescription>
                        {teacher
                            ? t('teachers.editTeacherDescription')
                            : t('teachers.addTeacherDescription')}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="first_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teachers.firstName')} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('teachers.firstNamePlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="last_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teachers.lastName')} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('teachers.lastNamePlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teachers.email')} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('teachers.emailPlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cin"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teachers.cin')} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('teachers.cin')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="speciality"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teachers.specialty')} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('teachers.specialtyPlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teachers.phone')} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('teachers.phone')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="hourly_rate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teachers.hourlyRate')} *</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSaving}>
                                {teacher ? t('common.saveChanges') : t('teachers.addTeacher')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
