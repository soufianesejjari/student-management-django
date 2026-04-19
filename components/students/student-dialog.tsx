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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from "next-intl"

const studentSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    username: z.string().min(1, "Username is required"),
    phone: z.string().min(1, "Phone is required"),
    address: z.string().min(1, "Address is required"),
    date_of_birth: z.string().optional(),
    age_group: z.enum(["2-5ans", "6-12ans", "Adulte"]).default("6-12ans"),
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
            phone: "",
            address: "",
            date_of_birth: "",
            age_group: "6-12ans",
        },
    })

    useEffect(() => {
        if (student) {
            form.reset({
                first_name: student.user?.first_name || "",
                last_name: student.user?.last_name || "",
                email: student.user?.email || "",
                username: student.user?.username || "",
                phone: student.phone || "",
                address: student.address || "",
                date_of_birth: student.date_of_birth || "",
                age_group: student.age_group || "6-12ans",
            })
        } else {
            form.reset({
                first_name: "",
                last_name: "",
                email: "",
                username: "",
                phone: "",
                address: "",
                date_of_birth: "",
                age_group: "6-12ans",
            })
        }
    }, [student, form, open])

    const handleSubmit = async (data: StudentFormValues) => {
        const payload = { ...data }
        if (!payload.date_of_birth) delete payload.date_of_birth
        await onSubmit(payload)
        onOpenChange(false)
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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
                                    <FormLabel>{t('students.firstName')} *</FormLabel>
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
                                    <FormLabel>{t('students.lastName')} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('students.lastNamePlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('students.address')} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('students.addressPlaceholder')} {...field} />
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
                                    <FormLabel>{t('students.phone')} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('students.phonePlaceholder')} {...field} />
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
                                    <FormLabel>{t('students.username')} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('students.usernamePlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="date_of_birth"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('students.dateOfBirth')}</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="age_group"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('students.ageGroup')} *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="2-5ans">{t('students.ageGroup2to5')}</SelectItem>
                                            <SelectItem value="6-12ans">{t('students.ageGroup6to12')}</SelectItem>
                                            <SelectItem value="Adulte">{t('students.ageGroupAdult')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">
                                {student ? t('common.saveChanges') : t('students.addStudent')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
