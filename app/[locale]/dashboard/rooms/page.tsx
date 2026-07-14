"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react"
import { useRooms } from "@/hooks/useRooms"
import { RoomDialog } from "@/components/rooms/room-dialog"
import { useState } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { useTranslations } from "next-intl"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function RoomsPage() {
  const t = useTranslations()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const { rooms, isLoading, next, previous, totalCount, mutate } = useRooms(page, search)

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/planning/rooms/${id}/`)
      toast.success(t('rooms.deleteSuccess'))
      mutate()
    } catch (error) {
      console.error(error)
      toast.error(t('rooms.deleteError'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('rooms.title')}</h1>
          <p className="text-muted-foreground">{t('rooms.description')}</p>
        </div>
        <RoomDialog onSuccess={mutate} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('rooms.allRooms')}</CardTitle>
          <CardDescription>{t('rooms.viewDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('rooms.search')}
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('rooms.name')}</TableHead>
                  <TableHead>{t('rooms.capacity')}</TableHead>
                  <TableHead>{t('rooms.resources')}</TableHead>
                  <TableHead>{t('rooms.status')}</TableHead>
                  <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      {t('common.loading')}
                    </TableCell>
                  </TableRow>
                ) : rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      {t('rooms.noRooms')}
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room: any) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell>{room.capacity} {t('rooms.people')}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {room.resources || <span className="text-muted-foreground">{t('common.none')}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={room.is_active ? "default" : "secondary"}>
                          {room.is_active ? t('rooms.active') : t('rooms.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <RoomDialog room={room} onSuccess={mutate} />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('rooms.deleteConfirmTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('rooms.deleteConfirmDescription', { name: room.name })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(room.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalCount > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                {t('common.page', { current: page, total: Math.ceil(totalCount / 50) })} ({totalCount} {t('common.total')})
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={!previous || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('common.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={!next || isLoading}
              >
                {t('common.next')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
