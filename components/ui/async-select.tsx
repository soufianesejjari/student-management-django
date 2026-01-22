"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import useSWR from "swr"
import api from "@/lib/api"
import { useDebounce } from "@/hooks/useDebounce"

interface AsyncSelectProps {
    endpoint: string
    label: string
    value?: string | number | null
    onChange: (value: string | number) => void
    renderLabel: (item: any) => string
    renderValue: (item: any) => string | number
    searchParam?: string
    placeholder?: string
    disabled?: boolean
}

const fetcher = (url: string) => api.get(url).then((res) => res.data)

export function AsyncSelect({
    endpoint,
    label,
    value,
    onChange,
    renderLabel,
    renderValue,
    searchParam = "search",
    placeholder = "Select item...",
    disabled = false,
}: AsyncSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const debouncedQuery = useDebounce(query, 300)

    const { data: searchResults, isLoading } = useSWR(
        open ? `${endpoint}?${searchParam}=${debouncedQuery}` : null,
        fetcher,
        { keepPreviousData: true }
    )

    const items = Array.isArray(searchResults) ? searchResults : searchResults?.results || []

    const selectedItem = items.find((item: any) => renderValue(item) === value)
    const [displayLabel, setDisplayLabel] = React.useState<string>("")

    React.useEffect(() => {
        if (selectedItem) {
            setDisplayLabel(renderLabel(selectedItem))
        }
    }, [selectedItem, renderLabel])

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    {value ? (displayLabel || value) : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverPrimitive.Trigger>

            {/* CRITICAL FIX: 
               1. We do NOT use <PopoverPrimitive.Portal>. This keeps the content in the DOM flow 
                  of the Dialog, preventing the Focus Trap / Aria-Hidden conflict.
               2. We use 'z-[9999]' to ensure it floats above other dialog elements.
               3. We manually style the content to match shadcn's 'PopoverContent'.
            */}
            <PopoverPrimitive.Content
                align="start"
                className="z-[9999] w-[--radix-popover-trigger-width] min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            >
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={`Search ${label}...`}
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {isLoading && (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {!isLoading && items.length === 0 && (
                            <CommandEmpty>No results found.</CommandEmpty>
                        )}
                        <CommandGroup>
                            {items.map((item: any) => {
                                const itemValue = renderValue(item)
                                const itemLabel = renderLabel(item)
                                const isSelected = String(value) === String(itemValue)

                                return (
                                    <CommandItem
                                        key={itemValue}
                                        value={itemLabel}
                                        onSelect={() => {
                                            onChange(itemValue)
                                            setDisplayLabel(itemLabel)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {itemLabel}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverPrimitive.Content>
        </PopoverPrimitive.Root>
    )
}
