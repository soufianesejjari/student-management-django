"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  BarChart3, BookOpen, Calendar, CreditCard, Home, LogOut,
  Settings, Users, UserCog, DoorOpen, Menu, Music, ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModeToggle } from "@/components/mode-toggle"
import { useMobile } from "@/hooks/use-mobile"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"
import { usePermissions } from "@/hooks/usePermissions"
import { ErrorBoundary } from "@/components/layout/error-boundary"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useMobile()
  const { user, logout, loading, isAdmin } = useAuth()
  const { canAccessModule } = usePermissions()

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  // All navigation items — each can declare a required module key
  const allNavigation = [
    { name: t('navigation.dashboard'), href: "/dashboard",          icon: Home,       module: null },
    { name: t('navigation.students'),  href: "/dashboard/students", icon: Users,      module: "students" },
    { name: t('navigation.teachers'),  href: "/dashboard/teachers", icon: UserCog,    module: "teachers" },
    { name: t('navigation.courses'),   href: "/dashboard/courses",  icon: BookOpen,   module: "courses" },
    { name: t('navigation.subjects'),  href: "/dashboard/subjects", icon: Music,      module: "subjects" },
    { name: t('navigation.rooms'),     href: "/dashboard/rooms",    icon: DoorOpen,   module: "rooms" },
    { name: t('navigation.schedule'),  href: "/dashboard/schedule", icon: Calendar,   module: "schedule" },
    { name: t('navigation.finances'),  href: "/dashboard/finances", icon: CreditCard, module: "finances" },
    { name: t('navigation.reports'),   href: "/dashboard/reports",  icon: BarChart3,  module: "reports" },
    { name: "Rôles & Permissions",     href: "/dashboard/users",    icon: ShieldCheck, module: "users" },
    { name: t('navigation.settings'),  href: "/dashboard/settings", icon: Settings,   module: "settings" },
  ]

  const navigation = allNavigation.filter(
    (item) => item.module === null || canAccessModule(item.module),
  )

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() ?? "?"

  // Show a full-screen loader while auth state resolves
  if (loading || !user) {
    return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <img src="/logo.png" alt="The Musical Academy" className="h-16 w-auto object-contain animate-pulse" />
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    </div>
    )
  }

  const LogoutButton = ({ className }: { className?: string }) => (
    <Button
      variant="outline"
      size="sm"
      className={cn("justify-start gap-2", className)}
      onClick={logout}
    >
      <LogOut className="h-4 w-4" />
      {t('navigation.logout')}
    </Button>
  )

  const NavItems = ({ onNavClick }: { onNavClick?: () => void }) => (
    <>
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavClick}
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
    <div className="flex min-h-screen flex-col" suppressHydrationWarning>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-2 font-semibold" suppressHydrationWarning>
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t('navigation.toggleMenu')}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <div className="flex items-center gap-3 font-semibold mb-4">
                  <img src="/logo.png" alt="The Musical Academy" className="h-10 w-auto object-contain" />
                  <span className="text-lg">The Musical Academy</span>
                </div>
                {/* User info in mobile drawer */}
                {user && (
                  <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name || user.username}</p>
                      <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs capitalize">
                        {user.role === "secretaire" ? "Secrétaire" : "Admin"}
                      </Badge>
                    </div>
                  </div>
                )}
                <nav className="grid gap-1 text-sm flex-1">
                  <NavItems />
                </nav>
                {/* ✅ Mobile logout — was MISSING before */}
                <div className="pt-4 border-t mt-4">
                  <LogoutButton className="w-full" />
                </div>
              </SheetContent>
            </Sheet>
          )}
          <img src="/logo.png" alt="The Musical Academy" className="h-10 w-auto object-contain" />
          <span className="hidden md:inline-block text-lg font-semibold">The Musical Academy</span>
        </div>
        <div className="flex-1" suppressHydrationWarning />
        <ModeToggle />
        {user && (
          <div className="hidden md:flex items-center gap-2">
            <Badge variant={isAdmin ? "default" : "secondary"} className="capitalize">
              {user.role === "secretaire" ? "Secrétaire" : "Admin"}
            </Badge>
            <span className="text-sm font-medium">{user.full_name || user.username}</span>
          </div>
        )}
        <Avatar>
          <AvatarImage src="/placeholder.svg" alt={initials} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </header>
      <div className="flex flex-1" suppressHydrationWarning>
        <aside className="hidden w-64 shrink-0 border-r md:block">
          <div className="flex h-full max-h-screen flex-col gap-2 p-4" suppressHydrationWarning>
            <nav className="grid gap-1 text-sm flex-1">
              <NavItems />
            </nav>
            <div className="mt-auto" suppressHydrationWarning>
              <LogoutButton className="w-full" />
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
