"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, BookOpen, Calendar, CreditCard, Home, LogOut, Music2, Settings, Users, UserCog, DoorOpen, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModeToggle } from "@/components/mode-toggle"
import { useMobile } from "@/hooks/use-mobile"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isMobile = useMobile()

  const navigation = [
    { name: "Tableau de bord", href: "/dashboard", icon: Home },
    { name: "Étudiants", href: "/dashboard/students", icon: Users },
    { name: "Professeurs", href: "/dashboard/teachers", icon: UserCog },
    { name: "Cours", href: "/dashboard/courses", icon: BookOpen },
    { name: "Salles", href: "/dashboard/rooms", icon: DoorOpen },
    { name: "Planning", href: "/dashboard/schedule", icon: Calendar },
    { name: "Finances", href: "/dashboard/finances", icon: CreditCard },
    { name: "Rapports", href: "/dashboard/reports", icon: BarChart3 },
    { name: "Paramètres", href: "/dashboard/settings", icon: Settings },
  ]

  const NavItems = () => (
    <>
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
              isActive ? "bg-muted font-medium text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-2 font-semibold">
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <div className="flex items-center gap-2 font-semibold mb-8">
                  <Music2 className="h-6 w-6" />
                  <span>The Musical Academy</span>
                </div>
                <nav className="grid gap-2 text-lg font-medium">
                  <NavItems />
                </nav>
              </SheetContent>
            </Sheet>
          )}
          <Music2 className="h-6 w-6" />
          <span className="hidden md:inline-block">The Musical Academy</span>
        </div>
        <div className="flex-1" />
        <ModeToggle />
        <Avatar>
          <AvatarImage src="/placeholder.svg" alt="Admin" />
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r md:block">
          <div className="flex h-full max-h-screen flex-col gap-2 p-4">
            <nav className="grid gap-2 text-sm">
              <NavItems />
            </nav>
            <div className="mt-auto">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
