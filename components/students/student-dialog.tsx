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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"

const studentSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().min(1, "Phone is required"),
    address: z.string().min(1, "Address is required"),
    date_of_birth: z.string().optional(),
    age_group: z.enum(["2-5ans", "6-12ans", "Adulte"]).default("6-12ans"),
    school_or_profession: z.string().optional(),
    registration_fee_status: z.enum(["PENDING", "PAID", "EXEMPT"]).default("PENDING"),
    insurance_fee_status: z.enum(["PENDING", "PAID", "EXEMPT"]).default("PENDING"),
    registration_fee_amount: z.string().optional(),
    insurance_fee_amount: z.string().optional(),
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
    const submitLock = useRef(false)
    const [isSaving, setIsSaving] = useState(false)
    const form = useForm<StudentFormValues>({
        resolver: zodResolver(studentSchema),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            address: "",
            date_of_birth: "",
            age_group: "6-12ans",
            school_or_profession: "",
            registration_fee_status: "PENDING",
            insurance_fee_status: "PENDING",
            registration_fee_amount: "",
            insurance_fee_amount: "",
        },
    })

    useEffect(() => {
        if (student) {
            form.reset({
                first_name: student.user?.first_name || "",
                last_name: student.user?.last_name || "",
                email: student.user?.email || "",
                phone: student.phone || "",
                address: student.address || "",
                date_of_birth: student.date_of_birth || "",
                age_group: student.age_group || "6-12ans",
                school_or_profession: student.school_or_profession || "",
                registration_fee_status: "PENDING",
                insurance_fee_status: "PENDING",
                registration_fee_amount: "",
                insurance_fee_amount: "",
            })
        } else {
            form.reset({
                first_name: "",
                last_name: "",
                email: "",
                phone: "",
                address: "",
                date_of_birth: "",
                age_group: "6-12ans",
                school_or_profession: "",
                registration_fee_status: "PENDING",
                insurance_fee_status: "PENDING",
                registration_fee_amount: "",
                insurance_fee_amount: "",
            })
        }
    }, [student, form, open])

    useEffect(() => {
        if (!open || student) return

        let cancelled = false
        api.enrollments.offerSettings()
            .then((settings) => {
                if (cancelled) return
                form.setValue("registration_fee_amount", String(settings.student_fees?.registration_fee ?? ""))
                form.setValue("insurance_fee_amount", String(settings.student_fees?.insurance_fee ?? ""))
            })
            .catch(() => {
                // Empty fields mean the backend will use its configured defaults.
            })

        return () => {
            cancelled = true
        }
    }, [open, student, form])

    const isAdult = form.watch("age_group") === "Adulte"

    const handleSubmit = async (data: StudentFormValues) => {
        if (submitLock.current) return

        submitLock.current = true
        setIsSaving(true)
        try {
            const payload: any = { ...data }
            if (!payload.date_of_birth) delete payload.date_of_birth
            if (student) {
                delete payload.registration_fee_status
                delete payload.insurance_fee_status
                delete payload.registration_fee_amount
                delete payload.insurance_fee_amount
            } else {
                if (payload.registration_fee_amount === "") delete payload.registration_fee_amount
                else payload.registration_fee_amount = Number(payload.registration_fee_amount)
                if (payload.insurance_fee_amount === "") delete payload.insurance_fee_amount
                else payload.insurance_fee_amount = Number(payload.insurance_fee_amount)
            }
            await onSubmit(payload)
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
                                    <Select onValueChange={field.onChange} value={field.value}>
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
                        <FormField
                            control={form.control}
                            name="school_or_profession"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {isAdult ? t('students.profession') : t('students.school')}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={isAdult
                                                ? t('students.professionPlaceholder')
                                                : t('students.schoolPlaceholder')}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {!student && (
                            <div className="grid grid-cols-1 gap-4 rounded-md border p-3">
                                <p className="text-sm font-medium">{t('students.defaultFees')}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="registration_fee_status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('students.registrationFee')}</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="PENDING">{t('students.feePending')}</SelectItem>
                                                        <SelectItem value="PAID">{t('students.feePaid')}</SelectItem>
                                                        <SelectItem value="EXEMPT">{t('students.feeExempt')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="registration_fee_amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('studentFees.amount')} (MAD)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" step="0.01" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="insurance_fee_status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('students.insuranceFee')}</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="PENDING">{t('students.feePending')}</SelectItem>
                                                        <SelectItem value="PAID">{t('students.feePaid')}</SelectItem>
                                                        <SelectItem value="EXEMPT">{t('students.feeExempt')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="insurance_fee_amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('studentFees.amount')} (MAD)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" step="0.01" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={isSaving}>
                                {student ? t('common.saveChanges') : t('students.addStudent')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
