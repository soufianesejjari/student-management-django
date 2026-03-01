import React from "react"
import type { Metadata } from "next"
import { getMessages } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"

export const metadata: Metadata = {
  title: "The Musical Academy",
  description: "Application de gestion d'école de musique",
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={params.locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
