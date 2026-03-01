"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
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
import { ShieldCheck, UserPlus, Trash2, Settings2, User2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PermissionItem {
  id: number
  name: string
  codename: string
  full_codename: string
  app_label: string
  model: string
}

interface Secretaire {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  role: "secretaire"
  permissions: PermissionItem[]
}

type AvailablePermissions = Record<string, PermissionItem[]>

// ---------------------------------------------------------------------------
// Human-readable labels for app modules
// ---------------------------------------------------------------------------

const APP_LABELS: Record<string, string> = {
  users:       "Utilisateurs (Étudiants / Professeurs)",
  academics:   "Académique (Cours / Sujets)",
  planning:    "Planning (Séances / Salles)",
  finances:    "Finances (Paiements / Dépenses)",
  enrollments: "Inscriptions",
  dashboard:   "Tableau de bord",
}

const ACTION_LABELS: Record<string, string> = {
  view:   "Voir",
  add:    "Ajouter",
  change: "Modifier",
  delete: "Supprimer",
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function UsersManagementPage() {
  const { isAdmin } = useAuth()

  const [secretaires, setSecretaires] = useState<Secretaire[]>([])
  const [availablePerms, setAvailablePerms] = useState<AvailablePermissions>({})
  const [selectedSecretaire, setSelectedSecretaire] = useState<Secretaire | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Secretaire | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Create form state
  const [form, setForm] = useState({
    first_name: "", last_name: "", username: "", email: "", password: "",
  })

  // Fetch secretaires and available permissions
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [secs, perms] = await Promise.all([
        api.secretaires.list(),
        api.permissions.available(),
      ])
      setSecretaires(Array.isArray(secs) ? secs : secs.results ?? [])
      setAvailablePerms(perms)
    } catch {
      toast.error("Erreur lors du chargement des données")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Re-fetch selected secretaire permissions after any update
  const refreshSelected = useCallback(
    async (id: number) => {
      const updated = await api.secretaires.get(id)
      setSecretaires((prev) => prev.map((s) => (s.id === id ? updated : s)))
      setSelectedSecretaire(updated)
    },
    [],
  )

  // -----------------------------------------------------------------------
  // Permission toggle
  // -----------------------------------------------------------------------

  const togglePermission = async (permId: number, currently: boolean) => {
    if (!selectedSecretaire) return
    setSaving(true)
    try {
      if (currently) {
        await api.secretaires.revokePermissions(selectedSecretaire.id, [permId])
      } else {
        await api.secretaires.assignPermissions(selectedSecretaire.id, [permId])
      }
      await refreshSelected(selectedSecretaire.id)
      toast.success("Permission mise à jour")
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Create secretaire
  // -----------------------------------------------------------------------

  const handleCreate = async () => {
    setSaving(true)
    try {
      await api.secretaires.create(form)
      toast.success("Secrétaire créé avec succès")
      setCreating(false)
      setForm({ first_name: "", last_name: "", username: "", email: "", password: "" })
      fetchAll()
    } catch {
      toast.error("Erreur lors de la création")
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Delete secretaire
  // -----------------------------------------------------------------------

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.secretaires.delete(deleteTarget.id)
      toast.success("Secrétaire supprimé")
      if (selectedSecretaire?.id === deleteTarget.id) setSelectedSecretaire(null)
      setDeleteTarget(null)
      fetchAll()
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const getActivePermIds = (sec: Secretaire) => new Set(sec.permissions.map((p) => p.id))

  const getActionFromCodename = (codename: string) => {
    for (const action of ["view", "add", "change", "delete"]) {
      if (codename.startsWith(action + "_")) return action
    }
    return codename
  }

  // -----------------------------------------------------------------------
  // Guard: admin only
  // -----------------------------------------------------------------------

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Gestion des rôles & permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les comptes secrétaires et leurs accès aux différents modules.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nouveau secrétaire
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Secretaire list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Secrétaires</CardTitle>
            <CardDescription>
              {secretaires.length} compte{secretaires.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : secretaires.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun secrétaire.</p>
            ) : (
              secretaires.map((sec) => (
                <div
                  key={sec.id}
                  className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedSecretaire?.id === sec.id
                      ? "bg-muted border-primary"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedSecretaire(sec)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {sec.first_name} {sec.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">@{sec.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Badge variant={sec.is_active ? "default" : "secondary"} className="text-xs">
                      {sec.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(sec) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right — Permission panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              {selectedSecretaire
                ? `Permissions de ${selectedSecretaire.first_name} ${selectedSecretaire.last_name}`
                : "Permissions"}
            </CardTitle>
            <CardDescription>
              {selectedSecretaire
                ? "Activez ou désactivez l'accès à chaque fonctionnalité."
                : "Sélectionnez un secrétaire pour gérer ses permissions."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedSecretaire ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Sélectionnez un secrétaire dans la liste.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(availablePerms).map(([appLabel, perms]) => {
                  const activeIds = getActivePermIds(selectedSecretaire)
                  return (
                    <div key={appLabel}>
                      <h3 className="font-semibold text-sm mb-3">
                        {APP_LABELS[appLabel] ?? appLabel}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {perms.map((perm) => {
                          const isActive = activeIds.has(perm.id)
                          const action = getActionFromCodename(perm.codename)
                          return (
                            <div
                              key={perm.id}
                              className={`flex items-center justify-between rounded-md border p-2.5 transition-colors ${
                                isActive ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isActive ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {ACTION_LABELS[action] ?? action}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {perm.model}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={isActive}
                                disabled={saving}
                                onCheckedChange={() => togglePermission(perm.id, isActive)}
                              />
                            </div>
                          )
                        })}
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau secrétaire</DialogTitle>
            <DialogDescription>
              Créez un compte secrétaire. Le mot de passe par défaut est <code>password123</code> si laissé vide.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prénom</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nom d'utilisateur</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Laisser vide pour password123"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.username || !form.email}
            >
              {saving ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le secrétaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez supprimer le compte de{" "}
              <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
