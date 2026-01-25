import useSWR from "swr"
import { api } from "@/lib/api"

interface PaymentStatusItem {
  student_id: number
  student_name: string
  status: "PAID" | "PENDING" | "OVERDUE"
  total_due: number
  total_paid: number
  balance: number
  last_payment_date: string | null
  days_overdue: number | null
}

export function usePaymentStatus() {
  const { data, error, isLoading, mutate } = useSWR<PaymentStatusItem[] | any>(
    "/finances/payment-status/",
    async (url) => {
      const res = await api.get(url)
      return res.data
    }
  )

  // Handle both array and paginated responses
  const paymentStatus = Array.isArray(data) ? data : data?.results || []

  return {
    paymentStatus,
    isLoading,
    isError: error,
    mutate,
  }
}
