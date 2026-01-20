"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import useSWR from "swr"
import api from "@/lib/api"
import { useDebounce } from "@/hooks/useDebounce"

interface AsyncSelectProps {
    endpoint: string
    label: string
    value?: string | number
    onChange: (value: string | number) => void
    renderLabel: (item: any) => string
    renderValue: (item: any) => string | number
    searchParam?: string
    placeholder?: string
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
}: AsyncSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const debouncedQuery = useDebounce(query, 300)

    const { data: searchResults, isLoading } = useSWR(
        open ? `${endpoint}?${searchParam}=${debouncedQuery}` : null,
        fetcher
    )

    // Determine displayed label for selected value
    // We might not have the item in searchResults if it was selected previously or pre-filled.
    // For simplicity, we assume we might need to fetch it separately or pass it in.
    // BUT for now, let's rely on the label passed in if possible, OR just show ID if not found in list.
    // Better UX: Allow passing `selectedLabel` prop, or fetch single item if value exists but not in list.

    // Quick fix: user just sees the ID if not in list, or we assume the parent handles the display if needed.
    // Actually, Shadcn Combobox usually wants to display the label.
    const selectedItem = searchResults?.results?.find((item: any) => renderValue(item) === value)

    const [displayLabel, setDisplayLabel] = React.useState<string>("")

    React.useEffect(() => {
        if (selectedItem) {
            setDisplayLabel(renderLabel(selectedItem))
        }
    }, [selectedItem, renderLabel])

    // If we have a value but no display label (e.g. initial load), we might want to fetch it.
    // TODO: Add single item fetch logic if needed.

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value
                        ? (displayLabel || value) // Fallback to value if label not found yet
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command shouldFilter={false}>
                    {/* We handle filtering via backend */}
                    <CommandInput
                        placeholder={`Search ${label}...`}
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {isLoading && <CommandEmpty>Loading...</CommandEmpty>}
                        {!isLoading && searchResults?.results?.length === 0 && (
                            <CommandEmpty>No results found.</CommandEmpty>
                        )}
                        <CommandGroup>
                            {searchResults?.results?.map((item: any) => (
                                <CommandItem
                                    key={renderValue(item)}
                                    value={String(renderValue(item))}
                                    onSelect={(currentValue) => {
                                        onChange(item.id) // Assuming ID is always what we want to save
                                        setDisplayLabel(renderLabel(item))
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === renderValue(item) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {renderLabel(item)}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
