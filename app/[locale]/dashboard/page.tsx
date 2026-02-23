"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, BookOpen, Calendar, CreditCard, DollarSign, Music, Users } from "lucide-react"
import { useDashboardStats, useUpcomingClasses } from "@/hooks/useDashboard"
import { useTranslations } from "next-intl"

export default function DashboardPage() {
  const t = useTranslations()
  const { stats, isLoading: statsLoading } = useDashboardStats()
  const { classes: upcomingClasses, isLoading: classesLoading } = useUpcomingClasses()
  return (
    <div className="flex flex-col gap-4" suppressHydrationWarning>
      <div className="flex items-center justify-between" suppressHydrationWarning>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('dashboard.analytics')}</TabsTrigger>
          <TabsTrigger value="reports">{t('dashboard.reports')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" suppressHydrationWarning>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.activeStudents')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.active_students}</div>
                <p className="text-xs text-muted-foreground">+{stats?.new_students_this_month || 0} {t('dashboard.thisMonth')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.teachers')}</CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.active_teachers}</div>
                <p className="text-xs text-muted-foreground">{t('dashboard.active')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.activeCourses')}</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.active_courses}</div>
                <p className="text-xs text-muted-foreground">{t('dashboard.dispensed')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.monthlyRevenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? "..." : `${stats?.monthly_revenue || 0} €`}</div>
                <p className="text-xs text-muted-foreground">{t('finances.currentMonth')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.expenses')}</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? "..." : `${stats?.monthly_expenses || 0} €`}</div>
                <p className="text-xs text-muted-foreground">{t('finances.currentMonth')}</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7" suppressHydrationWarning>
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>{t('dashboard.revenueOverview')}</CardTitle>
                <CardDescription>{t('dashboard.monthlyRevenueDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[200px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground" suppressHydrationWarning>
                  {t('dashboard.chart.revenue')}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>{t('dashboard.upcomingClasses')}</CardTitle>
                <CardDescription>{t('dashboard.upcomingClassesDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" suppressHydrationWarning>
                  {classesLoading ? (
                    <div>{t('dashboard.loading')}</div>
                  ) : upcomingClasses?.length === 0 ? (
                    <div>{t('dashboard.noUpcomingClasses')}</div>
                  ) : (
                    upcomingClasses?.map((course: any) => (
                      <div key={course.id} className="flex items-center">
                        <div className="flex items-center justify-center rounded-md border p-2 mr-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {course.start.substring(0, 5)} - {course.course}
                          </p>
                          <p className="text-sm text-muted-foreground">{t('dashboard.teacher')}: {course.teacher}</p>
                          <p className="text-xs text-muted-foreground">{t('dashboard.room')}: {course.room}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2" suppressHydrationWarning>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>{t('reports.instrumentDistribution')}</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground" suppressHydrationWarning>
                  {t('reports.chart.instrument')}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>{t('reports.enrollmentEvolution')}</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground" suppressHydrationWarning>
                  {t('reports.chart.enrollment')}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.title')}</CardTitle>
              <CardDescription>{t('reports.enrollmentDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" suppressHydrationWarning>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('reports.title')}</CardTitle>
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">Avril 2025</div>
                    <div className="mt-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t('common.download')} PDF</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('reports.title')}</CardTitle>
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">T1 2025</div>
                    <div className="mt-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t('common.download')} PDF</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('reports.title')}</CardTitle>
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">2024</div>
                    <div className="mt-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t('common.download')} PDF</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
