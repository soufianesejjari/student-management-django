"use client"

import { SubjectsManagement } from "@/components/academics/subjects-management"
import { useTranslations } from "next-intl"

export default function SubjectsPage() {
  const t = useTranslations()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('subjectsPage.title')}</h1>
      </div>
      <p className="text-sm text-muted-foreground">{t('subjectsPage.description')}</p>
      <SubjectsManagement />
    </div>
  )
}
