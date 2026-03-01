

"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback } from "react"

export function usePageSearch(
  pageKey = "page",
  searchKey = "search",
) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get(pageKey)) || 1
  const search = searchParams.get(searchKey) ?? ""

  const setSearch = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (term) {
        params.set(searchKey, term)
      } else {
        params.delete(searchKey)
      }
      params.set(pageKey, "1") // reset to first page on new search
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams, pageKey, searchKey],
  )

  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(pageKey, String(newPage))
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams, pageKey],
  )

  return { page, search, setSearch, setPage }
}
