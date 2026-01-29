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
import { Label } from "@/components/ui/label"
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
import { useTranslations } from "next-intl"

const studentSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    username: z.string().min(1, "Username is required"),
    // Include other fields as necessary (e.g. parent info)
})

type StudentFormValues = z.infer<typeof studentSchema>

interface StudentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    student?: any // If present, edit mode
    onSubmit: (data: StudentFormValues) => Promise<void>
}

export function StudentDialog({
    open,
    onOpenChange,
    student,
    onSubmit,
}: StudentDialogProps) {
    const t = useTranslations()
    const form = useForm<StudentFormValues>({
        resolver: zodResolver(studentSchema),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            username: "",
        },
    })

    useEffect(() => {
        if (student) {
            form.reset({
                first_name: student.user.first_name,
                last_name: student.user.last_name,
                email: student.user.email,
                username: student.user.username,
            })
        } else {
            form.reset({
                first_name: "",
                last_name: "",
                email: "",
                username: "",
            })
        }
    }, [student, form, open])

    const handleSubmit = async (data: StudentFormValues) => {
        await onSubmit(data)
        onOpenChange(false)
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{student ? t('students.editStudent') : t('students.addStudent')}</DialogTitle>
                    <DialogDescription>
                        {student
                            ? t('students.editStudentDescription')
                            : t('students.addStudentDescription')}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="first_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('students.firstName')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('students.firstNamePlaceholder')} {...field} />
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
                                    <FormLabel>{t('students.lastName')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('students.lastNamePlaceholder')} {...field} />
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
                                    <FormLabel>{t('students.email')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('students.emailPlaceholder')} {...field} />
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
                                    <FormLabel>{t('students.username')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('students.usernamePlaceholder')} {...field} />
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
