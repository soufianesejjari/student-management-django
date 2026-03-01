import React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  /** Main page title (h1) */
  title: string
  /** Optional subtitle/description below the title */
  description?: string
  /** Right-side actions (buttons, selectors…) */
  action?: React.ReactNode
  /** Optional CSS class override */
  className?: string
}

/**
 * Shared page header used across all dashboard pages.
 * Replaces the repeated <div className="flex items-center justify-between"> pattern.
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-1 min-w-0">
        <h1 className="text-3xl font-bold tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  )
}
