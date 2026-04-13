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
import { useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { useTranslations } from "next-intl"

const teacherSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    username: z.string().min(1, "Username is required"),
    speciality: z.string().min(1, "Speciality is required"),
    cin: z.string().min(1, "CIN is required"),
    phone: z.string().min(1, "Phone is required"),
    bio: z.string().optional(),
    hourly_rate: z.string().min(1, "Hourly rate is required"),
})

type TeacherFormValues = z.infer<typeof teacherSchema>

interface TeacherDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    teacher?: any
    onSubmit: (data: TeacherFormValues) => Promise<void>
}

export function TeacherDialog({
    open,
    onOpenChange,
    teacher,
    onSubmit,
}: TeacherDialogProps) {
    const t = useTranslations()
    const form = useForm<TeacherFormValues>({
        resolver: zodResolver(teacherSchema),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            username: "",
            speciality: "",
            bio: "",
            hourly_rate: "",
        },
    })

    useEffect(() => {
        if (teacher) {
            form.reset({
                first_name: teacher.user.first_name,
                last_name: teacher.user.last_name,
                email: teacher.user.email,
                username: teacher.user.username,
                speciality: teacher.speciality,
                bio: teacher.bio || "",
                hourly_rate: teacher.hourly_rate?.toString() || "",
            })
        } else {
            form.reset({
                first_name: "",
                last_name: "",
                email: "",
                username: "",
                speciality: "",
                bio: "",
                hourly_rate: "",
            })
        }
    }, [teacher, form, open])

    const handleSubmit = async (data: TeacherFormValues) => {
        await onSubmit(data)
        onOpenChange(false)
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
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
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="first_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('teachers.firstName')}</FormLabel>
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
                                        <FormLabel>{t('teachers.lastName')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('teachers.lastNamePlaceholder')} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teachers.email')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('teachers.emailPlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teachers.username')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('teachers.usernamePlaceholder')} {...field} />
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
                                    <FormLabel>{t('teachers.specialty')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('teachers.specialtyPlaceholder')} {...field} />
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
                                    <FormLabel>{t('teachers.hourlyRate')}</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="25.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teachers.bio')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('teachers.bioPlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">{t('common.saveChanges')}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
