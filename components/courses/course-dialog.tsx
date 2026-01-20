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
import { AsyncSelect } from "@/components/ui/async-select"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const courseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    subject: z.string().or(z.number()), // Subject ID
    default_teacher: z.string().or(z.number()).nullable(), // Teacher ID (nullable)
    level: z.string(),
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

export function CourseDialog({
    open,
    onOpenChange,
    course,
    onSubmit,
}: CourseDialogProps) {
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
        if (course) {
            form.reset({
                name: course.name,
                subject: course.subject, // Assuming ID is returned
                default_teacher: course.default_teacher ? course.default_teacher : null,
                level: course.level,
                price: course.price,
                status: course.status,
            })
        } else {
            form.reset({
                name: "",
                subject: "",
                default_teacher: null,
                level: "BEGINNER",
                price: 0,
                status: "ACTIVE",
            })
        }
    }, [course, form, open])

    const handleSubmit = async (data: CourseFormValues) => {
        // Need to ensure subject is ID.
        // AsyncSelect returns ID (number/string).
        await onSubmit(data)
        onOpenChange(false)
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{course ? "Edit Course" : "Add Course"}</DialogTitle>
                    <DialogDescription>
                        {course
                            ? "Modify course details."
                            : "Create a new course."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Course Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Piano Beginner 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl>
                                        <AsyncSelect
                                            endpoint="/academics/subjects/"
                                            label="Subject"
                                            value={field.value}
                                            onChange={field.onChange}
                                            renderLabel={(item: any) => item.name}
                                            renderValue={(item: any) => item.id}
                                            placeholder="Select subject"
                                            searchParam="search" // backend is using ?search=
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
                                    <FormLabel>Default Teacher</FormLabel>
                                    <FormControl>
                                        <AsyncSelect
                                            endpoint="/users/teachers/"
                                            label="Teacher"
                                            value={field.value || ""} // Handle null
                                            onChange={field.onChange}
                                            renderLabel={(item: any) => `${item.user.first_name} ${item.user.last_name}`}
                                            renderValue={(item: any) => item.id}
                                            placeholder="Select teacher"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="level"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Level</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select level" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="BEGINNER">Beginner</SelectItem>
                                                <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                                                <SelectItem value="ADVANCED">Advanced</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price (€)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit">Save changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
