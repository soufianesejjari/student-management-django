"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, KeyRound, UserCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"

export default function AccountPage() {
  const t = useTranslations("account")
  const { user, logout } = useAuth()

  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
  })
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)

  // Password form
  const [pwd, setPwd] = useState({ current_password: "", new_password: "", confirm: "" })
  const [savingPwd, setSavingPwd] = useState(false)

  useEffect(() => {
    api.users.me()
      .then((data) => {
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          username: data.username || "",
          email: data.email || "",
        })
      })
      .catch(() => toast.error(t("saveError")))
      .finally(() => setLoading(false))
  }, [t])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const usernameChanged = profile.username !== user?.username
    try {
      await api.users.updateMe(profile)
      toast.success(t("saved"))
      if (usernameChanged) {
        toast.info(t("usernameChangedRelogin"))
        // JWT carries the old username — force a fresh login.
        setTimeout(() => logout(), 1500)
      }
    } catch (err: any) {
      const detail = err?.response?.data
      const msg = detail && typeof detail === "object"
        ? Object.values(detail).flat().join(" ")
        : t("saveError")
      toast.error(msg)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (pwd.new_password !== pwd.confirm) {
      toast.error(t("passwordMismatch"))
      return
    }
    if (pwd.new_password.length < 1) {
      toast.error(t("passwordTooShort"))
      return
    }
    setSavingPwd(true)
    try {
      await api.users.changePassword({
        current_password: pwd.current_password,
        new_password: pwd.new_password,
      })
      toast.success(t("passwordSaved"))
      setPwd({ current_password: "", new_password: "", confirm: "" })
    } catch (err: any) {
      const detail = err?.response?.data
      const msg = detail && typeof detail === "object"
        ? Object.values(detail).flat().join(" ")
        : t("passwordError")
      toast.error(msg)
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              <CardTitle>{t("profile")}</CardTitle>
            </div>
            <CardDescription>{t("profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">{t("firstName")}</Label>
                    <Input
                      id="first_name"
                      value={profile.first_name}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">{t("lastName")}</Label>
                    <Input
                      id="last_name"
                      value={profile.last_name}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">{t("username")}</Label>
                  <Input
                    id="username"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground">{t("role")}</Label>
                  <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="capitalize">
                    {user?.role === "admin" ? "Admin" : "Secrétaire"}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveProfile} disabled={savingProfile || loading}>
              {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          </CardFooter>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle>{t("security")}</CardTitle>
            </div>
            <CardDescription>{t("securityDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">{t("currentPassword")}</Label>
              <Input
                id="current_password"
                type="password"
                value={pwd.current_password}
                onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">{t("newPassword")}</Label>
              <Input
                id="new_password"
                type="password"
                value={pwd.new_password}
                onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">{t("confirmPassword")}</Label>
              <Input
                id="confirm_password"
                type="password"
                value={pwd.confirm}
                onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleChangePassword}
              disabled={savingPwd || !pwd.current_password || !pwd.new_password || !pwd.confirm}
            >
              {savingPwd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("updatePassword")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
