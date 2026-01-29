"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SessionDialog } from "@/components/planning/session-dialog"
import { WeeklyCalendar } from "@/components/planning/weekly-calendar"
import { useTranslations } from "next-intl"

export default function SchedulePage() {
  const t = useTranslations()
  const [isAddOpen, setIsAddOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('schedule.title')}</h1>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('schedule.addSession')}
        </Button>
      </div>

      <SessionDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={() => {
          // We might need to trigger a refresh in WeeklyCalendar. 
          // For now, page reload or internal SWR revalidation will handle it eventually.
          // Ideally WeeklyCalendar should expose a refresh method or share context.
          window.location.reload()
        }}
      />

      <WeeklyCalendar />
    </div>
  )
}
