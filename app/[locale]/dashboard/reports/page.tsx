'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDashboardReports } from "@/hooks/useDashboard"
import { Download, LineChart, PieChart, TrendingUp } from "lucide-react"
import { useTranslations } from "next-intl"

type ReportItem = {
  label: string
  value: number
}

type MonthlyReport = {
  month: string
  label: string
  enrollments: number
  revenue: number
  expenses: number
}

type DashboardReports = {
  academic_year: {
    name: string
    start_date: string
    end_date: string
  }
  summary: {
    students: number
    teachers: number
    courses: number
    active_enrollments: number
    total_revenue: number
    total_expenses: number
    net_revenue: number
  }
  monthly: MonthlyReport[]
  revenue_by_subject: ReportItem[]
  expense_by_category: ReportItem[]
  age_distribution: ReportItem[]
  instrument_distribution: ReportItem[]
  course_popularity: ReportItem[]
  retention: ReportItem[]
  room_usage: ReportItem[]
}

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} MAD`
}

function maxValue(items: ReportItem[]) {
  return Math.max(...items.map((item) => Number(item.value || 0)), 1)
}

function BarList({
  items,
  valueFormatter = (value) => String(value),
  emptyLabel,
}: {
  items: ReportItem[]
  valueFormatter?: (value: number) => string
  emptyLabel: string
}) {
  if (!items.length) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  const max = maxValue(items)

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="shrink-0 text-muted-foreground">{valueFormatter(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function MonthlyTable({
  rows,
  emptyLabel,
  labels,
}: {
  rows: MonthlyReport[]
  emptyLabel: string
  labels: { month: string; enrollments: string; revenues: string; expenses: string }
}) {
  if (!rows.length) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">{labels.month}</th>
            <th className="py-2 pr-4 font-medium">{labels.enrollments}</th>
            <th className="py-2 pr-4 font-medium">{labels.revenues}</th>
            <th className="py-2 font-medium">{labels.expenses}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month} className="border-b last:border-0">
              <td className="py-2 pr-4">{row.label}</td>
              <td className="py-2 pr-4">{row.enrollments}</td>
              <td className="py-2 pr-4">{formatMoney(row.revenue)}</td>
              <td className="py-2">{formatMoney(row.expenses)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportsPage() {
  const t = useTranslations()
  const { reports, isLoading, isError } = useDashboardReports() as {
    reports?: DashboardReports
    isLoading: boolean
    isError: unknown
  }

  const noData = t('reports.noData')
  const monthlyLabels = {
    month: t('reports.month'),
    enrollments: t('reports.enrollments'),
    revenues: t('reports.revenues'),
    expenses: t('reports.expenses'),
  }

  const exportReports = () => {
    if (!reports) return
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reports-${reports.academic_year.name}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
          {reports?.academic_year && (
            <p className="text-sm text-muted-foreground">
              {t('reports.activeAcademicYear')}: {reports.academic_year.name}
            </p>
          )}
        </div>
        <Button onClick={exportReports} disabled={!reports}>
          <Download className="mr-2 h-4 w-4" />
          {t('reports.exportReports')}
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('common.loading')}</CardContent>
        </Card>
      )}

      {Boolean(isError) && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{t('reports.loadError')}</CardContent>
        </Card>
      )}

      {reports && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">{t('reports.overview')}</TabsTrigger>
            <TabsTrigger value="students">{t('reports.students')}</TabsTrigger>
            <TabsTrigger value="finances">{t('reports.finances')}</TabsTrigger>
            <TabsTrigger value="courses">{t('reports.courses')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('reports.activeStudents')}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{reports.summary.students}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('reports.activeEnrollments')}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{reports.summary.active_enrollments}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('reports.totalRevenue')}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{formatMoney(reports.summary.total_revenue)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('reports.netRevenue')}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{formatMoney(reports.summary.net_revenue)}</CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.enrollmentEvolution')}</CardTitle>
                  <CardDescription>{t('reports.enrollmentEvolutionDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <LineChart className="h-4 w-4" />
                    {t('reports.realBackendData')}
                  </div>
                  <MonthlyTable rows={reports.monthly} emptyLabel={noData} labels={monthlyLabels} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.revenueDistribution')}</CardTitle>
                  <CardDescription>{t('reports.revenueDistributionDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <PieChart className="h-4 w-4" />
                    {t('reports.realBackendData')}
                  </div>
                  <BarList items={reports.revenue_by_subject} valueFormatter={formatMoney} emptyLabel={noData} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.globalPerformance')}</CardTitle>
                <CardDescription>{t('reports.globalPerformanceDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  {t('reports.revenueVsExpenses')}
                </div>
                <MonthlyTable rows={reports.monthly} emptyLabel={noData} labels={monthlyLabels} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.ageDistribution')}</CardTitle>
                  <CardDescription>{t('reports.ageDistributionDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarList items={reports.age_distribution} emptyLabel={noData} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.instrumentDistribution')}</CardTitle>
                  <CardDescription>{t('reports.instrumentDistributionDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarList items={reports.instrument_distribution} emptyLabel={noData} />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.retentionRate')}</CardTitle>
                <CardDescription>{t('reports.retentionRateDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList items={reports.retention} emptyLabel={noData} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finances" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.revenueVsExpenses')}</CardTitle>
                  <CardDescription>{t('reports.revenueVsExpensesDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <MonthlyTable rows={reports.monthly} emptyLabel={noData} labels={monthlyLabels} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.expenseDistribution')}</CardTitle>
                  <CardDescription>{t('reports.expenseDistributionDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarList items={reports.expense_by_category} valueFormatter={formatMoney} emptyLabel={noData} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.coursePopularity')}</CardTitle>
                  <CardDescription>{t('reports.coursePopularityDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarList items={reports.course_popularity} emptyLabel={noData} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.occupancyRate')}</CardTitle>
                  <CardDescription>{t('reports.occupancyRateDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarList items={reports.room_usage} emptyLabel={noData} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
