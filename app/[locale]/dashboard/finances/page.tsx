"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  PieChart,
  Pencil,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { usePayments, useExpenses, useFinancialReports } from "@/hooks/useFinances"
import { usePaymentStatus } from "@/hooks/usePaymentStatus"
import { usePageSearch } from "@/hooks/usePageSearch"
import { PageHeader } from "@/components/layout/page-header"
import { ExpenseDialog } from "@/components/finances/expense-dialog"
import { PaymentDialog } from "@/components/finances/payment-dialog"
import { UpdatePaymentStatusDialog } from "@/components/finances/update-payment-status-dialog"
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

import { Suspense, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { usePermissions } from "@/hooks/usePermissions"
import api from "@/lib/api"
import { toast } from "sonner"

function FinancesContent() {
  const t = useTranslations()
  const { hasPermission } = usePermissions()

  // Payments Params
  const { page: paymentsPage, search: paymentsSearch, setSearch: setPaymentsSearch, setPage: setPaymentsPage } = usePageSearch("payments_page", "payments_search")

  // Expenses Params
  const { page: expensesPage, search: expensesSearch, setSearch: setExpensesSearch, setPage: setExpensesPage } = usePageSearch("expenses_page", "expenses_search")

  const { payments, isLoading: paymentsLoading, next: paymentsNext, previous: paymentsPrevious, totalCount: paymentsTotal, mutate: mutatePayments } = usePayments(paymentsPage, paymentsSearch)
  const { expenses, isLoading: expensesLoading, next: expensesNext, previous: expensesPrevious, totalCount: expensesTotal, mutate: mutateExpenses } = useExpenses(expensesPage, expensesSearch)
  const { paymentStatus, isLoading: statusLoading, mutate: mutateStatus } = usePaymentStatus()
  const currentMonthDate = new Date()
  const { reports: financialReports } = useFinancialReports(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1)
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null)

  const mutate = () => {
    mutatePayments()
    mutateExpenses()
    mutateStatus()
  }

  const handleDeleteExpense = async (id: number) => {
    try {
      setDeletingExpenseId(id)
      await api.delete(`/finances/expenses/${id}/`)
      toast.success(t('finances.expenseDeleted'))
      mutateExpenses()
    } catch (error) {
      console.error(error)
      toast.error(t('finances.expenseDeleteFailed'))
    } finally {
      setDeletingExpenseId(null)
    }
  }

  const totalIncome = Number(financialReports?.total_income || 0)
  const totalExpenses = Number(financialReports?.total_expenses || 0)
  const netProfit = totalIncome - totalExpenses

  const pendingPaymentsCount = Number(financialReports?.pending_payments_count || 0)
  const pendingAmount = Number(financialReports?.pending_payments_amount || 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('finances.title')}
        action={
          <div className="flex gap-2">
            {hasPermission("finances.add_payment") && <PaymentDialog onSuccess={() => { mutate() }} />}
            {hasPermission("finances.add_expense") && <ExpenseDialog onSuccess={() => { mutate() }} />}
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finances.monthlyIncome')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncome} MAD</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="text-muted-foreground">{t('finances.currentMonth')}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finances.monthlyExpenses')}</CardTitle>
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses} MAD</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="text-muted-foreground">{t('finances.currentMonth')}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finances.netProfit')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{netProfit} MAD</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className={netProfit >= 0 ? "text-green-500" : "text-red-500"}>{netProfit >= 0 ? "+" : ""}{netProfit} MAD</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finances.pendingPayments')}</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAmount} MAD</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>{pendingPaymentsCount} {t('finances.pendingPaymentsCount')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">{t('finances.paymentsReceived')}</TabsTrigger>
          <TabsTrigger value="status">{t('finances.paymentStatus')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('finances.expenses')}</TabsTrigger>
        </TabsList>
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('finances.studentPayments')}</CardTitle>
              <CardDescription>{t('finances.paymentsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 w-full max-w-sm">
                  <Input
                    placeholder={t('finances.searchPayments')}
                    className="h-9"
                    defaultValue={paymentsSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentsSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('finances.student')}</TableHead>
                      <TableHead>{t('finances.amount')}</TableHead>
                      <TableHead>{t('finances.date')}</TableHead>
                      <TableHead>{t('finances.method')}</TableHead>
                      <TableHead>{t('finances.status')}</TableHead>
                      <TableHead className="w-[60px]">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">{t('common.loading')}</TableCell>
                      </TableRow>
                    ) : payments?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">{t('finances.noPayments')}</TableCell>
                      </TableRow>
                    ) : (
                      payments?.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.student_name
                              || payment.subscription_details?.student_name
                              || payment.student_username
                              || `#${payment.student}`}
                          </TableCell>
                          <TableCell>{payment.amount} MAD</TableCell>
                          <TableCell>{new Date(payment.date).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${payment.status === "PAID"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : payment.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                }`}
                            >
                              {payment.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <UpdatePaymentStatusDialog 
                              paymentId={payment.id}
                              currentStatus={payment.status}
                              onSuccess={mutate}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  {paymentsTotal > 0 ? t('common.page', { current: paymentsPage, total: Math.ceil(paymentsTotal / 10) }) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentsPage(paymentsPage - 1)}
                  disabled={!paymentsPrevious || paymentsLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentsPage(paymentsPage + 1)}
                  disabled={!paymentsNext || paymentsLoading}
                >
                  {t('common.next')}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('finances.paymentStatusTitle')}</CardTitle>
              <CardDescription>{t('finances.paymentStatusDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('finances.student')}</TableHead>
                      <TableHead>{t('finances.totalDue')}</TableHead>
                      <TableHead>{t('finances.paid')}</TableHead>
                      <TableHead>{t('finances.balance')}</TableHead>
                      <TableHead>{t('finances.lastPayment')}</TableHead>
                      <TableHead>{t('finances.status')}</TableHead>
                      <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">{t('common.loading')}</TableCell>
                      </TableRow>
                    ) : paymentStatus.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">{t('students.noStudents')}</TableCell>
                      </TableRow>
                    ) : (
                      paymentStatus.map((status: any) => (
                        <TableRow key={status.student_id}>
                          <TableCell className="font-medium">{status.student_name}</TableCell>
                          <TableCell>{status.total_due.toFixed(2)} MAD</TableCell>
                          <TableCell>{status.total_paid.toFixed(2)} MAD</TableCell>
                          <TableCell className={status.balance > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-green-600 dark:text-green-400'}>
                            {status.balance.toFixed(2)} MAD
                          </TableCell>
                          <TableCell>
                            {status.last_payment_date 
                              ? new Date(status.last_payment_date).toLocaleDateString()
                              : t('finances.never')}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                status.status === "PAID"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : status.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              }`}
                            >
                              {status.status}
                              {status.days_overdue !== null && status.days_overdue > 0 && (
                                <span className="ml-1">({status.days_overdue}{t('finances.daysOverdue')})</span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            {status.balance > 0 && hasPermission("finances.add_payment") && (
                              <PaymentDialog 
                                studentId={status.student_id}
                                onSuccess={mutate}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('finances.expenses')}</CardTitle>
              <CardDescription>{t('finances.expensesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 w-full max-w-sm">
                  <Input
                    placeholder={t('finances.searchExpenses')}
                    className="h-9"
                    defaultValue={expensesSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpensesSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('finances.description')}</TableHead>
                      <TableHead>{t('finances.amount')}</TableHead>
                      <TableHead>{t('finances.date')}</TableHead>
                      <TableHead>{t('finances.category')}</TableHead>
                      <TableHead>{t('finances.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">{t('common.loading')}</TableCell>
                      </TableRow>
                    ) : expenses?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">{t('finances.noExpenses')}</TableCell>
                      </TableRow>
                    ) : (
                      expenses?.map((expense: any) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>{expense.amount} MAD</TableCell>
                          <TableCell>{expense.date}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${expense.status === "PAID"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                }`}
                            >
                              {expense.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <ExpenseDialog
                                expense={expense}
                                onSuccess={() => mutateExpenses()}
                                trigger={
                                  <Button variant="ghost" size="icon" aria-label="Edit expense">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="Delete expense">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('finances.deleteExpenseTitle')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('finances.deleteExpenseDescription')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteExpense(expense.id)}
                                      disabled={deletingExpenseId === expense.id}
                                    >
                                      {deletingExpenseId === expense.id ? t('finances.deleting') : t('common.delete')}
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
              <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  {expensesTotal > 0 ? t('common.page', { current: expensesPage, total: Math.ceil(expensesTotal / 10) }) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpensesPage(expensesPage - 1)}
                  disabled={!expensesPrevious || expensesLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpensesPage(expensesPage + 1)}
                  disabled={!expensesNext || expensesLoading}
                >
                  {t('common.next')}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function FinancesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <FinancesContent />
    </Suspense>
  )
}
