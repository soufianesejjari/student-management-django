"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/lib/api"
import { KeyRound, UserPlus, Trash2, User2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/layout/page-header"

interface Admin {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  role: "admin"
}

export default function AdminsPage() {
  const t = useTranslations("admins")
  const { isAdmin, user } = useAuth()

  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null)

  const [form, setForm] = useState({
    first_name: "", last_name: "", username: "", email: "", password: "",
  })

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.admins.list()
      setAdmins(Array.isArray(data) ? data : data.results ?? [])
    } catch {
      toast.error(t("createError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchAdmins() }, [fetchAdmins])

  const handleCreate = async () => {
    setSaving(true)
    try {
      await api.admins.create(form)
      toast.success(t("created"))
      setCreating(false)
      setForm({ first_name: "", last_name: "", username: "", email: "", password: "" })
      fetchAdmins()
    } catch (err: any) {
      const detail = err?.response?.data
      const msg = detail && typeof detail === "object"
        ? Object.values(detail).flat().join(" ")
        : t("createError")
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.admins.delete(deleteTarget.id)
      toast.success(t("deleted"))
      setDeleteTarget(null)
      fetchAdmins()
    } catch {
      toast.error(t("deleteError"))
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("adminOnly")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {t("title")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("newAdmin")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <CardDescription>
            {admins.length} {admins.length !== 1 ? t("accounts") : t("account")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAdmin")}</p>
          ) : (
            admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate flex items-center gap-2">
                      {admin.first_name} {admin.last_name}
                      {user?.user_id === admin.id && (
                        <Badge variant="outline" className="text-xs">{t("you")}</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{admin.username} · {admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <Badge variant={admin.is_active ? "default" : "secondary"} className="text-xs">
                    {admin.is_active ? t("active") : t("inactive")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive disabled:opacity-30"
                    disabled={user?.user_id === admin.id}
                    onClick={() => setDeleteTarget(admin)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newAdmin")}</DialogTitle>
            <DialogDescription>{t("createDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("firstName")}</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("lastName")}</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("username")}</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("email")}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("password")}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>{t("cancel")}</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.username || !form.email || !form.password}
            >
              {saving ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDesc", { name: `${deleteTarget?.first_name} ${deleteTarget?.last_name}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t("deleteBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
